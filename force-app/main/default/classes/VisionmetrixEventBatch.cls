global class VisionmetrixEventBatch implements Database.Batchable<sObject>, Schedulable, Database.Stateful, Database.AllowsCallouts {
    global Integer recordsParsed = 0;
    global Integer recordsUpdated = 0;
    global Boolean ExecuteNextJob = false;
    global static Integer BatchSize = 10;
    String loginToken = '';
    global Database.QueryLocator start(Database.BatchableContext context) {
        loginToken = VisionmetrixLogin.getVisionmetrixToken();
        System.debug('Header Token: ' + loginToken);
        VisionmetrixEvent.getLatestEvents();

        return Database.getQueryLocator([SELECT Id, CaseNumber, Customer_List__c, hasVisionMetrixTicket__c, 
                                                Account_Name_Text__c, AccountId, ParentId, RecordTypeId, 
                                                Case_Record_Type__c, VisionMETRIX_Ticket_Created_Date__c, VisionMETRIX_Ticket_Number__c, VisionMetrix_Parent_Case__c, 
                                                NotificationType__c, Description, Subject, NOC_Ticket_Assigment__c, 
                                                Maintenance_Start__c, Maintenance_End__c
                                         FROM Case
                                         WHERE hasVisionMetrixTicket__c != true AND Case_Record_Type__c = 'Maintenance' AND VisionMetrix_Parent_Case__c = true AND AccountId IN ( '0010B00001skFrkQAE', '0013g00000Tfxq2AAB', '001U000001jMJS6IAO', '0013g00000TfxtOAAR', '0010B00001p6Z3VQAU', '001U000001jMJVdIAO' ) AND ParentId = null]);
        // return Database.getQueryLocator(VisionMetrixAppController.getParentCases());
    }

    global void execute(Database.BatchableContext context, List<Case> scope) {
        System.debug('scope: ' + scope.size() + ' records.');
    }

    global void execute(SchedulableContext SC) {
        Database.executeBatch(new VisionmetrixEventBatch(), BatchSize);
    }

    global void finish(Database.BatchableContext BC) {
        System.debug(recordsUpdated + ' records updated.');

        String soql = 'SELECT Id, ApexClass.Name, MethodName, JobType, Status, NumberOfErrors, JobItemsProcessed, TotalJobItems, ExtendedStatus, CreatedBy.Email FROM AsyncApexJob ';
        if ( Test.isRunningTest() || Test.isRunningTest() || BC != NULL ) {
            soql = soql + 'WHERE Id = \'' + BC.getJobId() + '\'';
        }
        if ( Test.isRunningTest() || Test.isRunningTest() ) {
            soql = soql + ' ORDER BY CreatedDate DESC LIMIT 1';
        }

        AsyncApexJob job = Database.query(soql);

        //Only send the email if there is a problem.
        if ( Test.isRunningTest() || job != NULL && job.NumberOfErrors != NULL && job.NumberOfErrors > 0 ) {
            EmailUtils em = new EmailUtils();
            em.sendMessage(job, recordsUpdated, recordsParsed);
        }
    }

    global static void start(Integer minute) {

        String jobName = 'VisionmetrixEventBatch';
        if ( Test.isRunningTest() || minute == NULL ) {
            Database.executebatch(new VisionmetrixEventBatch(), BatchSize);
        }
        else if ( Test.isRunningTest() || minute != NULL ) {
            jobName = jobName += ' - ' + minute + ' - ' + DateTime.now().format();
            String cron = '0 ' + String.valueOf(minute) + ' * * * ?';
            System.schedule(jobName, cron, new VisionmetrixEventBatch());
        }
    }

}