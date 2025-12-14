const CLIENT_ID = "253006367900-afh5cqbmqhuvse3n6grt0hch5tahinu7.apps.googleusercontent.com"
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
const SCOPES = "https://www.googleapis.com/auth/drive.file"
const projectsFolderName = "WebSim Projects"
const folderMimeType = "application/vnd.google-apps.folder"
const projectExtension = "wsd"
const projectMimeType = "application/websim.diagram"
const defaultMimeType = "application/octet-stream"
const googleUploadAPI = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true"
const COOKIE_EXPIRATION_DAYS = 15
const COOKIE_NAME = "googleCredentials"
let clientInited = false
let gisInited = false
let pickerInited = false
let tokenClient = null
let refreshTokenTime = null

//
// LOADING FUNCTIONS
//
/**
 * After api.js is loaded, load the APIs
 */
function gapiLoaded() {
    gapi.load("client", initializeGapiClient)
    gapi.load("picker", onPickerApiLoad)
}
/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    //Initialize GAPI client
    await gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
    })
    clientInited = true
    postInitialization()
}
/**
 * Callback after the Picker API is loaded
 */
function onPickerApiLoad() {
    pickerInited = true
}
/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient =  google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: "", // defined later
    });
    gisInited = true;
    postInitialization();
}

//
// AFTER LOADING FUNCTIONS
//
/**
 * Enables user interaction after GAPI and GIS are loaded. If any of those failed, it's not possible to connect to Google API services
 */
function postInitialization() {
    if (clientInited && gisInited) {
        document.getElementById("googleAuthorizeBtn").classList.remove("hidden")
        document.getElementById("googleAuthorizeBtn").disabled = false
        document.getElementById("googleAuthorizeBtn").addEventListener("click", () => handleAuthToken())
        document.getElementById("googleLogoutBtn").addEventListener("click", () => handleSignout())
        restoreCredentials()
    }
}
/**
 * Restores credentials saved, if there are.
 * There are stored in a cookie, with a 
 */
function restoreCredentials(){
    //Get stored credentials if they exist
    let cookies = document.cookie.split(";")
    let i = 0
    while (i < cookies.length && !cookies[i].startsWith(COOKIE_NAME+"="))
        i++
    if (i < cookies.length) {
      let storedCredentials = cookies[i].substring(cookies[i].indexOf("=")+1)
      //In 2 lines just for clarity
      storedCredentials = JSON.parse(storedCredentials)
      gapi.client.setToken(storedCredentials[0])
      refreshTokenTime = storedCredentials[1]
      //Extend the lifetime of the cookie
      updateCookie()
      enableButtons()
    }
}
/**
 * Enable buttons for import and export
 */
function enableButtons(){
    document.getElementById("googleAuthorizeBtn").classList.add("hidden")
    document.getElementById("googleAuthorizeBtn").disabled = true
    document.getElementById("exportDriveBtn").classList.remove("hidden")
    document.getElementById("exportDriveBtn").disabled = false
    document.getElementById("importDriveBtn").classList.remove("hidden")
    document.getElementById("importDriveBtn").disabled = false
    document.getElementById("googleLogoutBtn").classList.remove("hidden")
    document.getElementById("googleLogoutBtn").disabled = false
}
/**
 * Disable buttons for import and export
 */
function disableButtons(){
    document.getElementById("googleAuthorizeBtn").classList.remove("hidden")
    document.getElementById("googleAuthorizeBtn").disabled = false
    document.getElementById("exportDriveBtn").classList.add("hidden")
    document.getElementById("exportDriveBtn").disabled = true
    document.getElementById("importDriveBtn").classList.add("hidden")
    document.getElementById("importDriveBtn").disabled = true
    document.getElementById("googleLogoutBtn").classList.add("hidden")
    document.getElementById("googleLogoutBtn").disabled = true
}
/**
 * Update the cookie to extends it's lifetime
 */
function updateCookie(){
    const credentials = [gapi.client.getToken(), refreshTokenTime]
    // Save credentials in cookie
    const expireCookie = "expires="+ new Date(Date.now() + COOKIE_EXPIRATION_DAYS*24*60*60*1000).toUTCString() + ";"
    document.cookie = COOKIE_NAME+"="+JSON.stringify(credentials)+"; " + expireCookie
}

//
// AUTHORIZATION FUNCTIONS
//
/**
 *  Sign in the user/Refreshes token, if needed
 */
function handleAuthToken() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            refreshTokenTime = Date.now()+gapi.client.getToken().expires_in*1000
            updateCookie()
            enableButtons()
            resolve()
        };

        if (gapi.client.getToken() === null || Date.now()>refreshTokenTime) {
            // Display account chooser, or refresh the token for an existing session.
            // This prompt is more convenient, almost always
            tokenClient.requestAccessToken({prompt: ""});
        }
        else{
            // Token already valid, resolve
            resolve()
        }
    })
}
/**
 *  Sign out the user upon button click.
 */
function handleSignout() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken("");
        // Delete credentials from cookie, by setting the expires to now
        document.cookie = COOKIE_NAME +"=deletedData; expires="+new Date().toUTCString()+";"
        disableButtons()
    }
}

//
// BUTTON INTERACTIONS
//
/**
 * Create and render a Google Picker object for selecting from Drive.
 */
function showPicker(){
    return new Promise((resolve, reject) => {
        const mimeTypes = [projectMimeType, defaultMimeType]
        const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes(mimeTypes.join(","));
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(gapi.client.getToken().access_token)
            /**
             * Callback function from the Google Picker
             */
            .setCallback(async (resp) => {
                if (resp[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                    const doc = resp[google.picker.Response.DOCUMENTS][0]
                    const docID = doc[google.picker.Document.ID]
                    //console.log("User picked "+docID)
                    resolve(docID)
                }
                if (resp[google.picker.Response.ACTION] == google.picker.Action.CANCEL) {
                    //console.log("User closed the window")
                    reject(null)
                }
                if (resp[google.picker.Response.ACTION] == google.picker.Action.ERROR) {
                    //onsole.log("Picker dialog has encountered an error")
                    reject(resp)
                }
                //console.log("Something else happened")
            })
            .setAppId(CLIENT_ID)
            .build()

        picker.setVisible(true)
    })
}

/* DEPRECATED
function pickerCallback(data) {
    console.log(data)
    let url = ""
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        const doc = data[google.picker.Response.DOCUMENTS][0]
        url = doc[google.picker.Document.URL]
    }
    const message = `You picked: ${url}`
    console.log(message)
}*/
/**
 * Function to pick a file with Google Picker
 */
async function filePicker() {
    //Ensure the user is logged in
    await handleAuthToken()
    if (gapi.client.getToken() === null)
        throw Error("User not logged in!")
    
    return showPicker().then(async (selectedID) => {
        console.log(selectedID)
        return await importDiagramFromDrive(selectedID)
    }).catch((error) => {
        console.log(error)
        if (error)
            throw Error("Error in selection")
        //If there's no error, the user closed the window
        return null
    })
}



/**
 * Fallback function if Google Picker isn't enabled
 * It lists only the files from the Drive that the App has rights to use
 */
async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
        "pageSize": "10",
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
        console.log("No files found.")
        //document.getElementById('content').innerText = 'No files found.';
        return;
    }
    // Flatten to string to display
    const output = files.reduce(
        (str, file) => `${str}${file.name} (${file.id})\n`,
        "Files:\n");
    //document.getElementById('content').innerText = output;
    console.log(output)
    return output
}

async function exportDiagramToDrive(diagram){
    if (gapi.client.getToken() === null)
        throw Error("User not logged in!")
    
    const diagramData = JSON.stringify(diagram)
    const folderID = await getProjectsFolderID()
    const file = new Blob([diagramData], {type: "application/json"})
    const diagramName = diagram.name+"."+projectExtension
    const metadata = {
        "name": diagramName,
        "mimeType": projectMimeType,
        "parents": [folderID], // Google Drive folder id
    }
    const accessToken = gapi.auth.getToken().access_token
    const form = new FormData()
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
    form.append("file", file)
    fetch(googleUploadAPI, {
        method: "POST",
        headers: new Headers({ "Authorization": "Bearer " + accessToken }),
        body: form,
    }).then((res) => {
        return res.json();
    }).then(function(val) {
        console.log(val);
    })
}

async function importDiagramFromDrive(fileId){
    if (gapi.client.getToken() === null)
        throw Error("User not logged in!")
    
    //TEST FILE
    //fileId = "1YHRxXRU3dVdMIsgTLbEtxiftehpVYJkQ"
    const file = await gapi.client.drive.files.get({
        "fileId": fileId,
        "alt": "media",}) 

    if (file.status !== 200)
        throw Error("File doesn't exist")
    console.log("Imported diagram ID "+fileId)
    return JSON.parse(file.body)
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