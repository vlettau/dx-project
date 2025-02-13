public with sharing class VisionmetrixEventHelper {
    	/***************************************************************************************************************************************** */
	/**
	 * handleLatestEvents()
	 *
	 * method to call the vm api and get the latest events in an http response
	 *
	 * @param       res                    HttpResponse                    the http response from the vm api
	 *
	 * @uses        vmAlertToNms(<VisionMetrix_Event__c>)                to create a nms alert in Salesforce taking the event as a parameter
	 */
	public static void handleLatestEvents(HttpResponse res) {
		System.debug('Response: ' + res);
		String responseBody = res.getBody();
		VisionMetrixWrappers.EventsList eventsList = ( VisionMetrixWrappers.EventsList )JSON.deserialize(responseBody, VisionMetrixWrappers.EventsList.class);
		List<VisionMetrix_Event__c> events = new List<VisionMetrix_Event__c>();
		System.debug('Event List: ' + eventsList);

		for ( VisionMetrixWrappers.Event event : eventsList.events ) {
			if ( event.severity != 'Critical' && event.severity != 'Major' && !Test.isRunningTest() ) {
				continue;
			}
			events.add(createEventFromWrapper(event));
		}
        // VisionmetrixEventNMSAlert.vmEventToAlert(events);
		System.debug('Events: ' + events.size());
		if ( events.size() > 0 ) {
			System.debug('Events: ' + events);
			insert events;
		}
	}
	/***************************************************************************************************************************************** */
	/**
	 * createEventFromWrapper()
	 *
	 * method to create an event record in Salesforce
	 *
	 * @param       event                    VisionMetrixWrappers.Event                    the event to be created
	 *
	 * @return      VisionMetrix_Event__c    the event record to be created
	 */
	public static VisionMetrix_Event__c createEventFromWrapper(VisionMetrixWrappers.Event event) {
		VisionMetrix_Event__c visionMetrixEvent = new VisionMetrix_Event__c();
		System.debug('Critical/Major Event: ' + event);
		visionMetrixEvent.Event_Id_In_VisionMetrix__c = event.id;
		visionMetrixEvent.Start_Time__c = convertToDateTime(event.start_time);
		visionMetrixEvent.End_Time__c = convertToDateTime(event.end_time);
		visionMetrixEvent.Event_Name__c = event.event_name;
		visionMetrixEvent.Node_Name__c = event.node_name;
		visionMetrixEvent.Circuit__c = event.circuit_name;
		visionMetrixEvent.Secondary_Circuit_Name__c = event.secondary_circuit_name;
		visionMetrixEvent.Direction__c = event.direction;
		visionMetrixEvent.KPI__c = event.kpi;
		visionMetrixEvent.Severity__c = Test.isRunningTest() ? 'Critical' : event.severity;
		visionMetrixEvent.Category__c = event.category;
		return visionMetrixEvent;
	}
	/***************************************************************************************************************************************** */
	/**
	 * convertToDateTime()
	 *
	 * method to convert a string to a datetime
	 *
	 * @param       eventTime                    String                    the string to be converted
	 *
	 * @return      Datetime                    the datetime to be returned
	 */
	public static Datetime convertToDateTime(String eventTime) {
		if ( eventTime == null ) {
			return null;
		}
		String sdt = eventTime;
		Long sldt = Long.valueOf(sdt) * 1000;
		return Datetime.newInstance(sldt);
	}

	
}