// ==========================================
// Google Apps Script - Attendance Tracker Backend (Monthly Sheets System)
// ==========================================
// CORE REQUIREMENTS IMPLEMENTATION:
// 1. Smart Write: Auto-detects Month/Year from date, finds/creates specific tab (e.g. "February 2026").
// 2. Read Everywhere: Scans ALL tabs (excluding Config) to build unified history.
// 3. Sheet Scope: Manages tabs within this single file only.
// 4. Safety: Appends only, consistent headers, data integrity.
// ==========================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 1. Safety: Transaction Lock

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

    // ==========================================
    // READ ACTION (Global Scan)
    // ==========================================
    // Requirement 2: Scans every sheet, excludes utility, combines rows.
    if (!action || action === 'read') {
      var allSheets = ss.getSheets();
      var allRows = [];
      
      for (var s = 0; s < allSheets.length; s++) {
        var currentSheet = allSheets[s];
        var sheetName = currentSheet.getName();

        // Exclude specific utility/config sheets if they exist
        if (sheetName === 'Config' || sheetName === 'Settings' || sheetName === 'Template') continue;
        
        var data = currentSheet.getDataRange().getDisplayValues();
        
        // Loop rows (Skip Header at index 0)
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          
          // Validation: legitimate data rows must have a numeric ID in Col A
          if (!row[0] || isNaN(parseInt(row[0]))) continue;
          
          var obj = {
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
            _sheetName: sheetName // Traceability
          };
          allRows.push(obj);
        }
      }

      // Sort: Newest First (Global Sort by ID)
      allRows.sort(function(a, b) {
        return parseInt(b.recordId) - parseInt(a.recordId);
      });

      // Apply Filters
      var rows = [];
      var filterDate = requestData.date;
      var filterUser = requestData.userName;

      for (var i = 0; i < allRows.length; i++) {
        var r = allRows[i];
        if (filterDate && r.date !== filterDate) continue;
        if (filterUser && r.userName !== filterUser) continue;
        rows.push(r);
      }
      
      return responseJSON({
        status: 'success',
        data: rows
      });
    }



    // ==========================================
    // CREATE ACTION (Smart Write)
    // ==========================================
    // Requirement 1 & 3: Extract Month/Year, Find/Create Tab, Append.
    if (action === 'create') {
      var newDate = requestData.date; // e.g. "2026-02-01"
      if (!newDate) return responseError("Date is required");

      // A. Global ID Generation (Scan all sheets to find max ID)
      var allSheets = ss.getSheets();
      var maxId = 0;
      for (var s = 0; s < allSheets.length; s++) {
        var d = allSheets[s].getDataRange().getValues();
        for (var r = 1; r < d.length; r++) {
          var pid = parseInt(d[r][0]);
          if (!isNaN(pid) && pid > maxId) maxId = pid;
        }
      }
      var newId = maxId + 1;

      // B. Determine Target Sheet Name
      // Parse "YYYY-MM-DD" -> "Month YYYY"
      var parts = newDate.split('-');
      // Note: Month is 0-indexed in JS Date
      var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var targetSheetName = monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear(); // e.g. "February 2026"

      // C. Check Exists OR Create
      var targetSheet = ss.getSheetByName(targetSheetName);
      if (!targetSheet) {
        targetSheet = ss.insertSheet(targetSheetName);
        // Requirement 5: Header structure consistent
        targetSheet.appendRow(["ID", "Date", "User", "Session", "Start", "End", "Duration", "Description", "Project", "Category", "Status", "Approved State", "Approved By"]);
        
        // Header Styling
        var hRange = targetSheet.getRange(1, 1, 1, 13);
        hRange.setFontWeight("bold")
               .setBackground("#f1f5f9")
               .setBorder(true, true, true, true, true, true)
               .setHorizontalAlignment("center");
      }

      // D. Date Separator Logic (Specific to this sheet)
      // Visual grouping within the monthly sheet
      var lastRow = targetSheet.getLastRow();
      var shouldAddSeparator = false;
      if (lastRow > 1) {
         var lastRowVals = targetSheet.getRange(lastRow, 1, 1, 2).getDisplayValues()[0]; 
         var lastDate = lastRowVals[1];
         if (lastDate !== newDate) shouldAddSeparator = true;
      } else {
         shouldAddSeparator = true; // First data row (after header)
      }

      if (shouldAddSeparator) {
           var formattedTx = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "MMM d - EEEE");
           targetSheet.appendRow([formattedTx]);
           var sRow = targetSheet.getLastRow();
           var rng = targetSheet.getRange(sRow, 1, 1, 13);
           rng.merge()
              .setBackground("#f1f5f9")
              .setFontColor("#1e293b")
              .setFontWeight("bold")
              .setFontSize(20)
              .setHorizontalAlignment("center")
              .setVerticalAlignment("middle");
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
      range.setFontFamily("Arial")
           .setFontSize(10)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setWrap(true);

      // Update Daily Summary
      try {
        updateDailySummary(ss, requestData.date, requestData.userName, requestData.duration);
      } catch (e) {
        console.error("Summary Update Failed: " + e.toString());
      }

      return responseJSON({ status: 'success', message: 'Record created in ' + targetSheetName, recordId: newId });
    }

    // ==========================================
    // UPDATE ACTION
    // ==========================================
    if (action === 'update') {
      var idToUpdate = parseInt(requestData.recordId);
      var allSheets = ss.getSheets();
      var foundSheet = null;
      var foundRowIndex = -1;

      // Search Global
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        if (sh.getName() === 'Config') continue;

        var data = sh.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === idToUpdate) {
            foundSheet = sh;
            foundRowIndex = i + 1;
            break;
          }
        }
        if (foundSheet) break;
      }

      if (!foundSheet) return responseError('Record ID not found');

      // Helper
      function setCell(col, val) {
        if (val !== undefined && val !== null) foundSheet.getRange(foundRowIndex, col).setValue(val);
      }

      setCell(2, requestData.date);
      setCell(3, requestData.userName);
      setCell(4, requestData.sessionNo);
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
    // DELETE ACTION
    // ==========================================
    if (action === 'delete') {
      var idToDel = parseInt(requestData.recordId);
      var allSheets = ss.getSheets();
      var foundSheet = null;
      var foundRowIndex = -1;

      // Search Global
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        if (sh.getName() === 'Config') continue;
        
        var data = sh.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === idToDel) {
            foundSheet = sh;
            foundRowIndex = i + 1;
            break;
          }
        }
        if (foundSheet) break;
      }

      if (!foundSheet) return responseError('Record ID not found');

      foundSheet.deleteRow(foundRowIndex);
      return responseJSON({ status: 'success', message: 'Record deleted' });
    }

    return responseError('Invalid Action');

  } catch (err) {
    return responseError(err.toString());
  } finally {
    lock.releaseLock();
  }
}

// Helper: Aggregates daily duration
function updateDailySummary(ss, dateStr, userName, durationStr) {
  if (!dateStr || !userName || !durationStr) return;

  // Parse Date for Sheet Name
  var parts = dateStr.split('-'); // YYYY-MM-DD
  var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var sheetName = monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear(); // e.g. "January 2026"

  // Get Sheet (Should exist because we just added data to it, but handle safety)
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return; // Should not happen if called after create

  // Summary Table Configuration (Columns O, P, Q -> 15, 16, 17)
  var startCol = 15;
  
  // 1. Ensure Headers exist
  var headerRange = sheet.getRange(1, startCol, 1, 3);
  if (headerRange.getValue() !== "Summary Date") {
    headerRange.setValues([["Summary Date", "User", "Total Mins"]]);
    headerRange.setFontWeight("bold").setBackground("#e2e8f0").setBorder(true, true, true, true, true, true);
  }

  // Parse Duration
  var durationToAdd = parseInt(durationStr);
  if (isNaN(durationToAdd)) durationToAdd = 0;

  // 2. Read existing Summary Data (Column O to Q)
  // We need to find the last row relative to THESE columns, not the whole sheet
  var maxRows = sheet.getMaxRows();
  var summaryData = sheet.getRange(2, startCol, maxRows - 1, 3).getValues(); // Read all potential rows
  
  var targetRowIndex = -1; // 0-based relative to summaryData
  var firstEmptyRowIndex = -1;

  for (var i = 0; i < summaryData.length; i++) {
    var sDate = summaryData[i][0];
    var sUser = summaryData[i][1];
    
    // Check for empty row to identify end of data
    if (!sDate && !sUser && firstEmptyRowIndex === -1) {
      firstEmptyRowIndex = i;
    }
    // Stop scanning if we hit empty space and we haven't found a match yet? 
    // No, technically there shouldn't be gaps, so first empty is safe.
    if (!sDate && !sUser) break; 

    // Normalize Date Match
    var sDateStr = sDate instanceof Date ? 
       Utilities.formatDate(sDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : sDate;

    if (sDateStr === dateStr && sUser === userName) {
      targetRowIndex = i;
      break;
    }
  }

  // 3. Update or Append
  if (targetRowIndex !== -1) {
    // Update existing
    var existingVal = summaryData[targetRowIndex][2];
    var currentTotal = parseDurationToMinutes(existingVal);
    var newTotal = currentTotal + durationToAdd;
    
    // Write formatted string
    var formattedTotal = formatDuration(newTotal);
    sheet.getRange(targetRowIndex + 2, startCol + 2).setValue(formattedTotal);
  } else {
    // Append New
    if (firstEmptyRowIndex === -1) {
        // Sheet is full? Unlikely with maxRows, but safety
        firstEmptyRowIndex = summaryData.length; 
    }
    // Row in sheet = Header(1) + SliceStart(0->2) + Index
    var rowToWrite = firstEmptyRowIndex + 2;
    sheet.getRange(rowToWrite, startCol).setValue(dateStr);
    sheet.getRange(rowToWrite, startCol + 1).setValue(userName);
    
    var formattedTotal = formatDuration(durationToAdd);
    sheet.getRange(rowToWrite, startCol + 2).setValue(formattedTotal);
    
    // Formatting
    sheet.getRange(rowToWrite, startCol, 1, 3)
         .setHorizontalAlignment("center")
         .setBorder(null, true, null, true, null, null); // Vertical borders
  }
}

// Helper: 1 hr 30 min -> 90
function parseDurationToMinutes(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  
  var str = val.toString().toLowerCase();
  var total = 0;
  
  // Extract hours
  var hoursMatch = str.match(/(\d+)\s*hr/);
  if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
  
  // Extract minutes
  var minsMatch = str.match(/(\d+)\s*min/);
  if (minsMatch) total += parseInt(minsMatch[1]);
  
  // Fallback: if just a number string "90"
  if (total === 0 && !isNaN(parseInt(str))) {
    total = parseInt(str);
  }
  
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
