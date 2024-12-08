import { LightningElement, api, wire, track } from 'lwc'
import { getRelatedListRecords } from 'lightning/uiRelatedListApi'
import getFieldHistoryRecords from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecords'
export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []

    @wire( getRelatedListRecords, {
        recordId: '$recordId',
        relatedListId: 'Field_History__r',
        fields: [ 'CreatedDate', 'CreatedBy.Name', 'Field_API_Name__c', 'Original_Value__c', 'New_Value__c' ]
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