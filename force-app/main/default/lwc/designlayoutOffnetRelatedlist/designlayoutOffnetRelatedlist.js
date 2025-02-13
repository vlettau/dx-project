import { api, LightningElement, wire } from 'lwc';
import getOffnetRelatedList from '@salesforce/apex/DesignLayoutRelatedListController.getOffnetRelatedList';

export default class DesignlayoutOffnetRelatedlist extends LightningElement {
    @api recordId;
    offnetRelatedList = [];

    columns = [
        { label: 'Off Net Record', fieldName: 'HrefLink', type: 'url', 
            typeAttributes: { label: { fieldName: 'ofntName' }, target: '_blank' } },
        // { label: 'Off Net Record', fieldName: 'Name', type: 'text' },
        { label: 'Last-Mile Carrier', fieldName: 'lastMileCarrier', type: 'text' },
        { label: 'Vendor Circuit Id', fieldName: 'Vendor_circuit_Id__c', type: 'text' },
        { label: 'Vendor NNI', fieldName: 'vendorNNI', type: 'text' }
    ];

    @wire(getOffnetRelatedList, { recordId: '$recordId' })
    wiredOffnetList({ error, data }) {
        if (data) {
            console.log('Fetched data:', JSON.stringify(data));
            this.offnetRelatedList = this.processData(data);
        } else if (error) {
            console.error('Error fetching offnet related list:', error);
            this.offnetRelatedList = [];
        }
    }

    processData(data) {
        try {
            return data.map(record => ({
                ...record,
                ofntName: record.Name,
                HrefLink: `https://everstream.lightning.force.com/${record.Id}`,
                lastMileCarrier: record.Off_Net_Vendor__r?.Name || 'N/A',
                vendorNNI: record.Vendor_NNI__r?.Name || 'N/A'
            }));
        } catch (error) {
            console.error('Error processing data:', error);
            return [];
        }
    }
}
