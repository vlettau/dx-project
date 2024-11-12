public with sharing class InvoiceRelatedPermitsController {
    public InvoiceRelatedPermitsController() {
    }

    /**
     * getVendorId()
     *
     * Method to get the vendor id from the vendor invoice
     *
     * @param       recordId            Id            the record id of the vendor invoice
     * @return                          Vendor_Invoices__c    the vendor invoice record
     */
    @AuraEnabled
    public static Id getVendorId(Id recordId) {
        System.debug('Apex Line 15 Record Id: ' + recordId);
        try {
            return [SELECT Id, Account__r.Type, Account__c
                    FROM Vendor_Invoices__c
                    WHERE Id = :recordId AND Account__r.Type = 'Vendor'
                    WITH SECURITY_ENFORCED
                    LIMIT 1].Account__c;
        }
        catch ( Exception e ) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * getPermitsByVendor()
     *
     * Method to get the permits by vendor
     *
     * @param       vendorId            String            the vendor id
     * @return                          List<Permit__c>    the list of permits
     */
    @AuraEnabled(cacheable = true)
    public static List<Permit__c> getPermitsByVendor(Id vendorId) {
        System.debug('Apex Line 38 Vendor Id: ' + vendorId);
        try {
            return [SELECT Id, CreatedDate, Name, Vendor_Account__c, 
                           Permit_Type__c, Permit_Status__c, Permit_Date_Submitted__c, Permit_Date_Approved__c, 
                           Expiration_Date__c, Estimated_Permit_Approval_Date__c
                    FROM Permit__c
                    WHERE Vendor_Account__c = :vendorId
                    WITH SECURITY_ENFORCED
                    ORDER BY CreatedDate DESC];
        }
        catch ( Exception e ) {
            throw new AuraHandledException(e.getMessage());
        }
    }

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
        try {
            Id vendorAccountId = [SELECT Id, Account__r.Type, Account__c
                                  FROM Vendor_Invoices__c
                                  WHERE Id = :recordId AND Account__r.Type = 'Vendor'
                                  WITH SECURITY_ENFORCED
                                  LIMIT 1].Account__c;


            List<Permit__c> permits = [SELECT Id, CreatedDate, Name, Vendor_Account__c, 
                                              Permit_Type__c, Permit_Status__c, Permit_Date_Submitted__c, Permit_Date_Approved__c, 
                                              Expiration_Date__c, Estimated_Permit_Approval_Date__c
                                       FROM Permit__c
                                       WHERE Vendor_Account__c = :vendorAccountId
                                       WITH SECURITY_ENFORCED
                                       ORDER BY CreatedDate DESC];
            return permits;
        }
        catch ( Exception e ) {
            throw new AuraHandledException(e.getMessage());
        }
    }

}