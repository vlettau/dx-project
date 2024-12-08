import { LightningElement, api, track, wire } from 'lwc';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getTrackedFields from '@salesforce/apex/FieldHistorySettingsController.getTrackedFields';


export default class TestComponent extends LightningElement {
    @api recordId;
    @api objectApiName;
    @track fieldsInfo = [];
    @track fieldSet = new Set();
    @track currentTrackedFields = [];
    @track hasSettingsRecord = false;
    @track configRecordId = '';
    @track isLoading = false;

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.fieldsInfo = Object.keys(data.fields).map(fieldName => {
                const field = data.fields[fieldName];
                return {
                    fieldName: field.apiName,
                    label: field.label,
                    isTracked: this.currentTrackedFields.includes(field.apiName),
                };
            });
            console.log('Fields Info:', this.fieldsInfo);
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    async connectedCallback() {
        this.isLoading = true;
        try {
            const trackedFields = await this.getTrackedFieldsLWC(this.objectApiName);
            this.currentTrackedFields = trackedFields;
            this.hasSettingsRecord = trackedFields.length > 0;
        } catch (error) {
            console.error('Error fetching tracked fields:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async getTrackedFieldsLWC(objectApiName) {
        try {
            const data = await getTrackedFields({ objectApiName });
            return data.length > 0 ? data[0]?.[TRACKED_FIELDS_DATA.fieldApiName] || [] : [];
        } catch (error) {
            console.error('Error fetching tracked fields:', error);
            return [];
        }
    }

    handleCheckboxChange(event) {
        const fieldName = event.target.dataset.id;
        const isTracked = event.target.checked;

        if (isTracked) {
            this.fieldSet.add(fieldName);
        } else {
            this.fieldSet.delete(fieldName);
        }

        console.log('Updated Field Set:', [...this.fieldSet]);
    }

    saveFieldHistorySettings(event) {
        event.preventDefault();
        this.isLoading = true;

        const mergedFields = [...this.fieldSet];
        const fields = {
            Object_API_Name__c: this.objectApiName,
            Tracked_Fields_Data__c: JSON.stringify(mergedFields),
        };

        if (this.hasSettingsRecord) {
            fields.Id = this.configRecordId;
            updateRecord({ fields })
                .then(() => this.showToast('Success', 'Settings updated successfully!', 'success'))
                .catch(error => this.showToast('Error', 'Failed to save settings.', 'error'))
                .finally(() => (this.isLoading = false));
        } else {
            createRecord({ apiName: 'Field_History_Setting__c', fields })
                .then(() => this.showToast('Success', 'Settings saved successfully!', 'success'))
                .catch(error => this.showToast('Error', 'Failed to save settings.', 'error'))
                .finally(() => (this.isLoading = false));
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}