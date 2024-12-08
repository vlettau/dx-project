import { LightningElement, api, wire, track } from 'lwc'
import { getRelatedListRecords } from 'lightning/uiRelatedListApi'

export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []

    @wire( getRelatedListRecords, {
        parentRecordId: '$recordId',
        relatedListId: 'Fields_Historys__r',
        fields: [
            'Field_History__c.CreatedDate',
            'Field_History__c.CreatedBy.Name',
            'Field_History__c.Field_API_Name__c',
            'Field_History__c.Original_Value__c',
            'Field_History__c.New_Value__c'
        ],
        sortBy: 'Field_History__c.CreatedDate',
        sortDirection: 'DESC'
    } )
    wiredRelatedList ( { data, error } ) {
        if ( data ) {
            const relatedListRecords = data
            console.log( 'wiredRelatedList', relatedListRecords )
        } else if ( error ) {
            console.error( 'Error fetching related list:', error )
        }
    }

}