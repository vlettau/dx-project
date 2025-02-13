/**
 * @name              : VisionMetrixCallOutHelper
 * @description       : this is for any methods that need to be called out to VisionMetrixCallOut
 * @author            : vlettau@everstream.net
 * @group             : Enterprise Technology
 * @Created on        : 01-11-2024
 * @last modified by  : vlettau@everstream.net
 * @last modified on  : 01-11-2024
 **/
public with sharing class VisionMetrixCallOutHelper {

    /**
     * makeVisionMetrixPayloadTextFile()
     *
     * This method will call out to VisionMetrix and return the response
     *
     * @param payload - String - the url to call out to
     * @param endpoint - String - the endpoint to call out to
     *
     *
     */
    public static void logAPICallout(String endpoint, String request, String response) {
        Callout_Log__c log = new Callout_Log__c();
        log.Endpoint__c = endpoint.deleteWhitespace().trim();
        log.Payload__c = request.deleteWhitespace().trim();
        log.Response__c = response.deleteWhitespace().trim();
        insert log; // Handle exceptions as appropriate
    }

}