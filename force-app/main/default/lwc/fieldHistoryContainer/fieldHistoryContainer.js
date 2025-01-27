import { LightningElement, api, track, wire } from 'lwc'
import getCurrentUserProfileName from '@salesforce/apex/FieldHistorySettingsController.getCurrentUserProfileName'

export default class FieldHistoryContainer extends LightningElement {
    @api recordId
    @api objectApiName
    @track isAdmin = false

    connectedCallback () {
        // Fetch the user's profile name
        getCurrentUserProfileName()
            .then( ( profileName ) => {
                // Check if the profile name contains "Administrator"
                this.isAdmin = profileName.includes( 'Administrator' )
                console.log( 'Profile Name:', profileName, 'isAdmin:', this.isAdmin )
            } )
            .catch( ( error ) => {
                console.error( 'Error fetching profile name:', error )
            } )
    }

}