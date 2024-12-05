import { LightningElement, api, track, wire } from 'lwc'
import { getRecord } from 'lightning/uiRecordApi'
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields'
import getTrackedFieldsValues from '@salesforce/apex/FieldHistorySettingsController.getTrackedFieldsValues'
import TRACKED_FIELDS_DATA from '@salesforce/schema/Field_History_Setting__c.Tracked_Fields_Data__c'
import { getObjectInfo } from 'lightning/uiObjectInfoApi'

export default class TestComponent extends LightningElement {
    @api recordId // Dynamically receives the record ID
    @api objectApiName // Holds the API name of the current record
    @track fieldNames = [];
    @track trackedfieldNames = [];
    @track trackedFieldApiNames = [];
    @track trackedFields
    @track trackedFieldsValues = [];
    @track trackedFieldsValuesArray = [];
    @track filteredValues = [];


    connectedCallback () {
        console.log( 'recordId', this.recordId )
        console.log( 'objectApiName', this.objectApiName )
        this.getTrackedFieldsLWC( this.objectApiName )
            .then(
                trackedFields => {
                    this.trackedFields = trackedFields
                }
            )
            .catch(
                error => {
                    console.log( 'connectedCallback getTrackedFieldsLWC error', error )
                }
            )
    }

    @wire( getObjectInfo, { objectApiName: '$objectApiName' } ) // Fetch object metadata
    wiredObjectInfo ( { data, error } ) {
        if ( data ) {
            const fields = data.fields
            for ( const fieldName in fields ) {
                if ( fields.hasOwnProperty( fieldName ) ) {
                    const fieldApi = this.objectApiName + '.' + fields[ fieldName ].apiName
                    for ( const trackedField of this.trackedFieldApiNames ) {
                        // if ( this.trackedFieldApiNames.includes( fieldApi ) ) {
                        //     console.log( 'fieldApi', fieldApi )
                        //     this.fieldNames.push( fieldApi )
                        // }
                        if ( trackedField === fieldApi ) {
                            console.log( 'fieldApi', fieldApi )
                            this.fieldNames.push( fieldApi )
                        }
                    }
                }
            }
            // for ( const trackedField of this.trackedFieldApiNames ) {
            //     console.log( 'trackedField', trackedField )
            // }
            // Filter out the tracked fields from the fieldNames array
            // this.filteredValues = this.fieldNames.filter( field => !this.trackedFieldApiNames.includes( field ) )
            // console.log( 'filteredValues', this.filteredValues )
        } else if ( error ) {
            console.log( 'wiredObjectInfo error', error )
        }
    }

    @wire( getRecord, { recordId: '$recordId', fields: '$fieldNames' } )
    wiredRecord ( { data, error } ) {
        if ( data ) {
            console.log( 'data', data )
        } else if ( error ) {
            console.log( 'wiredRecord getRecord error', error )
        }
    }

    async getTrackedFieldsLWC ( objectApiName ) {
        try {
            const data = await getTrackedFields( { objectApiName } )
            if ( data && data.length > 0 ) {
                const trackedFields = data[ 0 ]?.[ TRACKED_FIELDS_DATA.fieldApiName ] || []
                const trackedFieldsValues = await getTrackedFieldsValues( {
                    objectApiName: this.objectApiName,
                    fieldNames: trackedFields,
                    recordId: this.recordId
                } )
                try {
                    for ( const trackedValue in trackedFieldsValues ) {
                        if ( typeof trackedValue !== 'undefined' && !trackedValue.includes( 'undefined' ) && !trackedValue.includes( 'null' ) ) {
                            console.log( ' non-null tracked values: ', trackedValue )
                            const fieldApi = this.objectApiName + '.' + trackedValue
                            console.log( 'fieldApi', fieldApi )
                            this.trackedFieldApiNames.push( fieldApi )
                        }
                        else {
                            console.log( 'any tracked values: ', trackedValue )
                        }
                    }
                    this.trackedFieldApiNames.forEach( field => {
                        console.log( 'trackedFieldApiNames', field )
                    } )
                } catch ( error ) {
                    console.log( 'getTrackedFieldsLWC loop error', error )
                }
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