import { LightningElement, api, track, wire } from 'lwc'
import { getRecord } from 'lightning/uiRecordApi'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'
import getTrackedFieldsValues from '@salesforce/apex/FieldHistorySettingsController.getTrackedFieldsValues'
import TRACKED_FIELDS_DATA from '@salesforce/schema/Field_History_Setting__c.Tracked_Fields_Data__c'

export default class TestComponent extends LightningElement {
    @api recordId // Dynamically receives the record ID
    @api objectApiName // Holds the API name of the current record
    @track fieldNames
    @track trackedFields = []
    // @track trackedField = {
    //     fieldName: '',
    //     fieldValue: '',
    //     createdAt: ''
    // }

    connectedCallback () {
        console.log( 'recordId', this.recordId )
        console.log( 'objectApiName', this.objectApiName )
        this.getTrackedFieldsLWC( this.objectApiName )
            .then( trackedFields => {
                console.log( 'trackedFields', trackedFields )
                this.trackedFields = trackedFields
                this.trackedFields.forEach( field => {
                    console.log( 'field', field )
                    let fieldName = this.objectApiName + '.' + field.fieldApiName
                    this.fieldNames.push( fieldName )
                } )
            } )
            .catch( error => {
                console.log( 'error', error )
            } )
    }

    @wire( getRecord, { recordId: '$recordId', fields: '$fieldNames'} )
    wiredRecord ( { data, error } ) {
        if ( data ) {
            console.log( 'data', data )
        } else if ( error ) {
            console.log( 'error', error )
        }
    }

    async getTrackedFieldsLWC ( objectApiName ) {
        try {
            const data = await getTrackedFields( { objectApiName } )
            if ( data && data.length > 0 ) {
                const trackedFields = data[ 0 ]?.[ TRACKED_FIELDS_DATA.fieldApiName ] || []
                this.configRecordId = data[ 0 ]?.Id
                console.log( 'getTrackedFieldsLWC data:', data )
                const trackecFieldsValues = await getTrackedFieldsValues( { objectApiName: this.objectApiName, fieldNames: trackedFields, recordId: this.recordId } )
                console.log( 'trackecFieldsValues', trackecFieldsValues )
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
}