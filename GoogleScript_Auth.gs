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
    
    // Parse Request - Support both URL params and JSON body
    var requestData = {};
    
    // 1. Get URL parameters (works for both GET and POST)
    if (e && e.parameter && typeof e.parameter === 'object') {
      for (var key in e.parameter) {
        if (e.parameter.hasOwnProperty(key)) {
          requestData[key] = e.parameter[key];
        }
      }
    }
    
    // 2. Parse JSON body if present (for POST requests)
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var key in body) {
          if (body.hasOwnProperty(key)) {
            requestData[key] = body[key];
          }
        }
      } catch (jsonErr) {
        // Not JSON, ignore
      }
    }

    // Default to 'read' if no action specified
    var action = requestData.action ? String(requestData.action).toLowerCase().trim() : 'read';

    // ==========================================
    // ACTION: READ (Show all data from ALL sheets) - DEFAULT ACTION
    // ==========================================
    if (action === 'read' || action === '') {
      var allSheets = ss.getSheets();
      var result = {
        sessions: [],
        users: []
      };
      
      for (var s = 0; s < allSheets.length; s++) {
        var currentSheet = allSheets[s];
        var sheetName = currentSheet.getName();
        
        // Skip utility/config sheets
        if (sheetName === 'Config' || sheetName === 'Settings' || sheetName === 'Template') continue;
        
        var data = currentSheet.getDataRange().getDisplayValues();
        if (data.length < 2) continue; // Skip empty sheets
        
        // Detect sheet type by header row
        var header = data[0];
        var isUsersSheet = (header[0] && header[0].toString().toLowerCase() === 'email') || sheetName === 'Users';
        
        // Skip header row (index 0), loop through data rows
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          
          // Skip empty rows
          if (!row[0] || row[0].toString().trim() === '') continue;
          
          if (isUsersSheet) {
            // Users sheet format: Email, Password, Name, Role, CreatedAt
            result.users.push({
              email: row[0],
              password: row[1],
              name: row[2],
              role: row[3] || 'user',      // Column 4 is Role
              createdAt: row[4],           // Column 5 is CreatedAt
              recordId: row[0], // Use email as recordId for users
              _sheetName: sheetName
            });
          } else {
            // Session sheet format - skip separator rows (non-numeric IDs)
            if (isNaN(parseInt(row[0]))) continue;
            
            result.sessions.push({
              recordId: row[0],
              date: row[1],
              userName: row[2],
              sessionNo: row[3],
              startTime: row[4],
              endTime: row[5],
              duration: row[6],
              workDescription: row[7],
              project: row[8],
              category: row[9],
              status: row[10],
              approvedState: row[11],
              approvedBy: row[12],
              _sheetName: sheetName
            });
          }
        }
      }
      
      // Sort sessions by recordId descending (newest first)
      result.sessions.sort(function(a, b) {
        return parseInt(b.recordId) - parseInt(a.recordId);
      });
      
      return responseJSON({
        status: 'success',
        totalSessions: result.sessions.length,
        totalUsers: result.users.length,
        sessions: result.sessions,
        users: result.users
      });
    }

    // ==========================================
    // ACTION: SYNC (Transfer approved records to main data script)
    // ==========================================
    if (action === 'sync') {
      var targetUrl = requestData.targetUrl;
      if (!targetUrl) {
        return responseError('Missing targetUrl parameter. Pass the VITE_GOOGLE_SCRIPT_URL as targetUrl.');
      }
      
      var allSheets = ss.getSheets();
      var approvedRecords = [];
      var syncedCount = 0;
      var errors = [];
      
      // Find all approved records from all sheets (except Users)
      for (var s = 0; s < allSheets.length; s++) {
        var currentSheet = allSheets[s];
        var sheetName = currentSheet.getName();
        
        // Skip utility and Users sheets
        if (sheetName === 'Config' || sheetName === 'Settings' || sheetName === 'Template' || sheetName === 'Users') continue;
        
        var data = currentSheet.getDataRange().getDisplayValues();
        if (data.length < 2) continue;
        
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          
          // Skip empty rows or separator rows
          if (!row[0] || isNaN(parseInt(row[0]))) continue;
          
          // Check if approvedState (column 11, index 11) is "Completed"
          var approvedState = row[11] ? row[11].toString().trim() : '';
          if (approvedState.toLowerCase() === 'completed') {
            approvedRecords.push({
              recordId: row[0],
              date: row[1],
              userName: row[2],
              sessionNo: row[3],
              startTime: row[4],
              endTime: row[5],
              duration: row[6],
              workDescription: row[7],
              project: row[8],
              category: row[9],
              status: row[10],
              approvedState: row[11],
              approvedBy: row[12],
              _sourceSheet: sheetName
            });
          }
        }
      }
      
      // Send each approved record to the main data script
      for (var r = 0; r < approvedRecords.length; r++) {
        var record = approvedRecords[r];
        try {
          var params = 'action=create' +
            '&date=' + encodeURIComponent(record.date) +
            '&userName=' + encodeURIComponent(record.userName) +
            '&sessionNo=' + encodeURIComponent(record.sessionNo) +
            '&startTime=' + encodeURIComponent(record.startTime) +
            '&endTime=' + encodeURIComponent(record.endTime) +
            '&duration=' + encodeURIComponent(record.duration) +
            '&workDescription=' + encodeURIComponent(record.workDescription) +
            '&project=' + encodeURIComponent(record.project) +
            '&category=' + encodeURIComponent(record.category) +
            '&status=' + encodeURIComponent(record.status) +
            '&approvedState=' + encodeURIComponent(record.approvedState) +
            '&approvedBy=' + encodeURIComponent(record.approvedBy || '');
          
          var response = UrlFetchApp.fetch(targetUrl + '?' + params, {
            method: 'POST',
            muteHttpExceptions: true
          });
          
          var responseText = response.getContentText();
          var responseJson = JSON.parse(responseText);
          
          if (responseJson.status === 'success') {
            syncedCount++;
          } else {
            errors.push('Record ' + record.recordId + ': ' + (responseJson.message || 'Unknown error'));
          }
        } catch (fetchErr) {
          errors.push('Record ' + record.recordId + ': ' + fetchErr.toString());
        }
      }
      
      return responseJSON({
        status: 'success',
        message: 'Sync completed',
        totalApproved: approvedRecords.length,
        syncedCount: syncedCount,
        errors: errors
      });
    }

    // ==========================================
    // ACTION: CREATE (Add new session record to Requests sheet)
    // ==========================================
    if (action === 'create') {
      var newDate = requestData.date;
      if (!newDate) return responseError("Date is required");

      // Ensure 'Requests' sheet exists
      var requestsSheet = ss.getSheetByName('Requests');
      if (!requestsSheet) {
        requestsSheet = ss.insertSheet('Requests');
        requestsSheet.appendRow(['ID', 'Date', 'User', 'Session', 'Start', 'End', 'Duration', 'Description', 'Project', 'Category', 'Status', 'Request Status', 'Approved By']);
        requestsSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#f1f5f9');
      }

      // Generate unique ID (timestamp-based)
      var newId = Date.now();

      // Calculate session number for this date
      var data = requestsSheet.getDataRange().getValues();
      var maxSession = 0;
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === newDate && !isNaN(parseInt(data[i][3]))) {
          var sNo = parseInt(data[i][3]);
          if (sNo > maxSession) maxSession = sNo;
        }
      }
      var sessionNo = requestData.sessionNo || (maxSession + 1).toString();

      // Append new row
      var newRow = [
        newId,
        requestData.date || '',
        requestData.userName || '',
        sessionNo,
        requestData.startTime || '',
        requestData.endTime || '',
        requestData.duration || '',
        requestData.workDescription || '',
        requestData.project || '',
        requestData.category || '',
        requestData.status || 'Completed',
        requestData.approvedState || 'Pending',
        requestData.approvedBy || ''
      ];

      requestsSheet.appendRow(newRow);

      return responseJSON({ 
        status: 'success', 
        message: 'Record created in Requests sheet', 
        recordId: newId 
      });
    }

    // ==========================================
    // ACTION: DELETE - Remove record from Requests sheet
    // ==========================================
    if (action === 'delete') {
      var recordId = requestData.recordId;
      var sheetName = requestData.sheetName || 'Requests';
      
      if (!recordId) {
        return responseError('Missing recordId parameter');
      }
      
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return responseError('Sheet not found: ' + sheetName);
      }
      
      var data = sheet.getDataRange().getValues();
      var deleted = false;
      
      // Find and delete the row with matching recordId (column A = index 0)
      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]) === String(recordId)) {
          sheet.deleteRow(i + 1); // +1 because sheet rows are 1-indexed
          deleted = true;
          break;
        }
      }
      
      if (deleted) {
        return responseJSON({ 
          status: 'success', 
          message: 'Record deleted successfully',
          recordId: recordId
        });
      } else {
        return responseError('Record not found: ' + recordId);
      }
    }

    // ==========================================
    // ACTION: REGISTER
    // ==========================================
    if (action === 'register') {
      var email = requestData.email;
      var password = requestData.password;
      var name = requestData.name;
      var role = requestData.role || 'user'; // Default role is 'user'

      if (!email || !password || !name) {
        return responseError('Missing fields: email, password, and name are required');
      }

      // Ensure 'Users' sheet exists with Role column
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        usersSheet = ss.insertSheet('Users');
        usersSheet.appendRow(['Email', 'Password', 'Name', 'Role', 'CreatedAt']);
        usersSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }

      // Check Duplicates
      var data = usersSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(email).toLowerCase()) {
          return responseError('Email already registered');
        }
      }

      usersSheet.appendRow([email, password, name, role, new Date()]);
      
      return responseJSON({ 
        status: 'success', 
        message: 'User registered successfully', 
        user: { name: name, email: email, role: role } 
      });
    }

    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if (action === 'login') {
      var email = requestData.email;
      var password = requestData.password;

      if (!email || !password) {
        return responseError('Missing credentials: email and password are required');
      }

      // Ensure 'Users' sheet exists
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return responseError('No users registered yet');
      }

      // Robust Input Processing
      var inputEmail = String(email).trim().toLowerCase();
      var inputPass = String(password).trim();

      var data = usersSheet.getDataRange().getValues();
      var emailFound = false;

      for (var i = 1; i < data.length; i++) {
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
                email: data[i][0],
                role: data[i][3] || 'user' // Return role (column 4)
              } 
            });
          }
        }
      }

      if (emailFound) {
        return responseError('Incorrect password');
      } else {
        return responseError('User not found');
      }
    }

    
    // ==========================================
    // ACTION: CREATE (Session Record)
    // ==========================================
    if (action === 'create') {
      var newDate = requestData.date; // e.g. "2026-02-01"
      if (!newDate) return responseError("Date is required");

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      // A. Global ID Generation (Scan all sheets to find max ID)
      var allSheets = ss.getSheets();
      var maxId = 0;
      for (var s = 0; s < allSheets.length; s++) {
        var d = allSheets[s].getDataRange().getValues();
        for (var r = 1; r < d.length; r++) {
          var pid = parseInt(d[r][0]); // Column A
          if (!isNaN(pid) && pid > maxId) maxId = pid;
        }
      }
      var newId = maxId + 1;

      // B. Determine Target Sheet Name "Month YYYY"
      var parts = newDate.split('-');
      var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var targetSheetName = monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear(); 

      // C. Check Exists OR Create
      var targetSheet = ss.getSheetByName(targetSheetName);
      if (!targetSheet) {
        targetSheet = ss.insertSheet(targetSheetName);
        targetSheet.appendRow(["ID", "Date", "User", "Session", "Start", "End", "Duration", "Description", "Project", "Category", "Status", "Approved State", "Approved By"]);
        var hRange = targetSheet.getRange(1, 1, 1, 13);
        hRange.setFontWeight("bold").setBackground("#f1f5f9").setBorder(true, true, true, true, true, true).setHorizontalAlignment("center");
      }

      // D. Date Separator Logic
      var lastRow = targetSheet.getLastRow();
      var shouldAddSeparator = false;
      if (lastRow > 1) {
         var lastRowVals = targetSheet.getRange(lastRow, 1, 1, 2).getDisplayValues()[0]; 
         var lastDate = lastRowVals[1];
         if (lastDate !== newDate) shouldAddSeparator = true;
      } else {
         shouldAddSeparator = true; 
      }

      if (shouldAddSeparator) {
           var formattedTx = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "MMM d - EEEE");
           targetSheet.appendRow([formattedTx]);
           var sRow = targetSheet.getLastRow();
           var rng = targetSheet.getRange(sRow, 1, 1, 13);
           rng.merge().setBackground("#f1f5f9").setFontColor("#1e293b").setFontWeight("bold").setFontSize(20).setHorizontalAlignment("center").setVerticalAlignment("middle");
      }

      // E. Append Data
      var newRow = [
        newId,
        requestData.date || '',
        requestData.userName || '',
        requestData.sessionNo || '',
        requestData.startTime || '',
        requestData.endTime || '',
        requestData.duration || '',
        requestData.workDescription || '',
        requestData.project || '',
        requestData.category || '',
        requestData.status || 'Pending',
        requestData.approvedState || 'Pending',
        requestData.approvedBy || ''
      ];
      targetSheet.appendRow(newRow);

      // Row Formatting
      var lastRowIdx = targetSheet.getLastRow();
      var range = targetSheet.getRange(lastRowIdx, 1, 1, 13);
      range.setFontFamily("Arial").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);

      // F. Update Daily Summary (Columns O-Q)
      try {
        updateDailySummary(ss, requestData.date, requestData.userName, requestData.duration);
      } catch (e) {
        console.error("Summary Update Failed: " + e.toString());
      }

      return responseJSON({ status: 'success', message: 'Record created in ' + targetSheetName, recordId: newId });
    }

    // ==========================================
    // DEFAULT: STATUS (No action or unknown action)
    // ==========================================
    // Count users for status
    var userCount = 0;
    var usersSheet = ss.getSheetByName('Users');
    if (usersSheet) {
      userCount = Math.max(0, usersSheet.getLastRow() - 1);
    }
    
    return responseJSON({ 
      status: 'success', 
      message: 'Auth API is running. Use ?action=read to see all users.',
      timestamp: new Date().toISOString(),
      totalUsers: userCount,
      receivedAction: action || '(none)',
      availableActions: ['login', 'register', 'read', 'create']
    });

  } catch (err) {
    return responseError('Server Error: ' + err.toString());
  } finally {
    lock.releaseLock();
  }
}

// Helper: Aggregates daily duration (Cols O-Q)
function updateDailySummary(ss, dateStr, userName, durationStr) {
  if (!dateStr || !userName || !durationStr) return;

  // Parse Date for Sheet Name
  var parts = dateStr.split('-'); 
  var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var sheetName = monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear(); 

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  var startCol = 15; // Column O
  
  // Ensure Headers
  var headerRange = sheet.getRange(1, startCol, 1, 3);
  if (headerRange.getValue() !== "Summary Date") {
    headerRange.setValues([["Summary Date", "User", "Total Mins"]]);
    headerRange.setFontWeight("bold").setBackground("#e2e8f0").setBorder(true, true, true, true, true, true);
  }

  var durationToAdd = parseDurationToMinutes(durationStr);
  if (durationToAdd === 0) return;

  var maxRows = sheet.getMaxRows();
  var summaryData = sheet.getRange(2, startCol, maxRows - 1, 3).getValues(); 
  
  var targetRowIndex = -1;
  var firstEmptyRowIndex = -1;

  for (var i = 0; i < summaryData.length; i++) {
    var sDate = summaryData[i][0];
    var sUser = summaryData[i][1];
    
    if (!sDate && !sUser && firstEmptyRowIndex === -1) {
      firstEmptyRowIndex = i;
    }
    if (!sDate && !sUser) break; 

    var sDateStr = sDate instanceof Date ? 
       Utilities.formatDate(sDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : sDate;

    if (sDateStr === dateStr && sUser === userName) {
      targetRowIndex = i;
      break;
    }
  }

  if (targetRowIndex !== -1) {
    // Update existing
    var existingVal = summaryData[targetRowIndex][2];
    var currentTotal = parseDurationToMinutes(existingVal);
    var newTotal = currentTotal + durationToAdd;
    var formattedTotal = formatDuration(newTotal);
    sheet.getRange(targetRowIndex + 2, startCol + 2).setValue(formattedTotal);
  } else {
    // Append New
    if (firstEmptyRowIndex === -1) firstEmptyRowIndex = summaryData.length; 
    var rowToWrite = firstEmptyRowIndex + 2;
    sheet.getRange(rowToWrite, startCol).setValue(dateStr);
    sheet.getRange(rowToWrite, startCol + 1).setValue(userName);
    sheet.getRange(rowToWrite, startCol + 2).setValue(formatDuration(durationToAdd));
    
    sheet.getRange(rowToWrite, startCol, 1, 3)
         .setHorizontalAlignment("center")
         .setBorder(null, true, null, true, null, null);
  }
}

// Helper: 1 hr 30 min -> 90
function parseDurationToMinutes(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  var str = val.toString().toLowerCase();
  var total = 0;
  var hoursMatch = str.match(/(\d+)\s*hr/);
  if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
  var minsMatch = str.match(/(\d+)\s*min/);
  if (minsMatch) total += parseInt(minsMatch[1]);
  if (total === 0 && !isNaN(parseInt(str))) total = parseInt(str);
  return total;
}

// Helper: 90 -> 1 hr 30 min
function formatDuration(totalMins) {
  var h = Math.floor(totalMins / 60);
  var m = totalMins % 60;
  if (h > 0 && m > 0) return h + " hr " + m + " min";
  if (h > 0) return h + " hr";
  return m + " min";
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function responseError(msg) {
  return responseJSON({ status: 'error', message: msg });
}
