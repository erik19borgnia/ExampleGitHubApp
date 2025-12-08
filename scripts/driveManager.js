const CLIENT_ID = '253006367900-afh5cqbmqhuvse3n6grt0hch5tahinu7.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    console.log("GAPI "+gapiInited)
    console.log("GIS "+gisInited)
    if (gapiInited && gisInited) {
        document.getElementById("googleAuthorizeBtn").classList.remove("hidden")
        document.getElementById("googleAuthorizeBtn").addEventListener("click", () => handleAuthClick())
        document.getElementById("exportDriveBtn").classList.remove("hidden")
        document.getElementById("importDriveBtn").classList.remove("hidden")
    }
}

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    //console.log("Gapi 1")
    gapi.load('client', initializeGapiClient);
    //console.log("Gapi 2")
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    //console.log("Gapi 3")
    await gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
    });
    //console.log("Gapi 4")
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
        throw (resp);
        }
        document.getElementById('googleLogoutBtn').classList.remove("hidden")
        document.getElementById('googleAuthorizeBtn').innerText = 'Refresh';
        await listFiles();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({prompt: ''});
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('googleAuthorizeBtn').innerText = 'Login';
        document.getElementById('googleLogoutBtn').classList.add("hidden")
    }
}

/**
 * Print metadata for first 10 files.
 */
async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
        'pageSize': 10,
        'fields': 'files(id, name)',
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }
    const files = response.result.files;
    if (!files || files.length == 0) {
        document.getElementById('content').innerText = 'No files found.';
        return;
    }
    // Flatten to string to display
    const output = files.reduce(
        (str, file) => `${str}${file.name} (${file.id})\n`,
        'Files:\n');
    document.getElementById('content').innerText = output;
}


/*function gapiLoaded() {
    document.getElementById("exportBtnDrive").classList.remove("hidden")
    document.getElementById("importBtnDrive").classList.remove("hidden")
    document.getElementById("exportBtnDrive").addEventListener("click", () => exportToDrive())
    document.getElementById("importBtnDrive").addEventListener("click", () => importFromDrive())
    gapi.load('client', initializeGapiClient)   
}

async function initializeGapiClient() {
    try{
        await gapi.client.init({
            apiKey: 'AIzaSyD0J6RzL4kQHee5EOLAjNZROXj6wIeNCqs', // Optional, if using only OAuth
            clientId: '253006367900-afh5cqbmqhuvse3n6grt0hch5tahinu7.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive.file', // Read/Write only created files
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        })
        console.log("Init done")
        gapi.client.setApiKey('AIzaSyD0J6RzL4kQHee5EOLAjNZROXj6wIeNCqs') // If using an API key
        // Handle user sign-in/out
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus)
        updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get())
        console.log("Gapi initialized!")
    }catch(error){
        console.log("Sh*t")
        console.error(error)
    }
}

function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn()
}

function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut()
}*/

function exportToDrive(){
    console.log("Export!")
}

function importFromDrive(){
    console.log("Import!")
}