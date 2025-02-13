public with sharing class VisionmetrixLoginPayloadGenerator {
     /**
     * genAuthPayload()
     *
     * Method to generate the payload for the login call outs
     *
     * @return                          String                  the payload for the callout
     *
     * @uses        InitLogin           VisionMetrixWrapper     to create the login wrapper
     */
    public static String genAuthPayload() {
        VisionMetrixWrappers.InitLogin login = new VisionMetrixWrappers.InitLogin();
        System.debug(login);
        return JSON.serialize(login);
    }
}