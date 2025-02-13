/**
 * @description       : 
 * @author            : Sean Armstrong
 * @group             : 
 * @last modified on  : 10-23-2024
 * @last modified by  : Sean Armstrong
**/
@isTest(seeAllData=true)
private class MaintenanceCreateCircuitTicketCtrlTest {
    @isTest
    private static void getParentCaseRecordTest() {
        Case c = [SELECT Id FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];

        Test.startTest();
        Case parentCase = MaintenanceCreateCircuitTicketController.getParentCaseRecord(c.Id);
        Test.stopTest();

        Assert.areEqual(c.Id, parentCase.Id, 'the parent case id returned should match the original record id used.');
    }

    @isTest
    private static void getCurrentChildCasesTest() {
        Case c = [SELECT Id FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];
        Order o = [SELECT Id, Service_Id__c, OrderNumber FROM Order WHERE Status = 'Activated' AND Billing_Start_Date__c != null AND Service_Id__c != null LIMIT 1];
        Case childCase = new Case(
            Related_Service_Order__c = o.Id,
            ParentId = c.Id,
            Service_Affecting__c = true,
            Status = 'Approved Maintenance',
            RecordTypeId = Schema.SObjectType.Case.getRecordTypeInfosByName().get('Client Communication').getRecordTypeId()
        );

        Test.startTest();
        insert childCase;
        List<MaintenanceCreateCircuitTicketController.ChildCaseWrapper> childCases = MaintenanceCreateCircuitTicketController.getCurrentChildCases(c.Id);
        Test.stopTest();
        Assert.isTrue(childCases.size() > 0, 'child cases should have been returned');
    }

    @isTest
    private static void findCircuitRecordsTest() {
        Case c = [SELECT Id FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];
        Order o = [SELECT Id, Service_Id__c, OrderNumber FROM Order WHERE Status = 'Activated' AND Billing_Start_Date__c != null AND Service_Id__c != null LIMIT 1];
        List<String> circuitIds = new List<String>{ o.Service_Id__c };

        Test.startTest();
        List<MaintenanceCreateCircuitTicketController.OutputCircuitWrapper> results = MaintenanceCreateCircuitTicketController.findCircuitRecords(c.Id, circuitIds);
        Test.stopTest();
        Assert.isTrue(results[0].circuitFound, 'the circuit should have been found so this should be true');
    }

	@isTest
    private static void findCircuitRecordsFailedTest() {
        Case c = [SELECT Id FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];
        List<String> circuitIds = new List<String>{ '1234TGR' };

        Test.startTest();
        List<MaintenanceCreateCircuitTicketController.OutputCircuitWrapper> results = MaintenanceCreateCircuitTicketController.findCircuitRecords(c.Id, circuitIds);
        Test.stopTest();
        Assert.isFalse(results[0].circuitFound, 'the circuit should not have been found so this should be false');
    }

    @isTest
    private static void createChildCasesTest() {
        Case c = [SELECT Id, CaseNumber FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];
        Order o = [SELECT Id, AccountId, Service_Id__c, OrderNumber FROM Order WHERE Status = 'Activated' AND Billing_Start_Date__c != null AND Service_Id__c != null LIMIT 1];

        List<MaintenanceCreateCircuitTicketController.InputCircuitWrapper> wrappersToSend = new List<MaintenanceCreateCircuitTicketController.InputCircuitWrapper>();
        MaintenanceCreateCircuitTicketController.InputCircuitWrapper wrapper = new MaintenanceCreateCircuitTicketController.InputCircuitWrapper();
        wrapper.circuitId = o.Service_Id__c;
        wrapper.orderNumber = o.OrderNumber;
        wrapper.serviceOrderId = o.Id;
        wrapper.serviceAffecting = true;
        wrapper.parentCaseNumber = c.CaseNumber;
		wrapper.accountId = o.AccountId;
        wrappersToSend.add(wrapper);
        String wrapperAsJson = JSON.serialize(wrappersToSend);

        Test.startTest();
        MaintenanceCreateCircuitTicketController.createChildCases(c.Id, wrapperAsJson);
        Test.stopTest();

        Case childCase = [SELECT Id FROM Case WHERE ParentId = :c.Id LIMIT 1];
        Assert.isNotNull(childCase, 'the child case should have been created and should be found');
    }

    @isTest
    private static void closeChildCasesTest() {
        Case c = [SELECT Id FROM Case WHERE Status = 'Pending' AND Reason = 'Maintenance' LIMIT 1];
        Order o = [SELECT Id, Service_Id__c, OrderNumber FROM Order WHERE Status = 'Activated' AND Billing_Start_Date__c != null AND Service_Id__c != null LIMIT 1];
        Case childCase = new Case(
            Related_Service_Order__c = o.Id,
            ParentId = c.Id,
            Service_Affecting__c = true,
            Status = 'New',
            RecordTypeId = Schema.SObjectType.Case.getRecordTypeInfosByName().get('Client Communication').getRecordTypeId(),
            Origin = 'New IT Request'
        );

        Test.startTest();
        insert childCase;
        MaintenanceCreateCircuitTicketController.closeChildCases(new List<String>{ childCase.Id }, false);
        Test.stopTest();

        Case updatedCase = [SELECT Id, Status FROM Case WHERE ParentId = :c.Id LIMIT 1];
        Assert.areEqual('Closed (Duplicate)', updatedCase.Status, 'the child case should be closed or close duplicate');
    } 
}