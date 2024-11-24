import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class FieldHistorySettings extends LightningElement {
    @api recordId; // Dynamically receives the record ID
    objectApiName; // Holds the API name of the current record
    fieldsInfo = []; // Stores the fields information
    selectedFields = new Set(); // Tracks fields selected for tracking

    @wire(getRecord, { recordId: "$recordId" }) // Fetch record details
    wiredRecord({ data, error }) {
        
        if (data) {
            this.objectApiName = data.apiName; // Get object API name
        } else if (error) {
            console.error('Error fetching record:', error);
        }
    }

    @wire(getObjectInfo, { objectApiName: this.objectApiName }) // Fetch object metadata
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

    // Handle checkbox changes
    handleCheckboxChange(event) {
        const fieldId = event.target.dataset.id;
        if (event.target.checked) {
            this.selectedFields.add(fieldId);
        } else {
            this.selectedFields.delete(fieldId);
        }
        console.log('Selected fields:', Array.from(this.selectedFields));
    }

}