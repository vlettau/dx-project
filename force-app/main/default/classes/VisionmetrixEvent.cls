public with sharing class VisionmetrixEvent {
    
    /**************************************************************************************************************************************** */
    /**
     * getLatestEvents()
     *
     * Method calls the VisionMetrix API to get the latest events and will create a new ticket in Salesforce or attach the event to an existing ticket
     *
     * @insert      newEvent                VisionMetrix_Event__c       the event to be handled
     *
     * @uses        visionMetrixLogin()     Function                    to get the token for the header
     *
     */
    //@future(callout=true)
    public static void getLatestEvents() {
        String headerToken = VisionmetrixLogin.getVisionmetrixToken();
        System.debug('Header Token: ' + headerToken);
        HttpRequest request = new HttpRequest(  );
        request.setEndpoint('https://rest-api2.visionmetrix.net/1.1/event/latest/');
        request.setMethod('GET');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('X-ocularip-username', 'everstreampcol1');
        request.setHeader('X-ocularip-token', headerToken);
        request.setHeader('X-ocularip-company', 'Everstream');
        HttpResponse response = new Http(  ).send(request);

        Map<String, Object> results = ( Map<String, Object> )JSON.deserializeUntyped(response.getBody());
        String success = results.get('success').toString();
        String events = results.get('events').toString();
        if ( success == 'false' ) {
            throw new System.QueryException( 'Callout failed with error: ' + results.get('error').toString() );
        }
        else if ( success == 'true' && events != null ) {
            System.debug('Success Response Events: ');
            VisionmetrixEventHelper.handleLatestEvents(response);
        }
        else {
            throw new System.QueryException( 'Callout succeded no Events retunred' );
        }
    }
}