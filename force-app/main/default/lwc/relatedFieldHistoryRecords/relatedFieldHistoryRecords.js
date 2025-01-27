import { LightningElement, api, wire, track } from 'lwc'
import getFieldHistoryRecords from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecords'
import { subscribe, unsubscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService'
import FIELD_HISTORY_CHANNEL from '@salesforce/messageChannel/FieldHistoryMessageChannel__c'
import { refreshApex } from '@salesforce/apex'

export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []


    @wire( MessageContext )
    messageContext

    @track columns = [
        {
            label: 'Created Date',
            type: 'date',
            fieldName: 'CreatedDate',
            typeAttributes: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        },
        { label: 'Field Label', fieldName: 'Field_Label__c', type: 'text' },
        { label: 'Original Value', fieldName: 'Original_Value__c', type: 'text' },
        { label: 'New Value', fieldName: 'New_Value__c', type: 'text' },
        { label: 'Created By', fieldName: 'CreatedByName', type: 'text' }
    ]

    connectedCallback () {
        this.subscribeToMessageChannel()
        console.log( 'relatedFieldHistoryRecords.js recordId: ' + this.recordId )
        this.getFieldHistoryRecordsLWC( this.recordId )
            .then(
                data => {
                    console.log( 'relatedFieldHistoryRecords.js getFieldHistoryRecordsLWC data: ' + data )
                    this.relatedListRecords = this.processData( data )
                }
            )
            .catch(
                error => {
                    console.error( 'Error fetching field history records:', error )
                }
            )

    }

    async getFieldHistoryRecordsLWC ( recordId ) {

        return await getFieldHistoryRecords( { recordId: recordId } )
    }

    processData ( data ) {
        try {
            return data.map( record => {
                return {
                    ...record,
                    CreatedByName: record.CreatedBy?.Name || 'Unknown', // Flatten CreatedBy.Name
                }
            } )
        } catch ( error ) {
            console.error( 'relatedFieldHistoryRecords.js Error processing data:', error )
            return []
        }
    }

    subscribeToMessageChannel () {
        if ( !this.subscription ) {
            this.subscription = subscribe(
                this.messageContext,
                FIELD_HISTORY_CHANNEL,
                ( message ) => this.handleMessage( message ),
                { scope: APPLICATION_SCOPE }
            )
            console.log( 'subscribeToMessageChannel', this.subscription )
        }
    }

    handleMessage ( message ) {
        console.log( 'handleMessage', message )
        this.getFieldHistoryRecordsLWC( this.recordId )
            .then(
                data => {
                    this.relatedListRecords = this.processData( data )
                }
            )
    }

}