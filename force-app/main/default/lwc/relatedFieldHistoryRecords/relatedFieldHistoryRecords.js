import { LightningElement, api, wire, track } from 'lwc'
import getFieldHistoryRecords from '@salesforce/apex/FieldHistorySettingsController.getFieldHistoryRecords'

export default class RelatedFieldHistoryRecords extends LightningElement {

    @api recordId
    @track relatedListRecords = []

    connectedCallback () {
        this.getFieldHistoryRecordsLWC( this.recordId )
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

    async getFieldHistoryRecordsLWC ( recordId ) {
        return await getFieldHistoryRecords( { recordId: recordId } )
    }

}