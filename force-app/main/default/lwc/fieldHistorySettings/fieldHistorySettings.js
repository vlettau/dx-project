import { LightningElement, api, wire, track } from 'lwc'
import { getRecord, createRecord } from 'lightning/uiRecordApi'
import { getObjectInfo } from 'lightning/uiObjectInfoApi'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'

export default class FieldHistorySettings extends LightningElement {
	@api recordId // Dynamically receives the record ID
	objectApiName = ''; // Holds the API name of the current record
	@track fieldsInfo = []; // Stores the fields information
	@track selectedFields = []; // Tracks fields selected for tracking
	currentTrackedFields = []; // Pulles fields already being tracked from record

	connectedCallback () {
		
	}

	@wire( getRecord, { recordId: '$recordId', fields: [ 'objectApiName' ] } )
	wiredRecord ( { data, error } ) {
		if ( data ) {
			console.log( 'data', data )
			this.objectApiName = data.apiName // Get object API name
			console.log( 'objectApiName', this.objectApiName )
			this.currentTrackedFields = this.getTrackedFieldsLWC( this.objectApiName )
			console.log( 'currentTrackedFields', this.currentTrackedFields )
		} else if ( error ) {
			console.error( 'Error fetching record:', error )
		}
	}

	@wire( getObjectInfo, { objectApiName: '$objectApiName' } ) // Fetch object metadata
	wiredObjectInfo ( { data, error } ) {
		if ( data ) {
			this.fieldsInfo = []
			const fields = data.fields
			console.log( 'fields', fields )

			// Process and store field metadata
			for ( const fieldName in fields ) {
				if ( fields.hasOwnProperty( fieldName ) ) {
					const field = fields[ fieldName ]
					this.fieldsInfo.push( {
						fieldName: fieldName,
						label: field.label,
						// dataType: field.dataType,
						// isCreateable: field.createable,
						// isRequired: !field.nillable,
					} )
				}
			}
		} else if ( error ) {
			console.error( 'Error fetching object info:', error )
		}
	}

	async getTrackedFieldsLWC ( objectApiName ) {
		
		try {
			console.log( 'objectApiName', objectApiName )
			const trackedFields = await getTrackedFields( { objectApiName: objectApiName } )
			console.log( 'trackedFields', trackedFields )
		} catch ( error ) {
			console.error( 'Error fetching tracked fields:', error )
		}
		
		
	}

	// Handle checkbox changes
	handleCheckboxChange ( event ) {
		event.preventDefault()
		const fieldName = event.target.dataset.id
		const isTracked = event.target.checked

		if ( isTracked ) {
			// Add the field to the selectedFields array if not already present
			if ( !this.selectedFields.includes( fieldName ) ) {
				this.selectedFields.push( fieldName )
			}
		} else {
			// Remove the field from the selectedFields array if unchecked
			this.selectedFields = this.selectedFields.filter( field => field !== fieldName )
		}

		console.log( 'Updated selectedFields:', this.selectedFields )
	}

	saveFieldHistorySettings ( event ) {
		event.preventDefault()
		const fields = {
			Object_API_Name__c: this.objectApiName,
			Tracked_Fields_Data__c: JSON.stringify( this.selectedFields ) // Store as a JSON string
		}

		const recordInput = {
			apiName: 'Field_History_Setting__c',
			fields
		}

		// Create the record in Salesforce
		createRecord( recordInput )
			.then( result => {
				console.log( 'Record created successfully:', result )
				// Optionally show a success toast
				this.showToast( 'Success', 'Field History Settings saved successfully!', 'success' )
			} )
			.catch( error => {
				console.error( 'Error creating record:', error )
				// Optionally show an error toast
				this.showToast( 'Error', 'Failed to save Field History Settings.', 'error' )
			} )
	}

	// Utility method to display toast notifications
	showToast ( title, message, variant ) {
		const event = new ShowToastEvent( {
			title,
			message,
			variant
		} )
		this.dispatchEvent( event )
	}


}