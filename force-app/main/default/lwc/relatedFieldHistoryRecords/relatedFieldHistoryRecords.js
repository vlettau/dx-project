import { LightningElement, api, wire, track } from 'lwc'
import { getRelatedListRecords } from 'lightning/uiRelatedListApi'
import getFieldHistoryRecords from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecords'
export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []

    connectedCallback () {
        getFieldHistoryRecords( this.recordId )
            .then(
                data => {
                    this.relatedListRecords = data
                }
            )
            .catch(
                error => {
                    console.error( 'Error fetching field history records:', error )
                }
            )
    }

    // @wire( getRelatedListRecords, {
    //     recordId: '$recordId',
    //     relatedListId: 'Field_History__r',
    //     fields: [ 'Field_History__c.CreatedDate', 'Field_History__c.Original_Value__c', 'Field_History__c.New_Value__c' ]
    // } )
    // wiredRelatedList ( { data, error } ) {
    //     if ( data ) {
    //         this.relatedListRecords = data
    //         console.log( 'wiredRelatedList', this.relatedListRecords )
    //     } else if ( error ) {
    //         console.error( 'Error fetching related list:', error )
    //     }
    // }
}