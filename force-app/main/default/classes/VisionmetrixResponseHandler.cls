public with sharing class VisionmetrixResponseHandler {
    /**************************************************************************************************************************************** */
    /**
     * handleResponse()
     *
     * Method to handle the response from the call outs
     *
     * @param       response            HttpResponse    the response from the call out
     * @return                          List<Object>    the list of values from the response
     */
    public static List<Object> handleResponse(HttpResponse response) {
        // If the request is successful, parse the JSON response.
        if ( response.getStatusCode() == 200 ) {
            // Deserializes the JSON string into collections of primitive data types.
            Map<String, Object> results = ( Map<String, Object> )JSON.deserializeUntyped(response.getBody());
            for ( String key : results.keySet() ) {
                System.debug(key + ' : ' + results.get(key));
            }
            System.debug(results);
            return results.values();
        }
        else {
            // System.debug('***********************************************RESPONSE***********************************************');
            // Object[] keys = response.getHeaderKeys();
            // Map<String, String> headers = new Map<String, String>();
            // String outputLine='';
            // List<String> outputList = new List<String>();
            // for ( Object key : keys ) {
            //     outputLine = key + ' : ' + response.getHeader(key.toString()) + '\n';
            //     outputList.add(outputLine);
            //     System.debug(key + ' : ' + response.getHeader(key.toString()));
            // }
            // System.debug(response.getBody().remove('\\'));
            // System.debug('******************************************END RESPONSE***********************************************');
            // return outputList;
            System.debug('!!!!!!!!!!!!!!HANDLE RESPONSE ERROR!!!!!!!!!!!!!!!!');
            return null;
        }
    }

}