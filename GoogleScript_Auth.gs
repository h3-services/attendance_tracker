// ==========================================
// Google Apps Script - Authentication Backend (Users Sheet)
// ==========================================
// Deployment Guide:
// 1. Create a NEW Google Sheet.
// 2. Extensions > Apps Script.
// 3. Paste this code.
// 4. Deploy > New Deployment > Web App.
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the URL and add to your .env file as VITE_AUTH_API_URL
// ==========================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Parse Request
    var requestData = {};
    if (e.parameter) requestData = e.parameter;
    if (e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var key in body) requestData[key] = body[key];
      } catch (jsonErr) {}
    }

    var action = requestData.action;

    // Ensure 'Users' sheet exists
    var usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('Users');
      usersSheet.appendRow(['Email', 'Password', 'Name', 'CreatedAt']);
      usersSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // ==========================================
    // ACTION: REGISTER
    // ==========================================
    if (action === 'register') {
      var email = requestData.email;
      var password = requestData.password; // Storing as PLAIN TEXT as requested
      var name = requestData.name;

      if (!email || !password || !name) return responseError('Missing fields');

      // Check Duplicates
      var data = usersSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(email).toLowerCase()) return responseError('Email already registered');
      }

      usersSheet.appendRow([email, password, name, new Date()]);
      
      return responseJSON({ status: 'success', message: 'User registered', user: { name: name, email: email } });
    }

    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if (action === 'login') {
      var email = requestData.email;
      var password = requestData.password;

      if (!email || !password) return responseError('Missing credentials');

      // Robust Input Processing
      var inputEmail = String(email).trim().toLowerCase();
      var inputPass = String(password).trim();

      var data = usersSheet.getDataRange().getValues();
      var emailFound = false;

      for (var i = 1; i < data.length; i++) {
        // Col A = Email, Col B = Password (Plain), Col C = Name
        var sheetEmail = String(data[i][0]).trim().toLowerCase();
        var sheetPass = String(data[i][1]).trim();

        if (sheetEmail === inputEmail) {
           emailFound = true;
           if (sheetPass === inputPass) {
              return responseJSON({ 
                status: 'success', 
                message: 'Login successful', 
                user: { 
                  name: data[i][2], 
                  email: data[i][0] // Return original casing from sheet
                } 
              });
           }
        }
      }

      if (emailFound) {
        return responseError('Incorrect password');
      } else {
        return responseError('User not found (Checked ' + (data.length - 1) + ' users)');
      }
    }

    return responseError('Invalid Action');

  } catch (err) {
    return responseError(err.toString());
  } finally {
    lock.releaseLock();
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function responseError(msg) {
  return responseJSON({ status: 'error', message: msg });
}
