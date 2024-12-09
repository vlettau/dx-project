import { LightningElement, api, wire, track } from 'lwc'
import getFieldHistoryRecords from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecords'

export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []
    @api fieldsInfo
    @track columns = [
        {
            label: 'Created Date',
            type: 'date',
            fieldName: 'CreatedDate',
            typeAttributes: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        },
        // { label: 'Field API Name', fieldName: 'Field_API_Name__c', type: 'text' },
        { label: 'Field Label', fieldName: 'Field_Label__c', type: 'text' },
        { label: 'Original Value', fieldName: 'Original_Value__c', type: 'text' },
        { label: 'New Value', fieldName: 'New_Value__c', type: 'text' },
        { label: 'Created By', fieldName: 'CreatedByName', type: 'text' }
    ]

    connectedCallback () {
        this.getFieldHistoryRecordsLWC( this.recordId )
            .then(
                data => {
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
                const fieldLabel = this.fieldsInfo.find( field => field.fieldName === record.Field_API_Name__c )?.label
                return {
                    ...record,
                    Field_Label__c: fieldLabel,
                    CreatedByName: record.CreatedBy?.Name || 'Unknown', // Flatten CreatedBy.Name
                }
            } )
        } catch ( error ) {
            console.error( 'Error processing data:', error )
            return []
        }
    }

}