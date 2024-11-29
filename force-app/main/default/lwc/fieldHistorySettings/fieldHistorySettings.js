import { LightningElement, api, wire, track } from 'lwc'
import { getRecord, createRecord, updateRecord, getRecordNotifyChange } from 'lightning/uiRecordApi'
import { getRelatedListRecords } from 'lightning/uiRelatedListApi'
import { getObjectInfo } from 'lightning/uiObjectInfoApi'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'
import TRACKED_FIELDS_DATA from '@salesforce/schema/Field_History_Setting__c.Tracked_Fields_Data__c'

export default class FieldHistorySettings extends LightningElement {
	@api recordId // Dynamically receives the record ID
	objectApiName = ''; // Holds the API name of the current record
	@track fieldsInfo = []; // Stores the fields information
	@track selectedFields = []; // Tracks fields selected for tracking
	currentTrackedFields = [];
	hasSettingsRecord = false; // Tracks if the settings record exists
	configRecordId = ''; // Holds the ID of the config record
	fieldSet = new Set();

	connectedCallback () {
	}

	//done
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
						console.log( 'trackedFields', trackedFields )
						this.currentTrackedFields = trackedFields
						this.hasSettingsRecord = this.currentTrackedFields.length > 0
						console.log( 'tracked fields in wire: ', this.currentTrackedFields )
						// Process and store field metadata
						for ( const fieldName in fields ) {
							if ( fields.hasOwnProperty( fieldName ) ) {
								const field = fields[ fieldName ]
								console.log( 'field', fieldName, this.currentTrackedFields.includes( fieldName ) )
								if ( this.currentTrackedFields.includes( fieldName ) ) {
									console.log( 'adding field to fieldSet', fieldName )
									this.fieldSet.add( fieldName )
								}
								this.fieldsInfo.push( {
									isTracked: this.currentTrackedFields.includes( fieldName ),
									fieldName: fieldName,
									label: field.label,
								} )
							}
						}
						console.log( 'fieldSet(after currentTrackedFields added): ', this.fieldSet )
					}
				)
				.catch(
					( error ) => {
						console.error( 'Error fetching tracked fields:', error )
					}
				)

		} else if ( error ) {
			console.error( 'Error fetching object info:', error )
		}
	}

	@wire( getRelatedListRecords, {
		recordId: '$recordId',
		relatedListId: 'Field_History__r',
		fields: [ '	Field_Label__c', 'Original_Value__c','New_Value__c' ]
	} )
	wiredRelatedList ( { data, error } ) {
		if ( data ) {
			console.log( 'wiredRelatedList', data )
		} else if ( error ) {
			console.error( 'Error fetching related list:', error )
		}
	}

	//done
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
	// done
	// Handle checkbox changes
	handleCheckboxChange ( event ) {
		event.preventDefault()
		const fieldName = event.target.dataset.id
		console.log( 'handleCheckboxChange', fieldName )
		const isTracked = event.target.checked
		console.log( 'isTracked', isTracked )

		if ( isTracked ) {
			// Add the field to the selectedFields array if not already present
			if ( !this.fieldSet.has( fieldName ) ) {
				this.fieldSet.add( fieldName )
				console.log( 'added checked fieldSet', this.fieldSet )
			} else {
				console.log( 'field already in fieldSet', fieldName )
			}
		} else if ( !isTracked ) {
			// remove field from tracked fields array
			if ( this.fieldSet.has( fieldName ) ) {
				this.fieldSet.delete( fieldName )
				console.log( 'removed unchecked fieldSet', this.fieldSet )
			} else {
				console.log( 'field not in fieldSet', fieldName )
			}

		}
		console.log( 'fieldSet(after handleCheckboxChange): ', this.fieldSet )
	}

	// next step to fix: saveFieldHistorySettings
	saveFieldHistorySettings ( event ) {
		event.preventDefault()
		console.log( 'fieldSet to save:',  this.fieldSet  )
		console.log( 'this.fieldSet', this.fieldSet )
		const mergedFields = [ ...this.fieldSet ] 
		console.log( 'mergedFields', mergedFields )
		// works gtg
		// Prepare fields for the update or create
		const fields = {}
		fields.Object_API_Name__c = this.objectApiName
		fields.Tracked_Fields_Data__c = JSON.stringify( mergedFields ) // Store merged fields as a JSON string
		console.log( 'fields', { fields } )
		if ( this.hasSettingsRecord ) {
			// If the record exists, add the Id field to update the record
			fields.Id = this.configRecordId
			console.log( 'recordInput for update:', { fields } )

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
	// done
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
	handleSave ( ) {
		console.log( 'Record save detected:', )
		getRecordNotifyChange( { recordId: this.recordId } )
		console.log( 'this.fieldSet', this.fieldSet )

	}


}