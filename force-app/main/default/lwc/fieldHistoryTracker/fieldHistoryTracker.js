import { LightningElement, api, track, wire } from 'lwc'
import { getRecord } from 'lightning/uiRecordApi'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'
import getTrackedFieldsValues from '@salesforce/apex/FieldHistorySettingsController.getTrackedFieldsValues'
import TRACKED_FIELDS_DATA from '@salesforce/schema/Field_History_Setting__c.Tracked_Fields_Data__c'
import getFieldHistoryRecord from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecord'

export default class FieldHistoryTracker extends LightningElement {
    @api recordId // Dynamically receives the record ID
    @api objectApiName // Holds the API name of the current record
    @track fieldNames = [];
    @track fieldSet = new Set();

    connectedCallback () {
        console.log( 'recordId', this.recordId )
        console.log( 'objectApiName', this.objectApiName )
        this.getTrackedFieldsLWC( this.objectApiName )
            .then(
                trackedFields => {
                    getTrackedFieldsValues( {
                        objectApiName: this.objectApiName,
                        fieldNames: trackedFields,
                        recordId: this.recordId
                    } )
                        .then(
                            trackedFieldsValues => {
                                for ( const trackedValue in trackedFieldsValues ) {
                                    console.log( 'trackedValue', trackedValue )
                                    if ( typeof trackedValue !== 'undefined' && !trackedValue.includes( 'undefined' ) && !trackedValue.includes( 'null' ) ) {
                                        const fieldApi = this.objectApiName + '.' + trackedValue
                                        console.log( 'full field Api', fieldApi )
                                        this.fieldSet.add( fieldApi )
                                    }
                                    else {
                                        console.log( 'any tracked values: ', trackedValue )
                                    }
                                }
                                console.log( 'this.fieldSet', this.fieldSet )
                                this.fieldNames = [ ...this.fieldSet ]
                                console.log( 'this.fieldNames', this.fieldNames )
                            }
                        )
                        .catch(
                            error => {
                                console.log( 'connectedCallback getTrackedFieldsLWC error', error )
                            }
                        )
                }
            )
            .catch(
                error => {
                    console.log( 'connectedCallback getTrackedFieldsLWC error', error )
                }
            )
    }

    @wire( getRecord, { recordId: '$recordId', fields: '$fieldNames' } )
    wiredRecord ( { data, error } ) {
        if ( data ) {
            console.log( 'data', data )
            const fields = data.fields
            for ( const field in fields ) {
                console.log( 'this.objectApiName', this.objectApiName )
                console.log( 'field', field )
                console.log( 'fields[ field ]', fields[ field ].value )
                console.log( 'this.recordId', this.recordId )
                this.getFieldHistoryRecordLWC( this.objectApiName, field, fields[ field ].value, this.recordId )
                    .then(
                        data => {
                            console.log( 'getFieldHistoryRecordLWC data', data )
                        }
                    ).catch(
                        error => {
                            console.log( 'getFieldHistoryRecordLWC error', error )
                        }
                    )
            }
            console.log( 'fields', fields )
        } else if ( error ) {
            console.log( 'wiredRecord getRecord error', error )
        }
    }

    async getTrackedFieldsLWC ( objectApiName ) {
        try {
            const data = await getTrackedFields( { objectApiName } )
            if ( data && data.length > 0 ) {
                const trackedFields = data[ 0 ]?.[ TRACKED_FIELDS_DATA.fieldApiName ] || []
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

    async getFieldHistoryRecordLWC ( objectApiName, fieldName, fieldValue, recordId ) {
        try {
            console.log( 'getFieldHistoryRecordLWC objectApiName', objectApiName )
            console.log( 'getFieldHistoryRecordLWC fieldName', fieldName )
            console.log( 'getFieldHistoryRecordLWC fieldValue', fieldValue )
            console.log( 'getFieldHistoryRecordLWC recordId', recordId )
            const data = await getFieldHistoryRecord( { objectApiName: objectApiName, fieldName: fieldName, fieldValue: fieldValue, recordId: recordId } )
            console.log( 'getFieldHistoryRecordLWC data', data )
            return data
        } catch ( error ) {
            console.error( 'getFieldHistoryRecordLWC error', error )
            return []
        }
    }
}