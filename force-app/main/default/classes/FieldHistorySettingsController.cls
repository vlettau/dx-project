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

}