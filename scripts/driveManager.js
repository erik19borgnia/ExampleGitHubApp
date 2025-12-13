const CLIENT_ID = '253006367900-afh5cqbmqhuvse3n6grt0hch5tahinu7.apps.googleusercontent.com'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const projectsFolderName = "WebSim Projects"
const folderMimeType = "application/vnd.google-apps.folder"
const projectMimeType = "application/json"
const googleUploadAPI = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true"
let tokenClient
let gapiInited = false
let gisInited = false
let pickerInited = false

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    //console.log("GAPI "+gapiInited)
    //console.log("GIS "+gisInited)
    if (gapiInited && gisInited) {
        document.getElementById("googleAuthorizeBtn").classList.remove("hidden")
        document.getElementById("googleAuthorizeBtn").disabled = false
        document.getElementById("googleAuthorizeBtn").addEventListener("click", () => handleAuthClick())
        document.getElementById("googleLogoutBtn").addEventListener("click", () => handleSignoutClick())
    }
}

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    //console.log("Gapi 1")
    gapi.load('client', initializeGapiClient);
    //console.log("Gapi 2")
    gapi.load('picker', onPickerApiLoad);
}

function onPickerApiLoad() {
    pickerInited = true;
}
// Create and render a Google Picker object for selecting from Drive.
function createPicker() {
    let accessToken = null;
    const showPicker = () => {
        const picker = new google.picker.PickerBuilder()
            .addView(google.picker.ViewId.DOCS)
            .setOAuthToken(accessToken)
            .setCallback(pickerCallback)
            .setAppId(CLIENT_ID)
            .build();
        picker.setVisible(true);
    }

    // Request an access token.
    tokenClient.callback = async (response) => {
    if (response.error !== undefined) {
        throw (response);
    }
    accessToken = response.access_token;
    showPicker();
    };

    if (accessToken === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
    }
}
// A callback implementation.
function pickerCallback(data) {
    let url = ""
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        const doc = data[google.picker.Response.DOCUMENTS][0]
        url = doc[google.picker.Document.URL]
    }
    const message = `You picked: ${url}`
    console.log(message)
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
    let credentials = localStorage.getItem('googleCredentials');
    if (credentials) {
      credentials = JSON.parse(credentials);
      gapi.client.setToken(credentials);
      loggedIn();
    }
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
        localStorage.setItem('googleCredentials', JSON.stringify(resp));
        loggedIn();
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

function loggedIn(){
    document.getElementById("exportDriveBtn").classList.remove("hidden")
    document.getElementById("exportDriveBtn").disabled = false
    document.getElementById("importDriveBtn").classList.remove("hidden")
    document.getElementById("importDriveBtn").disabled = false
    document.getElementById('googleLogoutBtn').classList.remove("hidden")
    document.getElementById("googleLogoutBtn").disabled = false
    document.getElementById('googleAuthorizeBtn').classList.add("hidden")
    document.getElementById("googleAuthorizeBtn").disabled = true
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('googleCredentials')
        //document.getElementById('content').innerText = '';
        document.getElementById('googleAuthorizeBtn').classList.remove("hidden")
        document.getElementById("googleAuthorizeBtn").disabled = false
        document.getElementById('googleLogoutBtn').classList.add("hidden")
        document.getElementById("googleLogoutBtn").disabled = true
        document.getElementById("exportDriveBtn").classList.add("hidden")
        document.getElementById("exportDriveBtn").disabled = true
        document.getElementById("importDriveBtn").classList.add("hidden")
        document.getElementById("importDriveBtn").disabled = true
    }
}

/**
 * Print metadata for loadable files
 * TO DO
 */
async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
        'pageSize': 10,
        "fields": "files(id, name, mimeType)",
        });
    } catch (err) {
        console.log(err.message)
        //document.getElementById('content').innerText = err.message;
        return;
    }
    const files = response.result.files;
    console.log(files)
    if (!files || files.length == 0) {
        console.log('No files found.')
        //document.getElementById('content').innerText = 'No files found.';
        return;
    }
    // Flatten to string to display
    const output = files.reduce(
        (str, file) => `${str}${file.name} (${file.id})\n`,
        'Files:\n');
    //document.getElementById('content').innerText = output;
    console.log(output)
    return output
}

async function exportDiagramToDrive(diagram){
    if (gapi.client.getToken() !== null)
    {
        const diagramData = JSON.stringify(diagram)
        const folderID = await getProjectsFolderID()
        const file = new Blob([diagramData], {type: "text/plain"});
        const diagramName = diagram.name+".wsd"
        const metadata = {
            "name": diagramName,
            "mimeType": projectMimeType,
            "parents": [folderID], // Google Drive folder id
        };
        const accessToken = gapi.auth.getToken().access_token;
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);
        fetch(googleUploadAPI, {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form,
        }).then((res) => {
            return res.json();
        }).then(function(val) {
            console.log(val);
        });
    }else{
        console.error("Not logged in!")
    }
}

async function importDiagramFromDrive(fileId){
    if (gapi.client.getToken() !== null)
    {
        
        const file = await gapi.client.drive.files.get({
        //    "fileId": fileId,
            "fileId": "1YHRxXRU3dVdMIsgTLbEtxiftehpVYJkQ",
            "alt": "media",}) 

        if (file.status !== 200)
            throw Error("File doesn't exist")
        console.log("Imported diagram ID "+fileId)
        return JSON.parse(file.body)
        
    }else{
        console.error("Not logged in!")
    }
}

/**
 * Gets the ID of the Projects Folder. If it wasn't created, it creates it and returns the created folder ID.
 * @returns String ID of the Projects folder
 */
async function getProjectsFolderID(){
    const list = await gapi.client.drive.files.list({
        "fields": "files(id, name, mimeType)",
        });
    let i = 0
    const files = list.result.files;
    while (i<files.length && !(files[i].mimeType===folderMimeType && files[i].name===projectsFolderName)){
        i++
    }
    let folderID;
    if (i<files.length){
        folderID = files[i].id
    }
    else{
        //Create the projects folder
        response = await gapi.client.drive.files.create({
            "name": projectsFolderName,
            "mimeType" : folderMimeType,
        }).then(function(response){
            folderID = response.result.id
        })
    }
    return folderID
}