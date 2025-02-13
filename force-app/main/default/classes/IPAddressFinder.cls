public with sharing class IPAddressFinder {
    // @future(callout=true)
    public static void getMyIP() {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://api.ipify.org');
        request.setMethod('GET');

        try {
            HttpResponse response = http.send(request);
            if (response.getStatusCode() == 200) {
                System.debug('Salesforce Hyperforce IP: ' + response.getBody());
            } else {
                System.debug('Failed to fetch IP: ' + response.getStatusCode());
            }
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
        }
    }
}
