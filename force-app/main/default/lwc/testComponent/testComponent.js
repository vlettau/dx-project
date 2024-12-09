import { LightningElement, api, track, wire } from 'lwc'



export default class TestComponent extends LightningElement {
    @api recordId
    @track fieldHistoryRecords = []

    async connectedCallback () {
        console.log( 'TestComponent connectedCallback' )
        const query = ` 
        query {
            Field_History__c(where: "Record_Id__c = '${ this.recordId }'") {
                Id
                Name
                CreatedById
                CreatedBy.Name
                CreatedDate
                Field_API_Name__c
                New_Value__c
                Old_Value__c
            }
        }`

        try {
            const response = await fetch( '/services/data/v59.0/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( { query } )
            } )
            const data = await response.json()
            console.log( 'TestComponent data', data )
            this.fieldHistoryRecords = data
        } catch ( error ) {
            console.error( 'Error fetching data:', error )
        }
    }
}