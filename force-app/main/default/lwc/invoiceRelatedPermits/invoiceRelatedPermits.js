import { LightningElement, wire, api } from 'lwc';
import getPermitsByVendorAcct from '@salesforce/apex/InvoiceRelatedPermitsController.getPermitsByVendorAcct';

export default class InvoiceRelatedPermits extends LightningElement {

    @api recordId;
    displayPermits;

    columns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Created Date', fieldName: 'CreatedDate', type: 'date' },
        { label: 'Link', fieldName: 'HrefLink', type: 'url', typeAttributes: { label: 'View Permit', target: '_blank' } }
    ];

    connectedCallback () {
        this.getPermitsByVendorAcctLWC( this.recordId );
    }

    formattedDate ( date ) {
        const formattedDate = new Date( date );
        return formattedDate.toLocaleDateString();
    }

    async getPermitsByVendorAcctLWC ( id ) {
        try {
            const Id = id;
            console.log( 'record Id: ' + Id );
            const permits = await getPermitsByVendorAcct( { recordId: Id } );
            console.table( permits );
            this.displayPermits = permits.map( ( m ) => {
                const formattedDate = this.formattedDate( m.CreatedDate );
                // console.log( 'Formatted Date: ' + formattedDate );
                return {
                    Id: m.Id,
                    Name: m.Name,
                    CreatedDate: m.CreatedDate,
                    HrefLink: 'https://everstream.lightning.force.com/' + m.Id
                };
            } );
        }
        catch ( error ) {
            console.log( error );
        }
    }
}