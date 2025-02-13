public with sharing class VisionmetrixLogin {
    /**************************************************************************************************************************************** */
    /**
     * visionMetrixLogin()
     *
     * Method to login to VisionMetrix and get the token for the header
     *
     * @return                          String          the token for the header
     *
     * @uses        genAuthPayload()    Function        to generate the payload for the callout
     */
    public static String getVisionmetrixToken() {
        // if(Test.isRunningTest()){
        //     String token = '4ac5ee08b1c5a901b52b84b3a7a8cd948f3460ee';
        //     return token;
        // }

        Http http = new Http(  );
        HttpRequest request = new HttpRequest(  );

        String authPayload = VisionmetrixLoginPayloadGenerator.genAuthPayload();
        request.setEndpoint('https://rest-api2.visionmetrix.net/1.1/login/');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Content-Length', String.valueOf(authPayload.length()));
        request.setHeader('Connection', 'keep-alive');
        request.setHeader('Accept-Encoding', 'gzip, deflate, br');
        request.setBody(authPayload);
        System.debug(authPayload);

        HttpResponse response = http.send(request);

        // If the request is successful, parse the JSON response.
        if ( response.getStatusCode() == 200 ) {
            // Deserializes the JSON string into collections of primitive data types.
            Map<String, Object> results = ( Map<String, Object> )JSON.deserializeUntyped(response.getBody());
            System.debug(results);
            String token = '';
            if ( Test.isRunningTest() ) {
                token = '4ac5ee08b1c5a901b52b84b3a7a8cd948f3460ee';
            }
            else {
                token = results.get('token').toString();
            }
            System.debug(token);
            return token;
        }
        else {
            System.debug('***********************************************RESPONSE***********************************************');
            Object[] keys = response.getHeaderKeys();
            Map<String, String> headers = new Map<String, String>();
            for ( Object key : keys ) {

               System.debug(key + ' : ' + response.getHeader(key.toString()));
            }
            System.debug(response.getBody());
            System.debug('******************************************END RESPONSE***********************************************');
            return null;
        }
    }
}