public with sharing class InvoiceRelatedPermitsController {
    /**
     * getPermitsByVendorAcct()
     *
     * Method to get the permits by vendor account
     *
     * @param       recordId            Id            the record id of the vendor invoice
     * @return                          List<Permit__c>    the list of permits
     */
    @AuraEnabled(cacheable = true)
    public static List<Permit__c> getPermitsByVendorAcct(Id recordId) {
        
            List<Permit__c> permits = [SELECT Id, CreatedDate, Name, Vendor_Account__c, 
                                              Permit_Type__c, Permit_Status__c, Permit_Date_Submitted__c, Permit_Date_Approved__c, 
                                              Expiration_Date__c, Estimated_Permit_Approval_Date__c
                                       FROM Permit__c
                                       WHERE Vendor_Account__c IN (SELECT Account__c
                                                                   FROM Vendor_Invoices__c
                                                                   WHERE Id = :recordId AND Account__r.Type = 'Vendor')
                                       ORDER BY CreatedDate DESC];
            if ( permits.size() == 0 ) {
                throw new AuraHandledException('No permits found for this vendor account');
            }
            return permits;
        }
}