import { LightningElement, wire, api } from 'lwc';
import getPermitsByVendor from '@salesforce/apex/InvoiceRelatedPermitsController.getPermitsByVendor';
import getVendorId from '@salesforce/apex/InvoiceRelatedPermitsController.getVendorId';
import { NavigationMixin } from 'lightning/navigation'

export default class InvoiceRelatedPermits extends LightningElement {

    @api recordId;
    @api vendorId;
    permits;

    columns = [
        { label: 'Created Date', fieldName: 'CreatedDate', type: 'date' },
        { label: 'Name', fieldName: 'Name', type: 'text' }
    ];

    connectedCallback () {
        this.getVendorIdLWC(this.recordId);
    }

    async getPermitsByVendorLWC ( id ) {
        try {
            const Id = id;
            console.log( 'Vendor Id: ' + Id );
            const permits = await getPermitsByVendor({ vendorId: Id });
            console.table( permits );
            return permits;
        }
        catch ( error ) {
            console.log( error );
        }
    }

    async getVendorIdLWC ( id ) {
        try {
            const Id = id;
            console.log( 'Line 36 Record Id: ' + Id );
            const vendorId = await getVendorId({ recordId: Id });
            this.vendorId = vendorId;
            console.log( 'Line 39 Vendor Id: ' + vendorId );
            this.permits = await this.getPermitsByVendorLWC( vendorId );
        }
        catch ( error ) {
            console.log( error );
        }
    }

    handleClick ( event ) {
        try {
            const recordId = event.target
            console.log( 'Record Id: ' + {recordId });
            this[ NavigationMixin.GenerateUrl ]( {
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    actionName: 'view'
                }
            } )
            .then( url => {
                window.open( url, '_blank' )
            } )
        }
        catch ( error ) {
            console.log( error );
        }
    }
}