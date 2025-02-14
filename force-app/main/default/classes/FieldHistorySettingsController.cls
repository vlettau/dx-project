public with sharing class FieldHistorySettingsController {
    @AuraEnabled(cacheable = true)
    public static List<Field_History_Setting__c> getTrackedFields(String objectApiName) {
        System.debug('objectApiName: ' + objectApiName);
        List<Field_History_Setting__c> trackedFields = [SELECT Id, Tracked_Fields_Data__c
                                                        FROM Field_History_Setting__c
                                                        WHERE Object_API_Name__c = :objectApiName
                                                        LIMIT 1];
        System.debug('trackedFields: ' + trackedFields);
        return trackedFields;
    }

    @AuraEnabled(cacheable = true)
    public static SObject getTrackedFieldsValues(String objectApiName, List<String> fieldNames, String recordId) {
        System.debug('objectApiName: ' + objectApiName);
        System.debug('fieldNames: ' + fieldNames);
        System.debug('recordId: ' + recordId);

        if ( fieldNames.isEmpty() ) {
            return null;
        }

        // Build the dynamic SOQL query string without directly inserting variables
        String soqlQuery = 'SELECT ' + String.join(fieldNames, ',') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
        System.debug('soqlQuery: ' + soqlQuery);

        // Execute the dynamic SOQL query
        List<SObject> results = Database.query(soqlQuery);
        System.debug('searchResults: ' + results);

        // Return the first result if available
        return results.isEmpty() ? null : results[0];
    }

    @AuraEnabled
    public static void createFieldHistoryRecord(String objectApiName, String fieldName, String fieldLabel, String newFieldValue, String oldFieldValue, String recordId) {
        try {
            Field_History__c fieldHistoryRecord = new Field_History__c(
                Object_API_Name__c = objectApiName, 
                Field_API_Name__c = fieldName, 
                Field_Label__c = fieldLabel, 
                New_Value__c = newFieldValue, 
                Original_Value__c = oldFieldValue, 
                Record_Id__c = recordId
            );
            System.debug('fieldHistoryRecord: ' + fieldHistoryRecord);
            insert fieldHistoryRecord;
        }
        catch ( Exception e ) {
            System.debug('Error creating field history record: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void getFieldHistoryRecord(String objectApiName, String fieldName, String fieldValue, String recordId) {
        System.debug('objectApiName: ' + objectApiName);
        System.debug('fieldName: ' + fieldName);
        System.debug('fieldValue: ' + fieldValue);
        System.debug('recordId: ' + recordId);

        String fieldLabel = getFieldLabel(objectApiName, fieldName);
        System.debug('fieldLabel: ' + fieldLabel);

        List<Field_History__c> fhrs = [SELECT Id, Field_API_Name__c, New_Value__c, Original_Value__c, 
                                              Object_API_Name__c, Field_Label__c
                                       FROM Field_History__c
                                       WHERE Record_Id__c = :recordId AND Field_API_Name__c = :fieldName
                                       ORDER BY CreatedDate DESC
                                       LIMIT 1];
        //compare the field value with the current field value
        if ( fhrs.size() < 1 ) {
            createFieldHistoryRecord(objectApiName, fieldName, fieldLabel, fieldValue, '', recordId);

        }
        else {
            for ( Field_History__c fhr : fhrs ) {
                if ( fhr.Field_API_Name__c == fieldName && fhr.New_Value__c != fieldValue ) {
                    System.debug('fhrs is not null');
                    System.debug('Original_Value__c: ' + fhr.Original_Value__c);
                    System.debug('fieldValue: ' + fieldValue);
                    System.debug('recordId: ' + recordId);
                    System.debug('objectApiName: ' + objectApiName);
                    System.debug('fieldName: ' + fieldName);
                    System.debug('createFieldHistoryRecord');
                    createFieldHistoryRecord(objectApiName, fieldName, fhr.Field_Label__c, fieldValue, fhr.New_Value__c, recordId);
                }
                else {
                    System.debug('Field value is the same: ' + fhr.New_Value__c);
                }
            }
        }
    }

    @AuraEnabled
    public static List<Field_History__c> getFieldHistoryRecords(String recordId) {
        List<Field_History__c> fhrs = [SELECT Id, Field_API_Name__c, New_Value__c, Original_Value__c, 
                                              CreatedBy.Name, CreatedDate, Object_API_Name__c, Field_Label__c
                                       FROM Field_History__c
                                       WHERE Record_Id__c = :recordId
                                       ORDER BY CreatedDate DESC];
        return fhrs;
    }

    @AuraEnabled(cacheable = true)
    public static String getCurrentUserProfileName() {
        return [SELECT Profile.Name
                FROM User
                WHERE Id = :UserInfo.getUserId()].Profile.Name;
    }

    // Dynamic method for retrieving field label
    public static String getFieldLabel(String objectName, String fieldName) {
        Schema.DescribeSObjectResult objDesc = Schema.getGlobalDescribe().get(objectName).getDescribe();
        Schema.DescribeFieldResult fieldDesc = objDesc.fields.getMap().get(fieldName).getDescribe();
        System.debug('fieldDesc: ' + fieldDesc);
        return fieldDesc.getLabel();
    }

}