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
        'fields': 'files(id, name)',
        });
    } catch (err) {
        console.log(err.message)
        //document.getElementById('content').innerText = err.message;
        return;
    }
    const files = response.result.files;
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
        const name = Date.now().toLocaleString([],{ hour12: false })+".txt"
        response = await gapi.client.drive.files.create({
            "name": name,
            "mimeType" : "application/vnd.google-apps.folder",
        }).execute();
        console.log("Exported. Response: "+response)
    }else{
        console.error("Not logged in!")
    }
}

function importDiagramFromDrive(file){
    if (gapi.client.getToken() !== null)
    {
        
        console.log("Import!")
    }else{
        console.error("Not logged in!")
    }
}


/*
//CREATE FOLDER
var parentId = '';//some parentId of a folder under which to create the new folder
var fileMetadata = {
  'name' : 'New Folder',
  'mimeType' : 'application/vnd.google-apps.folder',
  'parents': [parentId]
};
gapi.client.drive.files.create({
  resource: fileMetadata,
}).then(function(response) {
  switch(response.status){
    case 200:
      var file = response.result;
      console.log('Created Folder Id: ', file.id);
      break;
    default:
      console.log('Error creating the folder, '+response);
      break;
    }
});

//UPLOAD FILE
var fileContent = "sample text"; // fileContent can be text, or an Uint8Array, etc.
var file = new Blob([fileContent], {type: "text/plain"});
var metadata = {
    "name": "yourFilename",
    "mimeType": "text/plain",
    "parents": ["folder id or 'root'"], // Google Drive folder id
};

var accessToken = gapi.auth.getToken().access_token;
var form = new FormData();
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
form.append('file', file);

fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
}).then((res) => {
    return res.json();
}).then(function(val) {
    console.log(val);
});

//ANOTHER WAY
var createFileWithJSONContent = function(name,data,callback) {
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const contentType = 'application/json';

  var metadata = {
      'name': name,
      'mimeType': contentType
    };

    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        data +
        close_delim;

    var request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody});
    if (!callback) {
      callback = function(file) {
        console.log(file)
      };
    }
    request.execute(callback);
}

*/