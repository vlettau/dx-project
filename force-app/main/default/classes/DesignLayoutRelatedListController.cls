global with sharing class DesignLayoutRelatedListController {
    @AuraEnabled(cacheable = true)
    public static List<Off_Net__c> getOffnetRelatedList(String recordId) {
        return [SELECT Id, SOF1__r.OrderNumber, Name, Off_Net_Vendor__r.Name, 
                       Vendor_circuit_Id__c, Vendor_NNI__r.Name
                FROM Off_Net__c
                WHERE SOF1__c IN (SELECT Related_Service_Order__c
                                  FROM Design_Layout__c
                                  WHERE Id = :recordId)
                Order By Name Desc];
    }

}