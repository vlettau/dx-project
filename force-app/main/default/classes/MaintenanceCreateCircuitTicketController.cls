/**
 * @description       : 
 * @author            : tfe
 * @group             : 
 * @last modified on  : 01-10-2025
 * @last modified by  : Sean Armstrong
**/
public with sharing class MaintenanceCreateCircuitTicketController {
    private static final String ACTIVATED_STATUS = 'Activated';
	private static final String MAINTENANCE_TYPE = 'Maintenance';
    private static final String NOT_ACTIVATED = 'The circuit id does not have an "Activated" status.';
    private static final String NOT_FOUND = 'The circuit id was not found as a Service Id, Order Number, or Site Name.';
	private static final String OUTAGE_TYPE = 'NOC Support Tickets';
	private static final Id CLIENT_COMMUNICATION_RECORD_TYPE_ID = Schema.SObjectType.Case.getRecordTypeInfosByName().get('Client Communication').getRecordTypeId();
	
	@AuraEnabled
    public static Case getParentCaseRecord(Id recordId){
        try {
            List<Case> parentCases = [
                SELECT Id, CaseNumber, Customer_List__c, Successfully_Found_Circuit_Ids__c, Non_Service_Affecting_Cust_List__c, Failed_to_Find_Circuit_Ids__c, RecordType.Name
                FROM Case 
                WHERE Id = :recordId
            ];
            return parentCases[0];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable = true)
    public static List<ChildCaseWrapper> getCurrentChildCases(String parentId){
        try {
            List<Case> existingChildCases = 
            [
                SELECT Id, CaseNumber, Maintenance_Email_Sent__c, ParentId, Related_Service_Order__c, Service_Affecting__c, Status, Account.Name
                FROM Case 
                WHERE ParentId = :parentId AND RecordTypeId = :CLIENT_COMMUNICATION_RECORD_TYPE_ID
                ORDER BY CreatedDate DESC
            ];
            List<ChildCaseWrapper> wrapperResultsToReturn = new List<ChildCaseWrapper>();
            for (Case c : existingChildCases) {
                ChildCaseWrapper wrapRecord = new ChildCaseWrapper();
                wrapRecord.caseId = c.Id;
                wrapRecord.caseUrl = '/'+c.Id;
                wrapRecord.caseNumber = (String)c.CaseNumber;
                wrapRecord.parentId = c.ParentId;
                wrapRecord.serviceAffecting = c.Service_Affecting__c ? 'Yes' : 'No';
                wrapRecord.isServiceAffecting = c.Service_Affecting__c;
                wrapRecord.status = c.Status;
                wrapRecord.accountName = c.Account.Name;
				wrapRecord.emailSent = c.Maintenance_Email_Sent__c ? 'Yes' : 'No';
                wrapperResultsToReturn.add(wrapRecord);
            }
            return wrapperResultsToReturn;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable = true)
    public static List<OutputCircuitWrapper> findCircuitRecords(String maintenanceId, List<String> recordIdentifiers){
		try{
            List<Order> orderList = 
            [
                SELECT Id, AccountId, OrderNumber, Primary_Product_Family__c, Service_Id__c, Site_Name__c, Status, Account.Name
                FROM Order 
                WHERE (Service_Id__c IN :recordIdentifiers OR Site_Name__c IN :recordIdentifiers OR OrderNumber IN :recordIdentifiers)
                ORDER BY Billing_Start_Date__c DESC
            ];

			Set<String> identifiersNotActivated = new Set<String>();
            Map<String, Order> orderRecordsByCircuitIdMap = new Map<String, Order>();
            Map<String, Order> orderRecordsBySOFMap = new Map<String, Order>();
            Map<String, List<Order>> orderRecordsListBySiteIdMap = new Map<String, List<Order>>();
            for(Order o : orderList){
				if (o.Status != ACTIVATED_STATUS) {
					identifiersNotActivated.add(o.Service_Id__c.toLowerCase());
					identifiersNotActivated.add(o.OrderNumber.toLowerCase());
					if (o.Site_Name__c != null) {
						identifiersNotActivated.add(o.Site_Name__c.toLowerCase());
					}
				} else if (!orderRecordsByCircuitIdMap.containsKey(o.Service_Id__c.toLowerCase())) {
					orderRecordsByCircuitIdMap.put(o.Service_Id__c.toLowerCase(), o);
					orderRecordsBySOFMap.put(o.OrderNumber.toLowerCase(), o);
					if (o.Site_Name__c != null) {
						List<Order> listOfOrders = orderRecordsListBySiteIdMap.containsKey(o.Site_Name__c.toLowerCase()) ? orderRecordsListBySiteIdMap.get(o.Site_Name__c.toLowerCase()) : new List<Order>();
						listOfOrders.add(o);
						orderRecordsListBySiteIdMap.put(o.Site_Name__c.toLowerCase(), listOfOrders);
					}
                }
            }

            Map<String, OutputCircuitWrapper> circuitOutputWrapperMap = new Map<String, OutputCircuitWrapper>();
			for (String identifier : recordIdentifiers) {
				String identifierAsLower = identifier.toLowerCase();
				if (identifiersNotActivated.contains(identifierAsLower) && (!orderRecordsByCircuitIdMap.containsKey(identifierAsLower) && !orderRecordsBySOFMap.containsKey(identifierAsLower) && !orderRecordsListBySiteIdMap.containsKey(identifierAsLower))) {
					OutputCircuitWrapper wrap = new OutputCircuitWrapper(false, maintenanceId, identifier, NOT_ACTIVATED);
					circuitOutputWrapperMap.put(identifier, wrap);
				} else if (orderRecordsByCircuitIdMap.containsKey(identifierAsLower) || orderRecordsBySOFMap.containsKey(identifierAsLower)) {
					Order o = orderRecordsByCircuitIdMap.containsKey(identifierAsLower) ? orderRecordsByCircuitIdMap.get(identifierAsLower) : orderRecordsBySOFMap.get(identifierAsLower);
					OutputCircuitWrapper wrap = new OutputCircuitWrapper(true, maintenanceId, o);
					circuitOutputWrapperMap.put(wrap.circuitId, wrap);
				} else if (orderRecordsListBySiteIdMap.containsKey(identifierAsLower)) {
					for (Order o : orderRecordsListBySiteIdMap.get(identifierAsLower)) {
						OutputCircuitWrapper wrap = new OutputCircuitWrapper(true, maintenanceId, o);
						circuitOutputWrapperMap.put(wrap.circuitId, wrap);
					}
				} else {
					OutputCircuitWrapper wrap = new OutputCircuitWrapper(false, maintenanceId, identifier, NOT_FOUND);
					circuitOutputWrapperMap.put(identifier, wrap);
				}
			}

            return circuitOutputWrapperMap.values();
        } catch(Exception e){
            System.debug(e.getMessage());
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
        
    }

    @AuraEnabled
    public static ChildCaseCreationWrapper createChildCases(String parentId, String records, String parentRecordType){
        try {
            List<InputCircuitWrapper> parsedRecords = (List<InputCircuitWrapper>)JSON.deserialize(records, List<InputCircuitWrapper>.class);

			//First confirm that we don't have any conflicts that need to be sent back to the user to be addressed.
			Case parentCase = getParentCaseRecord((Id)parentId);
			ChildCaseCreationWrapper wrapper = new ChildCaseCreationWrapper();
			wrapper = doesCircuitIdExistInOppositeServiceList(wrapper, parsedRecords, parentCase);
			if (wrapper.overlapExists) {
				wrapper.success = false;
				wrapper.message = 'There is a conflict between service and non-service lists for the following circuit ids: ' + String.join(wrapper.overlappingCircuitIds, ',') + '. They have been copied to the clipboard for your convenience.';
				return wrapper;
			}
			
			List<Case> casesToUpsert = new List<Case>();
			Map<Id, Order> serviceOrderData = getServiceOrderDataForChildCases(parsedRecords);
			//Key is AccountId::Service Affecting (true or false)::ParentCaseType (Maintenance or NOC Support Tickets)
			Map<String, List<InputCircuitWrapper>> inputWrappersByAccountIdImpactMap = createMapOfInputWrappersByAccountId(parsedRecords, parentRecordType);
			//Key is AccountId::Service Affecting (true or false)::ParentCaseType (Maintenance or NOC Support Tickets)
			Map<String, Case> casesByAccountIdImpactMap = getExistingChildCasesWithSameAccountId(inputWrappersByAccountIdImpactMap.keySet(), parentId);

			for (String key : inputWrappersByAccountIdImpactMap.keySet()) {
				List<InputCircuitWrapper> inputWrappers = inputWrappersByAccountIdImpactMap.get(key);
				String constructedDescription;
				if (parentRecordType == MAINTENANCE_TYPE) {
					constructedDescription = buildDescriptionForCase(inputWrappers, serviceOrderData);
				} else if (parentRecordType == OUTAGE_TYPE) {
					constructedDescription = buildDescriptionForOutageCommunicationCase(inputWrappers);
				}
				if (casesByAccountIdImpactMap.containsKey(key)) {
					String descriptionToUse;
					if (parentRecordType == MAINTENANCE_TYPE) {
						String currentDescription = casesByAccountIdImpactMap.get(key).Description;
						if (String.isNotBlank(currentDescription)) {
							String appendedConstructedDescription = constructedDescription.removeStartIgnoreCase('Circuit ID(s):');
							String newDescription = currentDescription + '\n';
							newDescription += appendedConstructedDescription;
							descriptionToUse = newDescription;
						} else {
							descriptionToUse = currentDescription;
						}
					} else if (parentRecordType == OUTAGE_TYPE) {
						String currentDescription = casesByAccountIdImpactMap.get(key).Description;
						if (String.isNotBlank(currentDescription)) {
							String newDescription = currentDescription + '\n';
							newDescription += constructedDescription;
							descriptionToUse = newDescription;
						} else {
							descriptionToUse = currentDescription;
						}
					}

					Case childCase = new Case(
						Id = casesByAccountIdImpactMap.get(key).Id,
						Description = descriptionToUse,
						Parent_Case_Number__c = parentCase.CaseNumber,
						Service_Affecting__c = inputWrappers[0].serviceAffecting
					);
					casesToUpsert.add(childCase);
				} else {
					String notificationType = parentRecordType == MAINTENANCE_TYPE ? 'Maintenance' : 'Outage';

					Case childCase = new Case(
						AccountId = key.split('::')[0],
						Description = constructedDescription,
						NotificationType__c = notificationType,
						ParentId = parentId,
						Parent_Case_Number__c = parentCase.CaseNumber,
						RecordTypeId = CLIENT_COMMUNICATION_RECORD_TYPE_ID,
						Service_Affecting__c = inputWrappers[0].serviceAffecting,
						Subject = notificationType + ' Notification ' + parentCase.CaseNumber
					);
					if (parentRecordType == OUTAGE_TYPE) {
						childCase.Maintenance_Start__c = Datetime.now();
					}
					casesToUpsert.add(childCase);
				}
			}
            if (casesToUpsert.size() > 0) {
                List<Database.UpsertResult> saveResults = Database.upsert(casesToUpsert);
				wrapper.success = true;
				String errorMessage = '';
				for (Database.UpsertResult sr : saveResults) {
					if (!sr.isSuccess()) {
						wrapper.success = false;
						for (Database.Error err : sr.getErrors()) {
							errorMessage += err.getMessage() + '. ';
						}
						wrapper.message = errorMessage;
					}
				}
            }
			return wrapper;
        } catch (Exception e) { 
            System.debug(e.getMessage());
			System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }

	private static ChildCaseCreationWrapper doesCircuitIdExistInOppositeServiceList(ChildCaseCreationWrapper wrapper, List<InputCircuitWrapper> newRecords, Case parentCase) {
		ChildCaseCreationWrapper wrapperToReturn = wrapper;
		Boolean overlapInOpposite = false;
		for (InputCircuitWrapper newRecord : newRecords) {
			if (newRecord.serviceAffecting && String.isNotBlank(parentCase.Non_Service_Affecting_Cust_List__c)) {
				List<String> nonServicingAffectingCircuitIds = parentCase.Non_Service_Affecting_Cust_List__c.split(',');
				if (nonServicingAffectingCircuitIds.contains(newRecord.circuitId)){
					overlapInOpposite = true;
					wrapper.overlappingCircuitIds.add(newRecord.circuitId);
				}
			} else if(String.isNotBlank(parentCase.Customer_List__c)) {
				List<String> servicingAffectingCircuitIds = parentCase.Customer_List__c.split(',');
				if (servicingAffectingCircuitIds.contains(newRecord.circuitId)){
					overlapInOpposite = true;
					wrapper.overlappingCircuitIds.add(newRecord.circuitId);
				}
			}
		}
		wrapperToReturn.overlapExists = overlapInOpposite;
		return wrapperToReturn;
	}

	private static Map<Id, Order> getServiceOrderDataForChildCases(List<InputCircuitWrapper> parsedRecords) {
		Set<String> orderIdsSet = new Set<String>();
		for (InputCircuitWrapper record : parsedRecords) {
			orderIdsSet.add(record.serviceOrderId);
		}
		
		Map<Id, Order> serviceOrderDataForChildCases = new Map<Id, Order>([
			SELECT Id, Site_Name__c, Address_A__c, Address_A__r.Address__c, Address_A__r.City__c, Address_A__r.State__c, Address_A__r.Zip__c, Address_Z__c, Address_Z__r.Address__c, Address_Z__r.City__c, Address_Z__r.State__c, Address_Z__r.Zip__c
			FROM Order
			WHERE Id IN :orderIdsSet
		]);
		return serviceOrderDataForChildCases;
	}

	private static Map<String, List<InputCircuitWrapper>> createMapOfInputWrappersByAccountId(List<InputCircuitWrapper> parsedRecords, String parentRecordType) {
		Map<String, List<InputCircuitWrapper>> inputWrappersByAccountIdMap = new Map<String, List<InputCircuitWrapper>>();
		for (InputCircuitWrapper record : parsedRecords) {
			String customKey = record.accountId + '::' + record.serviceAffecting + '::' + parentRecordType;
			List<InputCircuitWrapper> inputList = inputWrappersByAccountIdMap.containsKey(customKey) ? inputWrappersByAccountIdMap.get(customKey) : new List<InputCircuitWrapper>();
			inputList.add(record);
			inputWrappersByAccountIdMap.put(customKey, inputList);
		}
		return inputWrappersByAccountIdMap;
	}

	private static Map<String, Case> getExistingChildCasesWithSameAccountId(Set<String> customKeys, String parentId) {
		Set<String> accountIds = new Set<String>();
		for (String key : customKeys) {
			accountIds.add(key.split('::')[0]);
		}
		List<Case> currentChildCases = [SELECT Id, AccountId, Description, ParentId, Parent.RecordType.Name, Service_Affecting__c FROM Case WHERE ParentId = :parentId AND AccountId IN :accountIds AND RecordTypeId = :CLIENT_COMMUNICATION_RECORD_TYPE_ID];

		Map<String, Case> casesByAccountIdImpactMap = new Map<String, Case>();
		for (Case c : currentChildCases) {
			String customKey = c.AccountId + '::' + c.Service_Affecting__c + '::' + c.Parent.RecordType.Name;
			casesByAccountIdImpactMap.put(customKey, c);
		}
		return casesByAccountIdImpactMap;
	}

	private static String buildDescriptionForCase(List<InputCircuitWrapper> inputWrappers, Map<Id, Order> serviceOrderData) {
		String description = 'Circuit ID(s):\n';
		for (Integer i = 0; i < inputWrappers.size(); i++) {
			Order orderData = serviceOrderData.get(inputWrappers[i].serviceOrderId);
			if (orderData != null) {
				String aLocation = (orderData.Address_A__c == null || orderData.Address_A__r.Address__c == null || orderData.Address_A__r.City__c == null || orderData.Address_A__r.State__c == null || orderData.Address_A__r.Zip__c == null) ? 'Unknown Location' : orderData.Address_A__r.Address__c + ', ' + orderData.Address_A__r.City__c + ', ' + orderData.Address_A__r.State__c + ' ' + orderData.Address_A__r.Zip__c;
				String zLocation = (orderData.Address_Z__c == null || orderData.Address_Z__r.Address__c == null || orderData.Address_Z__r.City__c == null || orderData.Address_Z__r.State__c == null || orderData.Address_Z__r.Zip__c == null) ? 'Unknown Location' : orderData.Address_Z__r.Address__c + ', ' + orderData.Address_Z__r.City__c + ', ' + orderData.Address_Z__r.State__c + ' ' + orderData.Address_Z__r.Zip__c;
				String isServiceAffected = inputWrappers[i].serviceAffecting == true ? 'Yes' : 'No';
				description += 'Circuit: ' + inputWrappers[i].circuitId + '\n';
				description += 'A Location: ' + aLocation + '\n';
				description += 'Z Location: ' + zLocation + '\n';
				description += 'Site Name: ' + orderData.Site_Name__c + '\n';
				description += 'Service Affecting: ' + isServiceAffected;
				if (i != (inputWrappers.size() - 1)) {
					description += '\n\n';
				}
			}
		}
		return description;
	}

	private static String buildDescriptionForOutageCommunicationCase(List<InputCircuitWrapper> inputWrappers) {
		String description = '';
		for (Integer i = 0; i < inputWrappers.size(); i++) {
			description += 'Circuit: ' + inputWrappers[i].circuitId + '\n';
			if (i != (inputWrappers.size() - 1)) {
				description += '\n';
			}
		}
		return description;
	}

    @AuraEnabled
    public static void closeChildCases(List<String> caseRecordIds, Boolean closedFromSentEmail) {
		List<Case> casesToClose = new List<Case>();
        for (String id : caseRecordIds) {
            Case c = new Case(
                Id = id,
                Status = 'Closed'
            );
			if (closedFromSentEmail) {
				c.Maintenance_Email_Sent__c = true;
			}
            casesToClose.add(c);
        }

        try {
            if (casesToClose.size() > 0) {
                update casesToClose;
            }
        } catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
        }
    }

	@AuraEnabled
    public static void reopenChildCases(List<String> caseRecordIds) {
        List<Case> casesToOpen = new List<Case>();
        for (String id : caseRecordIds) {
            Case c = new Case(
                Id = id,
                Status = 'Open'
            );
            casesToOpen.add(c);
        }

        try {
            if (casesToOpen.size() > 0) {
                update casesToOpen;
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class OutputCircuitWrapper{
        @AuraEnabled
        public String accountId;
		@AuraEnabled
        public String circuitId;
        @AuraEnabled
        public Boolean circuitFound;
        @AuraEnabled
        public String orderNumber;
        @AuraEnabled
        public String maintenanceId;
        @AuraEnabled
        public String productFamily;
        @AuraEnabled
        public String accountName;
		@AuraEnabled
        public String searchMessage;
        @AuraEnabled
        public String serviceOrderId;
		@AuraEnabled
        public String siteName;

		OutputCircuitWrapper(Boolean circuitFound, String maintenanceId, Order o) {
			this.circuitFound = circuitFound;
			this.accountId = o.AccountId;
			this.accountName = o.Account.Name;
			this.circuitId = o.Service_Id__c;
			this.maintenanceId = maintenanceId;
            this.orderNumber = o.OrderNumber;
            this.productFamily = o.Primary_Product_Family__c;
            this.serviceOrderId = o.Id;
			this.siteName = o.Site_Name__c;
		}

		OutputCircuitWrapper(Boolean circuitFound, String maintenanceId, String identifier, String message) {
			this.circuitFound = circuitFound;
			this.circuitId = identifier;
			this.maintenanceId = maintenanceId;
			this.searchMessage = message;
		}
    }

    public class InputCircuitWrapper{
        @AuraEnabled
        public String accountId;
		@AuraEnabled
        public String circuitId;
        @AuraEnabled
        public String orderNumber;
        @AuraEnabled
        public String parentCaseNumber;
        @AuraEnabled 
        public Boolean serviceAffecting;
		@AuraEnabled
        public String serviceOrderId;
    }

    public class ChildCaseWrapper{
        @AuraEnabled
        public Id caseId;
        @AuraEnabled
        public String caseUrl;
        @AuraEnabled
        public Id parentId;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String serviceAffecting;
        @AuraEnabled
        public String circuitId;
        @AuraEnabled
        public String caseNumber;
        @AuraEnabled
        public Boolean isServiceAffecting;
        @AuraEnabled
        public String accountName;
		@AuraEnabled
        public String emailSent;
    }

	public class ChildCaseCreationWrapper {
		@AuraEnabled
		public Boolean overlapExists;
		@AuraEnabled
		public String message;
		@AuraEnabled
		public List<String> overlappingCircuitIds;
		@AuraEnabled
		public Boolean success;


		ChildCaseCreationWrapper() {
			this.overlappingCircuitIds = new List<String>();
		}
	}

	public class OverlapException extends Exception {}
}