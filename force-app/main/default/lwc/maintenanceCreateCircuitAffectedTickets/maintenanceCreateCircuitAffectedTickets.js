import { LightningElement, api, wire, track } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import SERVICE_AFFECTING_CUSTOMER_LIST from '@salesforce/schema/Case.Customer_List__c'; //label: Service Affecting Cust List
import SUCCESSFULLY_FOUND_ID_LIST from '@salesforce/schema/Case.Successfully_Found_Circuit_Ids__c'; //label: Successfully Found Circuit Ids
import PARENT_ID from '@salesforce/schema/Case.Id';
import CASE_NUMBER from '@salesforce/schema/Case.CaseNumber';
import NON_SERVICE_AFFECTING_CUSTOMER_LIST from '@salesforce/schema/Case.Non_Service_Affecting_Cust_List__c'; //label: Non-Service Affecting Cust List
import FAILED_TO_FIND_ID_LIST from '@salesforce/schema/Case.Failed_to_Find_Circuit_Ids__c'; //label: Failed to Find Circuit Ids
import CHILD_CASE_CIRCUIT_IDS from '@salesforce/schema/Case.Child_Case_Circuit_Ids__c'; //label: Child Case Circuit Ids
import OUTAGE_CUSTOMER_LIST from '@salesforce/schema/Case.Outage_Customer_List__c'; //label: Outage Customer List
import { refreshApex } from '@salesforce/apex';
import closeChildCases from '@salesforce/apex/MaintenanceCreateCircuitTicketController.closeChildCases';
import createChildCases from '@salesforce/apex/MaintenanceCreateCircuitTicketController.createChildCases';
import findCircuitRecords from '@salesforce/apex/MaintenanceCreateCircuitTicketController.findCircuitRecords';
import getCurrentChildCases from '@salesforce/apex/MaintenanceCreateCircuitTicketController.getCurrentChildCases';
import getParentCase from '@salesforce/apex/MaintenanceCreateCircuitTicketController.getParentCaseRecord';
import reopenChildCases from '@salesforce/apex/MaintenanceCreateCircuitTicketController.reopenChildCases';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


const FIELDS = [
    SERVICE_AFFECTING_CUSTOMER_LIST,
    NON_SERVICE_AFFECTING_CUSTOMER_LIST,
    FAILED_TO_FIND_ID_LIST,
    SUCCESSFULLY_FOUND_ID_LIST,
    PARENT_ID,
    CASE_NUMBER,
	CHILD_CASE_CIRCUIT_IDS,
	OUTAGE_CUSTOMER_LIST
];

const SUCCESS_COLUMNS = [
    {label:'Circuit Id', fieldName:'circuitId', type: 'text'},
    {label:'Account Name', fieldName:'accountName', type: 'text'},
    {label:'Site Id', fieldName:'siteName', type: 'text'},
    {label:'Order Number', fieldName:'orderNumber', type: 'text'},
    {label:'Primary Product Family', fieldName:'productFamily', type: 'text'}
];
const FAILED_COLUMNS = [
    {label:'Circuit Id', fieldName:'circuitId', type: 'text'}, 
    {label:'When Found', fieldName:'when', type: 'text'},
	{label:'Reason', fieldName:'searchMessage', type: 'text'}
];
const CURRENT = 'Current';
const PREVIOUS = 'Previously';
const SERVICE = 'service';
const OUTAGE = 'outage';
const NONSERVICE = 'nonservice';

const CHILD_CASES_COLUMNS = [
    {label:'Case #', fieldName:'caseUrl', type: 'url', typeAttributes: { label: { fieldName: "caseNumber" }, target: "_blank" }},
    {label: 'Account Name', fieldName: 'accountName', type: 'text'},
    {label:'Status', fieldName:'status', type: 'text'},
    {label:'Service Affecting', fieldName:'serviceAffecting', type: 'text'},
	{label:'Email Sent', fieldName:'emailSent', type: 'text'}
];

export default class maintenanceCreateCircuitAffectedTickets extends LightningElement {
    @api recordId;
    successColumns = SUCCESS_COLUMNS;
    failedColumns = FAILED_COLUMNS;
    childCaseColumns = CHILD_CASES_COLUMNS;
    childCaseData = [];
    childCaseDataFromWire;
    loading = false;
	recordTypeName = '';
	showChildCaseEmail = false;
	showSearchBar = true;
	showSendEmailFlow = false;
	showMaintenanceLayout = false;
	showOutageLayout = false;

    //Parent Case Variables
    caseNumber;

    //Persisted Data Fields on Parent Record
    failedCircuitIdsOnRecordArray = [];
    successCircuitIdsOnRecordArray = [];
    serviceAffectingIdsOnRecordArray = [];
    nonServiceAffectingIdsOnRecordArray = [];
	childCaseCircuitIdsOnRecordArray = [];
	outageIdsOnRecordArray = [];

    //Circuit Id Search variables
    searchButtonDisabled = false;
    pastedListOfCircuitIds;
    circuitIdsToSendToApex = [];
    parsedCircuitIdList = [];
    circuitIdsInExistingCases = [];
	@track showExportButton = false;

    //Failed to Find Datatable variables
    currentMessage = CURRENT;
    previousMessage = PREVIOUS;
    @track failedCircuits = []; //array of the object to display in the failed circuits datatable
	notFoundObjectArray = [];
    selectedFailedIds = [];
    disableFailedRemoveButton = false;
    disableRetrySearchButton = false;
    showFailures = false;

    showChildCases = false;
    disableCloseCaseButton = false;
	disableReopenCaseButton = false;
	disableSendEmailButton = false;
    selectedChildCaseIds= [];
    selectedChildCaseIdsEmailQualified= [];
    selectedChildCaseRecords = [];
	selectedChildCasesIncludeServiceAffecting = false;
	casesClosedFromEmail = false;
    
    //Success Datatable variables
    @track successfulCircuits = []; //in sf
    @track showSuccesses = false;
    selectedSuccessfulIds = [];
    selectedSuccessfulObjects = [];
    disableServiceAffectingButton = false;
    disableNonServiceAffectingButton = false;
	disableAddToOutageButton = false;

	childCaseTableLabel = '';

    constructor(){
        super();
    }
    connectedCallback(){
        this.getParentRecord();
		this.showSendEmailFlow = true;
    }
    renderedCallback(){
    }
    disconnectedCallback(){
    }

    async getParentRecord() {
		try {
            const result = await getParentCase({ recordId: this.recordId, fields: FIELDS });
            let maintenanceRecord = result;
            let failedToFindIdsPersisted = maintenanceRecord[FAILED_TO_FIND_ID_LIST.fieldApiName];
            let serviceAffectingIds = maintenanceRecord[SERVICE_AFFECTING_CUSTOMER_LIST.fieldApiName];
            let nonServiceAffectingIds = maintenanceRecord[NON_SERVICE_AFFECTING_CUSTOMER_LIST.fieldApiName];
			let outageAffectingIds = maintenanceRecord[OUTAGE_CUSTOMER_LIST.fieldApiName];
            this.caseNumber = maintenanceRecord[CASE_NUMBER.fieldApiName];
			//this.recordTypeName = data.fields['RecordType']['value']['fields']['Name'].value;
			this.recordTypeName = maintenanceRecord.RecordType.Name;

			if (this.recordTypeName === 'Maintenance') {
				this.showMaintenanceLayout = true;
				this.showOutageLayout = false;
				this.childCaseTableLabel = "Child Maintenance Cases";
			} else if (this.recordTypeName === 'NOC Support Tickets') {
				this.showMaintenanceLayout = false;
				this.showOutageLayout = true;
				this.childCaseTableLabel = "Outage Related Cases";
			}

            if (serviceAffectingIds) {
                this.serviceAffectingIdsOnRecordArray = serviceAffectingIds.split(",");
            }
            if (nonServiceAffectingIds) {
                this.nonServiceAffectingIdsOnRecordArray = nonServiceAffectingIds.split(",");
            }
			if (outageAffectingIds) {
				this.outageIdsOnRecordArray = outageAffectingIds.split(",");
			}

            if (failedToFindIdsPersisted) {
				let failedIdArray = JSON.parse(failedToFindIdsPersisted);
				const arrayOfObjects = Array.isArray(failedIdArray) ? failedIdArray : [failedIdArray];

                for (let i = 0; i < arrayOfObjects.length; i++) {
					let recordAsObject = arrayOfObjects[i];
					let failedIdObject = {
                        circuitId: recordAsObject.circuitId,
                        when: this.previousMessage,
						searchMessage: recordAsObject.message
                    };
					this.notFoundObjectArray.push(recordAsObject);
                    this.failedCircuits.push(failedIdObject);
					this.failedCircuitIdsOnRecordArray.push(recordAsObject.circuitId);
                    this.showFailures = true;
					this.showExportButton = true;
                }
            }

            let successfullyFoundIdsPersisted = maintenanceRecord[SUCCESSFULLY_FOUND_ID_LIST.fieldApiName];
            if (successfullyFoundIdsPersisted) {
                this.successCircuitIdsOnRecordArray = successfullyFoundIdsPersisted.split(",");
                this.processPersistedCircuitIds();
            }

			let childCaseCircuitIdsOnRecordArrayPersisted = maintenanceRecord[CHILD_CASE_CIRCUIT_IDS.fieldApiName];
			if (childCaseCircuitIdsOnRecordArrayPersisted) {
				this.childCaseCircuitIdsOnRecordArray = childCaseCircuitIdsOnRecordArrayPersisted.split(",");
			}
        } catch (error) {
            this.handleError(error);
        }
    }

    async processPersistedCircuitIds() {
        try {
            const results = await findCircuitRecords({
                maintenanceId: this.recordId,
                recordIdentifiers: this.successCircuitIdsOnRecordArray
            });
            for(let i = 0; i < results.length; i++){
                let circuit = results[i];
                if(circuit.circuitFound){
                    this.successfulCircuits.push(circuit);
                    this.showSuccesses = true;
					this.showExportButton = true;
                } else {
                    let indexOfBadId = this.successCircuitIdsOnRecordArray.indexOf(circuit.circuitId);
                    this.successCircuitIdsOnRecordArray.splice(indexOfBadId, 1);
                }
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    @wire(getCurrentChildCases, { parentId: '$recordId'})
    wiredChildCases( result ) {
        if (result.data) {
            this.childCaseDataFromWire = result;
            const casesArray = result.data;
            this.childCaseData = [];
            let childCasesToDisplay = [];
            for (let i = 0; i < casesArray.length; i++) {
				childCasesToDisplay.push(casesArray[i]);
				this.showChildCases = true;
            }
            this.childCaseData = [...childCasesToDisplay];
            this.successfulCircuits = [...this.successfulCircuits];
        } else if (result.error) {
            this.handleError(result.error);
        }
    }

    handlePastedIds(event){
        this.parsedCircuitIdList = [];
        this.pastedListOfCircuitIds = event.target.value;
        //'\r' looks for a CARRIAGE RETURN character
        //'?' indicates an optional token, meaning an OR operation
        //'\n' looks for a LINE FEED (new line) character
        let entryArray = this.pastedListOfCircuitIds.split(/\r?\n/);
        for(let i = 0; i < entryArray.length; i++) {
            let stringToEdit = entryArray[i];
            if (stringToEdit.length > 0) {
                this.parsedCircuitIdList.push(stringToEdit.trim());
            }
        }
    }

    handleClear() {
        this.pastedListOfCircuitIds = '';
    }

    async handleSearch() {
        this.updateButtonDisablements();
        const uniqueSet = new Set(this.parsedCircuitIdList);
        this.parsedCircuitIdList = [...uniqueSet];
        const inputList = this.parsedCircuitIdList;
        this.pastedListOfCircuitIds = '';
        this.circuitIdsToSendToApex = [];
        for(let i = 0; i < inputList.length; i++){
            //Don't pass circuit ids to search if they are already included in a child case attached to this parent case. It's repetative
            if (!this.childCaseCircuitIdsOnRecordArray.includes(inputList[i]) && !this.successCircuitIdsOnRecordArray.includes(inputList[i])) {
                this.circuitIdsToSendToApex.push(inputList[i]);
            }
        }
        try {
			if (this.circuitIdsToSendToApex.length > 0) {
				const results = await findCircuitRecords({
                    maintenanceId: this.recordId,
                    recordIdentifiers: this.circuitIdsToSendToApex
                });
                this.processSearchResults(results);
            } else {
                this.updateButtonDisablements();
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    processSearchResults(results) {
		for(let i = 0; i < results.length; i++){
            let circuit = results[i];
            if(circuit.circuitFound){
                if (!this.successCircuitIdsOnRecordArray.includes(circuit.circuitId)) {
                    this.successfulCircuits.push(circuit);
                    this.successCircuitIdsOnRecordArray.push(circuit.circuitId);
                    this.showSuccesses = true;
					this.showExportButton = true;
                }
            } else {
				if (!this.failedCircuitIdsOnRecordArray.includes(circuit.circuitId)) {
                    let failedIdObject = {
                        circuitId: circuit.circuitId,
                        when: this.currentMessage,
						searchMessage: circuit.searchMessage
                    };
					let failedObject = {
						circuitId: circuit.circuitId,
						message: circuit.searchMessage
					};
					this.notFoundObjectArray.push(failedObject);
                    this.failedCircuits.push(failedIdObject);
                    this.failedCircuitIdsOnRecordArray.push(circuit.circuitId);
                    this.showFailures = true;
					this.showExportButton = true;
                }
            }
        }
        this.successfulCircuits = [...this.successfulCircuits];
        this.failedCircuits = [...this.failedCircuits];

        //Prepare to save results to Parent Case record
        const FIELDS = {};
        FIELDS[PARENT_ID.fieldApiName] = this.recordId;
        FIELDS[FAILED_TO_FIND_ID_LIST.fieldApiName] = JSON.stringify(this.notFoundObjectArray);
        FIELDS[SUCCESSFULLY_FOUND_ID_LIST.fieldApiName] = this.successCircuitIdsOnRecordArray.join();
        this.updateParentRecord(FIELDS);
    }

    async updateParentRecord(FIELDS) {
        const recordInput = {fields: FIELDS};
        try {
            const result = await updateRecord(recordInput);
            const toastEvent = new ShowToastEvent({
                title: 'Success!',
                message: 'The Parent Case record has been updated.',
                variant: 'success'
            });
            this.dispatchEvent(toastEvent);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.updateButtonDisablements();
        }
    }

    updateButtonDisablements() {
        this.searchButtonDisabled = !this.searchButtonDisabled;
        this.disableFailedRemoveButton = !this.disableFailedRemoveButton;
        this.disableServiceAffectingButton = !this.disableServiceAffectingButton;
        this.disableNonServiceAffectingButton = !this.disableNonServiceAffectingButton;
        this.disableCloseCaseButton = !this.disableCloseCaseButton;
		this.disableReopenCaseButton = !this.disableReopenCaseButton;
        this.disableRetrySearchButton = !this.disableRetrySearchButton;
		this.disableSendEmailButton = !this.disableSendEmailButton;
		this.disableAddToOutageButton = !this.disableAddToOutageButton;
        this.loading = !this.loading;
    }

    handleFailedRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        this.selectedFailedIds = [];
        if (selectedRows.length > 0) {
            for (let i = 0; i < selectedRows.length; i++) {
                this.selectedFailedIds.push(selectedRows[i].circuitId);
            }
        }
    }

    handleFailedRemoval() {
        this.updateButtonDisablements();
        this.removeSelectedCircuitIds(this.selectedFailedIds);
    }

    removeSelectedCircuitIds(failedIds) {
        let failedIdsArray = failedIds;
        const difference = this.notFoundObjectArray.filter(x => !failedIdsArray.includes(x.circuitId));
		this.notFoundObjectArray = [...difference];
		let currentFailedCircuits = this.failedCircuits;
        let filteredFailedCircuits = currentFailedCircuits.filter(x => !failedIdsArray.includes(x.circuitId));
        this.failedCircuits = [...filteredFailedCircuits];
		let failedIdsOnRecord = this.failedCircuitIdsOnRecordArray;
		let filterRemainedOnRecord = failedIdsOnRecord.filter(x => !failedIdsArray.includes(x));
		this.failedCircuitIdsOnRecordArray = [...filterRemainedOnRecord];

        if( !this.failedCircuits.length ) {
            this.showFailures = false;
        }
        
        //Prepare to save results to Parent Case record
        const FIELDS = {};
        FIELDS[PARENT_ID.fieldApiName] = this.recordId;
        FIELDS[FAILED_TO_FIND_ID_LIST.fieldApiName] = JSON.stringify(difference);
		FIELDS[SUCCESSFULLY_FOUND_ID_LIST.fieldApiName] = this.successCircuitIdsOnRecordArray.join();
        this.updateParentRecord(FIELDS);
		//this.updateButtonDisablements();
    }

    async handleSearchRetryForFailedIds() {
        this.updateButtonDisablements();
        try {
            const results = await findCircuitRecords({
                maintenanceId: this.recordId,
                recordIdentifiers: this.selectedFailedIds
            });
            let showMessage = true;
            let circuitIdsToRemoveFromFailure = [];
            for(let i = 0; i < results.length; i++){
                let circuit = results[i];
                if(circuit.circuitFound){
                    this.successfulCircuits.push(circuit);
                    circuitIdsToRemoveFromFailure.push(circuit.circuitId);
					this.successCircuitIdsOnRecordArray.push(circuit.circuitId);
                    showMessage = false;
                }
            }
            if (showMessage) {
                let table = this.template.querySelector("div.failureTable lightning-datatable");
                table.selectedRows = [];
                const toastEvent = new ShowToastEvent({
                    title: 'Nothing New Here...',
                    message: 'The selected circuit ids still weren\'t found.'
                });
                this.dispatchEvent(toastEvent);
				this.updateButtonDisablements();
            } else {
                let table = this.template.querySelector("div.failureTable lightning-datatable");
                table.selectedRows = [];
				this.successfulCircuits = [...this.successfulCircuits];
				this.showSuccesses = true;
				this.selectedFailedIds = [];
				this.removeSelectedCircuitIds(circuitIdsToRemoveFromFailure);
            }
        } catch (error) {
            this.handleError(error);
			this.updateButtonDisablements();
        }
    }

    async handleCopyToClipboard(event) {
        try {
            let textToCopy = '';
			let textCopied = false;

        	//copy failed
            if(event.currentTarget.dataset.type == 'failed') {
                if (this.selectedFailedIds.length > 0) {
					textCopied = true;
				}
				textToCopy = this.selectedFailedIds.join(',');
            //copy success
            } else {
				if (this.selectedSuccessfulIds.length > 0) {
					textCopied = true;
				}
                textToCopy = this.selectedSuccessfulIds.join(',');
            }

            if (navigator.clipboard && window.isSecureContext && textCopied) {
                await navigator.clipboard.writeText(textToCopy);
                const toastEvent = new ShowToastEvent({
                    title: 'Successfully Copied',
                    message: 'Circuit IDs have been copied to the clipboard',
                    variant: 'success'
                });
                this.dispatchEvent(toastEvent);
            } else if (textCopied === false) {
				const toastEvent = new ShowToastEvent({
                    title: 'Nothing to Copy',
                    message: 'No IDS were selected to copy.',
                    variant: 'info'
                });
                this.dispatchEvent(toastEvent);
			} else {
                const toastEvent = new ShowToastEvent({
                    title: 'Clipboard isn\'t working. Here are your IDs.',
                    message: textToCopy,
                    variant: 'success',
                    mode: 'sticky'
                });
                this.dispatchEvent(toastEvent);
            }
          } catch (err) {
            console.log('the following error occurred copying circuit ids');
            console.log(err);
          }
    }

    handleSuccessRowSelection(event){
        const selectedRows = event.detail.selectedRows;
        this.selectedSuccessfulIds = [];
        this.selectedSuccessfulObjects = [];
        if (selectedRows.length > 0) {
            for (let i = 0; i < selectedRows.length; i++) {
                this.selectedSuccessfulIds.push(selectedRows[i].circuitId);
                this.selectedSuccessfulObjects.push(selectedRows[i]); 
            }
        }
    }

    async handleAddButtons(event){
        this.updateButtonDisablements();
        let dataIdClicked = event.currentTarget.dataset.id;
        let isServiceAffecting = dataIdClicked === SERVICE;
        let inputWrappersForApex = [];
        let circuitIdsBeingProcessed = [];
		for(let i = 0; i < this.selectedSuccessfulObjects.length; i++){
			let inputToApex = {
				accountId: this.selectedSuccessfulObjects[i].accountId,
				circuitId: this.selectedSuccessfulObjects[i].circuitId,
				orderNumber: this.selectedSuccessfulObjects[i].orderNumber,
				serviceAffecting: isServiceAffecting,
				serviceOrderId: this.selectedSuccessfulObjects[i].serviceOrderId,
				parentCaseNumber: this.caseNumber
			}
			inputWrappersForApex.push(inputToApex);
			circuitIdsBeingProcessed.push(inputToApex.circuitId);
		};

        let result = await this.createChildCases(inputWrappersForApex);
        if (result) {
            for (let id in circuitIdsBeingProcessed) {
                if (dataIdClicked === SERVICE && !this.serviceAffectingIdsOnRecordArray.includes(circuitIdsBeingProcessed[id])) {
                    this.serviceAffectingIdsOnRecordArray.push(circuitIdsBeingProcessed[id]);
                } else if (dataIdClicked === NONSERVICE && !this.nonServiceAffectingIdsOnRecordArray.includes(circuitIdsBeingProcessed[id])) {
                    this.nonServiceAffectingIdsOnRecordArray.push(circuitIdsBeingProcessed[id]);
                } else if (dataIdClicked === OUTAGE && !this.outageIdsOnRecordArray.includes(circuitIdsBeingProcessed[id])) {
					this.outageIdsOnRecordArray.push(circuitIdsBeingProcessed[id])
				}
                this.successCircuitIdsOnRecordArray.splice(this.successCircuitIdsOnRecordArray.indexOf(circuitIdsBeingProcessed[id]), 1);
            }
			this.childCaseCircuitIdsOnRecordArray.push(...circuitIdsBeingProcessed);

            const FIELDS = {};
            FIELDS[PARENT_ID.fieldApiName] = this.recordId;
            FIELDS[SUCCESSFULLY_FOUND_ID_LIST.fieldApiName] = this.successCircuitIdsOnRecordArray.join();
            FIELDS[CHILD_CASE_CIRCUIT_IDS.fieldApiName] = this.childCaseCircuitIdsOnRecordArray.join();

            if (dataIdClicked === SERVICE) {
                FIELDS[SERVICE_AFFECTING_CUSTOMER_LIST.fieldApiName] = this.serviceAffectingIdsOnRecordArray.join();
            } else if (dataIdClicked === NONSERVICE) {
                FIELDS[NON_SERVICE_AFFECTING_CUSTOMER_LIST.fieldApiName] = this.nonServiceAffectingIdsOnRecordArray.join();
            } else if (dataIdClicked === OUTAGE) {
				FIELDS[OUTAGE_CUSTOMER_LIST.fieldApiName] = this.outageIdsOnRecordArray.join();
			}
            await this.updateParentRecord(FIELDS);

            for(let i = 0; i < this.selectedSuccessfulObjects.length; i++){
                let tempObject = this.selectedSuccessfulObjects[i];
                let foundIndex = this.successfulCircuits.findIndex(a => a.circuitId === tempObject.circuitId);
                this.successfulCircuits.splice(foundIndex, 1);
            };
            this.selectedSuccessfulObjects = [];
            this.selectedSuccessfulIds = [];
            this.successfulCircuits = [...this.successfulCircuits];
            if (this.successfulCircuits.length < 1) {
                this.showSuccesses = false;
            }
            let caseType = dataIdClicked === SERVICE ? 'Service Affecting' : dataIdClicked === NONSERVICE ? 'Non-service Affecting' : 'Outage';
            const toastEvent = new ShowToastEvent({
                title: 'Success',
                message: 'Successfully created ' + caseType + ' record(s)!',
                variant: 'success'
            });
            this.dispatchEvent(toastEvent);
        } else {
            this.updateButtonDisablements();
        }
    }

    handleChildCaseRowSelection(event){
        const selectedRows = event.detail.selectedRows;
        this.selectedChildCaseIds = [];
		this.selectedChildCaseIdsEmailQualified = [];
        this.selectedChildCaseRecords = [];
		this.selectedChildCasesIncludeServiceAffecting = false;
        if (selectedRows.length > 0) {
            for (let i = 0; i < selectedRows.length; i++) {
                this.selectedChildCaseIds.push(selectedRows[i].caseId);
                this.selectedChildCaseRecords.push(selectedRows[i]);
				if (selectedRows[i].serviceAffecting === 'Yes') {
					this.selectedChildCasesIncludeServiceAffecting = true;
				}

				//if (selectedRows[i].emailSent === 'No') {
					this.selectedChildCaseIdsEmailQualified.push(selectedRows[i].caseId);
				//}
            }
        }
    }

    async handleCloseCase() {
        this.updateButtonDisablements();
        let caseIdsForApex = [];
		const closedFromEmail = this.casesClosedFromEmail;
        for(let i = 0; i < this.selectedChildCaseIds.length; i++) {
            caseIdsForApex.push(this.selectedChildCaseIds[i]);
        }
        if (caseIdsForApex.length > 0) {
            try {
                await closeChildCases({ caseRecordIds: caseIdsForApex, closedFromSentEmail: closedFromEmail });
                refreshApex(this.childCaseDataFromWire)
                    .then(() => { 
                        this.updateButtonDisablements();
                        let table = this.template.querySelector("div.childCaseTable lightning-datatable");
                        table.selectedRows = [];
                        const toastEvent = new ShowToastEvent({
                            title: 'Success!',
                            message: 'The selected cases have been closed.',
                            variant: 'success'
                        });
                        this.dispatchEvent(toastEvent);
                    })
                    .catch(() => {
                        console.log('refresh failed');
                        this.updateButtonDisablements();
                    });
                this.selectedChildCaseIds = [];
                this.selectedChildCaseRecords = [];
				this.casesClosedFromEmail = false;
            } catch (error) {
                this.handleError(error);
                this.updateButtonDisablements();
				this.casesClosedFromEmail = false;
            }
        }
    }

    async createChildCases(inputWrappersForApex) {
        let inputWrappers = inputWrappersForApex;
        try {
            const result = await createChildCases({ parentId: this.recordId, records: JSON.stringify(inputWrappers), parentRecordType: this.recordTypeName });
			if (result.success === true) {
            	refreshApex(this.childCaseDataFromWire);
            	return true;
			} else if (result.overlapExists === true){
				const toastEvent = new ShowToastEvent({
					title: 'Service/Non-Service Conflict',
					message: result.message,
					variant: 'warning',
					mode: 'sticky'
				});
				this.dispatchEvent(toastEvent);
				let textToCopy = result.overlappingCircuitIds.join(',');
				if (navigator.clipboard && window.isSecureContext) {
					await navigator.clipboard.writeText(textToCopy);
				} else {
					const copyToastEvent = new ShowToastEvent({
						title: 'Clipboard isn\'t working. Here are your IDs.',
						message: textToCopy,
						variant: 'success',
						mode: 'sticky'
					});
					this.dispatchEvent(copyToastEvent);
				}
				return false;
			} else {
				return false;
			}
        } catch (error) {
            this.handleError(error);
            return false;
        }
    }

	async handleReopenCase() {
        this.updateButtonDisablements();
        let caseIdsForApex = [];
        for(let i = 0; i < this.selectedChildCaseIds.length; i++) {
            caseIdsForApex.push(this.selectedChildCaseIds[i]);
        }
        if (caseIdsForApex.length > 0) {
            try {
                await reopenChildCases({ caseRecordIds: caseIdsForApex });
                refreshApex(this.childCaseDataFromWire)
                    .then(() => { 
                        this.updateButtonDisablements();
                        let table = this.template.querySelector("div.childCaseTable lightning-datatable");
                        table.selectedRows = [];
                        const toastEvent = new ShowToastEvent({
                            title: 'Success!',
                            message: 'The selected cases have been reopended.',
                            variant: 'success'
                        });
                        this.dispatchEvent(toastEvent);
                    })
                    .catch(() => {
                        console.log('refresh failed');
                        this.updateButtonDisablements();
                    });
                this.selectedChildCaseIds = [];
                this.selectedChildCaseRecords = [];
            } catch (error) {
                this.handleError(error);
                this.updateButtonDisablements();
            }
        }
    }

	handleSendEmail() {
		const childCasesSelected = this.selectedChildCaseIdsEmailQualified.length > 0 ? true : false;
		if (childCasesSelected) {
			this.showSearchBar = false;
			this.showFailures = false;
			this.showSuccesses = false;
			this.showChildCases = false;
			this.showChildCaseEmail = true;
			window.scrollTo({
				top: 0,
				behavior: 'smooth' // This creates a smooth scrolling effect
			});
		} else {
			const toastEvent = new ShowToastEvent({
				title: 'Must Select Child Case',
				message: 'You must select a child case, and that child case must not have been sent an email, to be able to send the email.',
				variant: 'warning'
			});
			this.dispatchEvent(toastEvent);
		}
	}

	handleFlowStatusChange(event) {
		if (event.detail.status === 'FINISHED' || event.detail.status === 'ERROR') {
			const outputVariables = event.detail.outputVariables;
			
			if (outputVariables) {
				this.selectedChildCaseIdsEmailQualified = [];
				this.showChildCaseEmail = false;
				this.showSearchBar = true;
				this.showFailures = true;
				this.showSuccesses = true;
				this.showChildCases = true;

				for (let i = 0; i < outputVariables.length; i++) {
					const outputVar = outputVariables[i];
					if (outputVar.name == "V_CloseCase" && outputVar.value == true) {
						this.casesClosedFromEmail = true;
						this.handleCloseCase();
					} 
				}
			}
		}
	}

	handleExport() {
		let fileText = 'Found Circuit Ids:\n';
		fileText += this.successCircuitIdsOnRecordArray.join();
		fileText += '\n\n';
		fileText += 'Failed to Find Circuit Ids:\n';
		fileText += this.failedCircuitIdsOnRecordArray;

		var element = 'data:text/plain,' + encodeURIComponent(fileText);
		let downloadElement = document.createElement('a');
        downloadElement.href = element;
        downloadElement.target = '_self';
		downloadElement.download = 'Exported_Circuit_Ids.txt';
        document.body.appendChild(downloadElement);
        downloadElement.click();
	}

    handleError(error) {
        console.log(JSON.stringify(error));
        const toastEvent = new ShowToastEvent({
            title: 'Oops!',
            message: error.body.message,
            variant: 'error',
            mode: 'sticky'
        });
        this.dispatchEvent(toastEvent);
    }

	get sendEmailInputs() {
		const recordId = this.recordId;
		const childCaseIds = this.selectedChildCaseIdsEmailQualified;
		const serviceIncluded = this.selectedChildCasesIncludeServiceAffecting;
		const parentRecordType = this.recordTypeName;

		return [
			{
				name: 'recordId',
				type: 'String',
				value: recordId
			},
			{
				name: 'V_ChildCaseIds',
				type: 'String',
				value: childCaseIds
			},
			{
				name: 'V_ShowOutage',
				type: 'Boolean',
				value: serviceIncluded
			},
			{
				name: 'V_ParentRecordType',
				type: 'String',
				value: parentRecordType
			}
		]
	}
}