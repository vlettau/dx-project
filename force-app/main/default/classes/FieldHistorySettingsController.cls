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

        // Build the dynamic SOQL query string without directly inserting variables
        String soqlQuery = 'SELECT ' + String.join(fieldNames, ',') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
        System.debug('soqlQuery: ' + soqlQuery);

        // Execute the dynamic SOQL query
        List<SObject> results = Database.query(soqlQuery);
        System.debug('searchResults: ' + results);

        // Return the first result if available
        return results.isEmpty() ? null : results[0];
    }

    @AuraEnabled(cacheable = true)
    public static void createTrackedFieldRecord(String objectApiName,String fieldName,String fieldValue,String recordId) {
        Field_Value_Record__c trackedField = new Field_Value_Record__c(
            Object_API_Name__c = objectApiName,
            Tracked_Fields_Name__c = fieldName,
            Tracked_Fields_Value__c = fieldValue,
            Record_Id__c = recordId
        );
        insert trackedField;
    }

}