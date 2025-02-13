public with sharing class VisionmetrixEventNMSAlert {
    /***************************************************************************************************************************************** */
	/**
	 * vmEventToAlert()
	 *
	 * method to handle the event and create a nms alert in Salesforce
	 *
	 * @param       newEvent            VisionMetrix_Event__c               the event to be handled
	 *
	 * @uses        visionMetrixLogin() Function                            to get the token for the header
	 */
	public static void vmEventToAlert(List<VisionMetrix_Event__c> newEvents) {
		// VisionMetrixEventController.attachVmEventToCircuit(newEvents);
		VisionMetrix_Event__c vm_event = new VisionMetrix_Event__c();
		List<NMS_Alert__c> alerts = new List<NMS_Alert__c>();

		if ( newEvents != null ) {

			//~ these events should already be filtered for severity
			for ( VisionMetrix_Event__c newEvent : newEvents ) {

				if ( newEvent.Event_Id_In_VisionMetrix__c != null || newEvent.Event_Id_In_VisionMetrix__c != '' ) {
					NMS_Alert__c alert = new NMS_Alert__c();
					System.debug('vmEventToAlert(): ' + newEvent);
					//CHANGE BELOW EVENT NAME IN THE IDENTIFIER WITH THE ID FOR THE EVENT

					//CHANGE BELOW EVENT NAME IN THE IDENTIFIER WITH THE ID FOR THE EVENT
					alert.Identifier__c = newEvent.Event_Id_In_VisionMetrix__c + ' | VisionMetrix - Event | ' + System.today().format();
					alert.Message__c = newEvent.Event_Name__c + ' | ' + newEvent.Severity__c;
					alert.Service_ID__c = newEvent.Secondary_Circuit_Name__c;
					alert.AlertType__c = newEvent.Event_Name__c;
					alert.Source__c = 'VisionMetrix';

					/* FILL IN THE BELOW
					 alert.IP_Address__c = IP ADDRESS;
					 */
					alert.Device_ID__c = newEvent.Node_Name__c;
					alert.ClosedDate__c = newEvent.End_Time__c;

					System.debug('VisionMetrixHelperMethod: Alert: ' + alert);
					alerts.add(alert);
				}

			}
			if ( alerts.size() > 0 ) {
				System.debug('Alerts: ' + alerts);
				//System.enqueueJob(new QueueableAlertInsert(alerts));
				upsert alerts;
				// upsert alerts Identifier__c;
			}

		}
	}
}