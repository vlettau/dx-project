public with sharing class VisionmetrixApiCaller {
    /**************************************************************************************************************************************** */
    /**
     * addBulkVMTicket()
     *
     * Method to add a new VisionMetrix ticket
     *@SOQL SELECT Id, AccountId, ParentId, RecordTypeId, Case_Record_Type__c, VisionMetrix_Parent_Case__c, NotificationType__c, Description, Subject, NOC_Ticket_Assigment__c, Maintenance_Start__c, Maintenance_End__c FROM Case WHERE Case_Record_Type__c = 'Maintenance' AND VisionMetrix_Parent_Case__c = true AND ParentId = null
     * @param       tickets             List<Case>      the list of VisionMetrix ticket numbers
     * @param       token               String          the token for the header
     *
     * @see        visionMetrixLogin()                 to get the token for the header
     * @see        genParentPayload()                  to generate the payload for the callout
     */
    public static HttpResponse addBulkVMTicket(List<Case> tickets) {

        System.debug('+++++++++++++++++++Start of addBulkVMTicket Method+++++++++++++++++++++++++++++++++++++++++++++++++++');
        Boolean isExclusion = true;
        String headerToken = VisionmetrixLogin.getVisionmetrixToken();
        Http http = new Http(  );
        HttpRequest request = new HttpRequest(  );
        String ticketPayload = '';

        if ( Test.isRunningTest() ) {
            Case testTicket = new Case(
                Id = '5006g000011bzbSAAQ'
            );
            // testTicket.Related_Service_Order__c = 'a0D1I00000XZQ8QUAX';
            // testTicket.Related_Service_Order_Text__c = 'test';
            // testTicket.Description = 'test';
            // testTicket.Subject = 'test';
            // testTicket.Maintenance_Start__c = Date.today();
            // testTicket.Maintenance_End__c = Date.today()+1;

            List<Case> testTickets = new List<Case>();
            System.debug('testTicket: ' + testTicket);
            testTickets.add(testTicket);
            ticketPayload = VisionmetrixPayloadGenerator.genParentPayload(testTickets);
        }
        else {
            for ( Case ticket : tickets ) {
                System.debug('addBulkVMTicket ticket: ' + ticket.Id);
            }

            ticketPayload = VisionmetrixPayloadGenerator.genParentPayload(tickets);
        }

        request.setEndpoint('https://rest-api2.visionmetrix.net/1.1/tickets/addBulk/');
        request.setMethod('POST');
        request.setHeader('X-ocularip-username', 'everstreampcol1');
        request.setHeader('X-ocularip-token', headerToken);
        request.setHeader('X-ocularip-company', 'Everstream');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Content-Length', String.valueOf(ticketPayload.length()));
        System.debug('addBulkVMTicket Ticket Payload: ' + ticketPayload);
        // for ( String s : ticketPayload.split(',') ) {
        //     System.debug(s);
        // }
        request.setBody(ticketPayload);
        HttpResponse response = http.send(request);
        // If the request is successful, return an object
        VisionmetrixResponseHandler.handleResponse(response);
        // if response is successful

        VisionMetrixCallOutHelper.logAPICallout(String.valueOf(request.getEndpoint()), String.valueOf(request.getBody()), String.valueOf(JSON.deserializeUntyped(response.getBody())));
        System.debug('+++++++++++++++++++End of addBulkVMTicket Method+++++++++++++++++++++++++++++++++++++++++++++++++++');
        return response;
    }


}