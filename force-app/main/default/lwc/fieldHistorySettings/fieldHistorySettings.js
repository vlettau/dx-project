import { LightningElement, api, wire, track } from 'lwc'
import { getRecord, createRecord, updateRecord } from 'lightning/uiRecordApi'
import { getObjectInfo } from 'lightning/uiObjectInfoApi'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'
import TRACKED_FIELDS_DATA from '@salesforce/schema/Field_History_Setting__c.Tracked_Fields_Data__c'

export default class FieldHistorySettings extends LightningElement {
	@api recordId // Dynamically receives the record ID
	objectApiName = ''; // Holds the API name of the current record
	@track fieldsInfo = []; // Stores the fields information
	@track selectedFields = []; // Tracks fields selected for tracking
	currentTrackedFields = []; // Pulles fields already being tracked from record
	hasSettingsRecord = false; // Tracks if the settings record exists
	configRecordId = ''; // Holds the ID of the config record

	connectedCallback () {

	}

	get trackedFields () {
		return this.currentTrackedFields
	}

	@wire( getRecord, { recordId: '$recordId', fields: [ 'objectApiName' ] } )
	wiredRecord ( { data, error } ) {
		if ( data ) {
			console.log( 'getRecord data', data )
			this.objectApiName = data.apiName // Get object API name
			// console.log( 'objectApiName', this.objectApiName )


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
			/**
			 ** TODO: Use the trackedFields array to add checkmarks to the fieldsInfo array
			 */
			this.getTrackedFieldsLWC( this.objectApiName )
				.then(
					( trackedFields ) => {
						this.currentTrackedFields = trackedFields
						this.hasSettingsRecord = this.currentTrackedFields.length > 0
						console.log( 'tracked fields in wire: ', this.currentTrackedFields )
						// Process and store field metadata
						for ( const fieldName in fields ) {
							if ( fields.hasOwnProperty( fieldName ) ) {
								const field = fields[ fieldName ]
								console.log( 'field', fieldName, this.currentTrackedFields.includes( fieldName ) )
								this.fieldsInfo.push(
									{
										isTracked: this.currentTrackedFields.includes( fieldName ),
										fieldName: fieldName,
										label: field.label,
										// dataType: field.dataType,
										// isCreateable: field.createable,
										// isRequired: !field.nillable,
									}
								)
							}
						}
					}
				)
				.catch(
					( error ) => {
						console.error( 'Error fetching tracked fields:', error )
					}
				)

			console.log( 'fieldsInfo', this.fieldsInfo )
		} else if ( error ) {
			console.error( 'Error fetching object info:', error )
		}
	}

	async getTrackedFieldsLWC ( objectApiName ) {
		try {
			const data = await getTrackedFields( { objectApiName } )
			if ( data && data.length > 0 ) {
				const trackedFields = data[ 0 ]?.[ TRACKED_FIELDS_DATA.fieldApiName ] || []
				this.configRecordId = data[ 0 ]?.Id
				console.log( 'getTrackedFieldsLWC data:', data )
				return trackedFields
			} else {
				console.warn( 'No tracked fields data found.' )
				return []
			}
		} catch ( error ) {
			console.error( 'Error fetching tracked fields:', error )
			return []
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

		console.log( 'Updated selectedFields:', JSON.stringify( this.selectedFields ) )
	}

	saveFieldHistorySettings ( event ) {
		event.preventDefault()
		console.log( 'saveFieldHistorySettings fields:', this.selectedFields )
		// Extract all currently checked fields from the UI
		const checkboxes = this.template.querySelectorAll( 'input[type="checkbox"]:checked' )
		const currentSelectedFields = Array.from( checkboxes ).map( ( checkbox ) => checkbox.dataset.id )

		console.log( 'Currently selected fields from UI:', currentSelectedFields )

		// Ensure currentTrackedFields is parsed properly
		let parsedTrackedFields = []
		try {
			parsedTrackedFields = Array.isArray( this.currentTrackedFields )
				? this.currentTrackedFields
				: JSON.parse( this.currentTrackedFields || '[]' )
		} catch ( error ) {
			console.error( 'Error parsing currentTrackedFields:', error )
		}

		// Merge and deduplicate fields
		const mergedFields = [ ...new Set( [ ...parsedTrackedFields, ...this.selectedFields ] ) ]

		// Prepare fields for the update or create
		const fields = {}
		fields.Object_API_Name__c = this.objectApiName
		fields.Tracked_Fields_Data__c = JSON.stringify( mergedFields ) // Store merged fields as a JSON string

		if ( this.hasSettingsRecord ) {
			// If the record exists, add the Id field to update the record
			fields.Id = this.configRecordId
			console.log( 'recordInput for update:', JSON.stringify( { fields } ) )

			// Update the record
			updateRecord( { fields } )
				.then( ( result ) => {
					console.log( 'Record updated successfully:', result )
					this.showToast( 'Success', 'Field History Settings saved successfully!', 'success' )
				} )
				.catch( ( error ) => {
					console.error( 'Error updating record:', error )
					this.showToast( 'Error', 'Failed to save Field History Settings.', 'error' )
				} )
		} else {
			console.log( 'recordInput for create:', JSON.stringify( { fields } ) )
			// If no record exists, create a new one
			createRecord( {
				apiName: TRACKED_FIELDS_DATA.objectApiName,
				fields
			} )
				.then( ( result ) => {
					console.log( 'Record created successfully:', result )
					this.showToast( 'Success', 'Field History Settings saved successfully!', 'success' )
				} )
				.catch( ( error ) => {
					console.error( 'Error creating record:', error )
					this.showToast( 'Error', 'Failed to save Field History Settings.', 'error' )
				} )
		}
	}




	// Utility method to display toast notifications
	showToast ( title, message, variant ) {
		const event = new ShowToastEvent(
			{
				title,
				message,
				variant
			}
		)
		this.dispatchEvent( event )
	}

	// handle when record is saved
	handleRecordSaved ( event ) {
		console.log( 'Record saved:', event )

	}


}