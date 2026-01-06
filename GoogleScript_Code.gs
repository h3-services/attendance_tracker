// ==========================================
// Google Apps Script - Attendance Tracker Backend
// ==========================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10s for lock

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 1. Parse Parameters
    var requestData = {};
    
    // Check URL parameters
    if (e.parameter) {
      requestData = e.parameter;
    }
    
    // Check POST body (JSON)
    if (e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var key in body) {
          requestData[key] = body[key];
        }
      } catch (jsonErr) {
        // If body isn't JSON, ignore
      }
    }

    var action = requestData.action;

    // ==========================================
    // READ (Default)
    // ==========================================
    if (!action || action === 'read') {
      // Use getDisplayValues() to get the formatted strings (e.g. "2026-01-06", "14:30")
      // This prevents UTC timezone shifts in the API response.
      var data = sheet.getDataRange().getDisplayValues();
      var headers = data[0];
      var rows = [];
      
      // Convert array of arrays to array of objects
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var obj = {};
        // Map row by index to specific keys for frontend
        // Assuming Order: ID, Date, SessionNo, UserName, Start, End, Duration, Desc, Project, Category, Status, ApprState, ApprBy
        obj.recordId = row[0];
        obj.date = row[1];
        obj.userName = row[2]; // Column C is Name
        obj.sessionNo = row[3]; // Column D is Session
        obj.startTime = row[4];
        obj.endTime = row[5];
        obj.duration = row[6];
        obj.workDescription = row[7];
        obj.project = row[8];
        obj.category = row[9];
        obj.status = row[10];
        obj.approvedState = row[11];
        obj.approvedBy = row[12];
        
        // Helper: preserve original row index if needed
        rows.push(obj);
      }
      
      // Return newest first
      return responseJSON(rows.reverse());
    }

    // ==========================================
    // CREATE
    // ==========================================
    if (action === 'create') {
      // Auto-Increment ID
      var data = sheet.getDataRange().getValues();
      var maxId = 0;
      for (var i = 1; i < data.length; i++) {
        var pid = parseInt(data[i][0]);
        if (!isNaN(pid) && pid > maxId) maxId = pid;
      }
      var newId = maxId + 1;

      // Prepare Row Data (Strict Order)
      var newRow = [
        newId,
        requestData.date || '',
        requestData.userName || '',    // Column C (Name)
        requestData.sessionNo || '',   // Column D (Session)
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

      sheet.appendRow(newRow);

      // Formatting
      var lastRow = sheet.getLastRow();
      var range = sheet.getRange(lastRow, 1, 1, 13);
      range.setFontFamily("Arial");
      range.setFontSize(10);
      range.setHorizontalAlignment("center");
      range.setVerticalAlignment("middle");
      range.setWrap(true);

      return responseJSON({ status: 'success', message: 'Record created', recordId: newId });
    }

    // ==========================================
    // UPDATE
    // ==========================================
    if (action === 'update') {
      var idToUpdate = parseInt(requestData.recordId);
      var data = sheet.getDataRange().getValues();
      var rowIndex = -1;

      // Find row by ID
      for (var i = 1; i < data.length; i++) {
        if (parseInt(data[i][0]) === idToUpdate) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }

      if (rowIndex === -1) {
        return responseError('Record ID not found');
      }

      // Update columns (Example: Update Status or End Time)
      // Note: This simple update only updates provided fields
      
      // Helper to set cell if value exists
      function setCell(col, val) {
        if (val !== undefined && val !== null) {
           sheet.getRange(rowIndex, col).setValue(val);
        }
      }

      setCell(2, requestData.date);
      setCell(3, requestData.userName);  // Column C (Name)
      setCell(4, requestData.sessionNo); // Column D (Session)
      setCell(5, requestData.startTime);
      setCell(6, requestData.endTime);
      setCell(7, requestData.duration);
      setCell(8, requestData.workDescription);
      setCell(9, requestData.project);
      setCell(10, requestData.category);
      setCell(11, requestData.status);
      setCell(12, requestData.approvedState);
      setCell(13, requestData.approvedBy);

      return responseJSON({ status: 'success', message: 'Record updated' });
    }

    // ==========================================
    // DELETE
    // ==========================================
    if (action === 'delete') {
      var idToDelete = parseInt(requestData.recordId);
      var data = sheet.getDataRange().getValues();
      var rowIndex = -1;

      for (var i = 1; i < data.length; i++) {
        if (parseInt(data[i][0]) === idToDelete) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
         return responseError('Record ID not found');
      }

      sheet.deleteRow(rowIndex);
      return responseJSON({ status: 'success', message: 'Record deleted' });
    }

    return responseError('Invalid Action');

  } catch (err) {
    return responseError(err.toString());
  } finally {
    lock.releaseLock();
  }
}

// Helpers
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function responseError(msg) {
  return responseJSON({ status: 'error', message: msg });
}
