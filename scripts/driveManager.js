function gapiLoaded() {
    document.getElementById("exportBtnDrive").classList.remove("hidden")
    document.getElementById("importBtnDrive").classList.remove("hidden")
    document.getElementById("exportBtnDrive").addEventListener("click", () => exportToDrive())
    document.getElementById("importBtnDrive").addEventListener("click", () => importFromDrive())
    try{
        gapi.load('client:auth2', initializeGapiClient)
    }catch(error){
        console.log(error)
    }
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: 'AIzaSyD0J6RzL4kQHee5EOLAjNZROXj6wIeNCqs', // Optional, if using only OAuth
        clientId: '253006367900-afh5cqbmqhuvse3n6grt0hch5tahinu7.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive', // Or more specific scopes like drive.file
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapi.client.setApiKey('AIzaSyD0J6RzL4kQHee5EOLAjNZROXj6wIeNCqs'); // If using an API key
    // Handle user sign-in/out
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
    updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
}

function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
}

function exportToDrive(){
    console.log("Export!")
    handleAuthClick()
}

function importFromDrive(){
    console.log("Import!")
}