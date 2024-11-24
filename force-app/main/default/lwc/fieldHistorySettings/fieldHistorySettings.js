import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class FieldHistorySettings extends LightningElement {
    objectApiName; // Holds the API name of the current record
    objectLabel;
    fieldsInfo = []; // Stores the fields information

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.objectLabel = data.label; // Get object label
            console.log('Object Label:', this.objectLabel);
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    @wire(getObjectInfo, { objectApiName: '$objectApiName' }) // Fetch object metadata
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.fieldsInfo = [];
            const fields = data.fields;

            // Process and store field metadata
            for (const fieldName in fields) {
                if (fields.hasOwnProperty(fieldName)) {
                    const field = fields[fieldName];
                    this.fieldsInfo.push({
                        fieldName: fieldName,
                        label: field.label,
                        dataType: field.dataType,
                        isCreateable: field.createable,
                        isRequired: !field.nillable,
                    });
                }
            }
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }
}