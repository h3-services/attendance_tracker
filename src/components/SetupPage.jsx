import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ExternalLink } from 'lucide-react';
import Stepper, { Step } from './Stepper';

const MAIN_SCRIPT_CODE = `// ==========================================
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
        targetSheet.appendRow(["ID", "Date", "User", "Session", "Start", "End", "Duration", "Description", "Project", "Category", "Status", "Approved State", "Location"]);
        
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
        requestData.location || ''
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

      // Daily Summary disabled - no longer storing separate totals table
      // try {
      //   updateDailySummary(ss, requestData.date, requestData.userName, requestData.duration);
      // } catch (e) {
      //   console.error("Summary Update Failed: " + e.toString());
      // }

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
  var durationToAdd = parseDurationToMinutes(durationStr);

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
// Helper: Parses various duration formats into Total Minutes (Integer or Decimal)
function parseDurationToMinutes(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  
  var str = val.toString().toUpperCase().trim();
  
  // 1. Try parsing "HH:MM:SS" or "00 HRS : 00 MIN : 00 SEC" format directly by stripping labels
  // Remove text characters to see if we have colon separated numbers
  var cleanStr = str.replace(/HRS/g, '')
                    .replace(/HR/g, '')
                    .replace(/MINS/g, '')
                    .replace(/MIN/g, '')
                    .replace(/SECS/g, '')
                    .replace(/SEC/g, '')
                    .replace(/IS/g, '') // Handle "IS :" artifact
                    .replace(/\s/g, ''); // Remove spaces
  
  // Check if it looks like HH:MM or HH:MM:SS (e.g., "00:00:46")
  if (cleanStr.includes(':')) {
    var parts = cleanStr.split(':').map(function(p) { return parseFloat(p) || 0; });
    var totalMins = 0;
    
    if (parts.length === 3) {
       // HH:MM:SS
       totalMins += parts[0] * 60;
       totalMins += parts[1];
       totalMins += parts[2] / 60;
    } else if (parts.length === 2) {
       // MM:SS or HH:MM? 
       // If original string had "HRS" likely HH:MM:SS logic applied but parts missing.
       // Usually "00:25" is MM:SS in this context if "IS : MIN" was removed.
       // But let's assume standard time format if ambiguous.
       // If it was "1 hr 30 min", it wouldn't be here (no colons usually).
       
       // Context specific: The problematic format "00 HRS : 00 MIN : 46 SEC" becomes "00:00:46" -> 3 parts.
       // "00 HRS : 15 MIN" -> "00:15" -> 2 parts (HH:MM).
       totalMins += parts[0] * 60;
       totalMins += parts[1];
    }
    return Math.round(totalMins); // Return integer minutes for simplicity? Or keep decimal?
    // User header says "Total Mins". Rounding to nearest minute is safer for "Summary".
  }

  // 2. Fallback to Regex for "1 hr 30 min" text format if no colons
  var total = 0;
  
  // Extract hours
  var hoursMatch = str.match(/(\d+)\s*H/); // Matches H, HR, HRS
  if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
  
  // Extract minutes
  var minsMatch = str.match(/(\d+)\s*M/); // Matches M, MIN, MINS
  if (minsMatch) total += parseInt(minsMatch[1]);
  
  // Extract seconds (optional, rounds up?)
  var secsMatch = str.match(/(\d+)\s*S/); // Matches S, SEC, SECS
  if (secsMatch) {
     total += parseInt(secsMatch[1]) / 60;
  }
  
  // If just a number "90"
  if (total === 0 && !isNaN(parseFloat(str)) && !str.includes(':')) {
    total = parseFloat(str);
  }
  
  return Math.round(total);
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
}`;

// Auth Script - Sheet 2 (Users & Requests)
const AUTH_SCRIPT_CODE = `// ==========================================
// Google Apps Script - Authentication Backend (Users Sheet)
// ==========================================
// Deployment Guide:
// 1. Create a NEW Google Sheet.
// 2. Extensions > Apps Script.
// 3. Paste this code.
// 4. Deploy > New Deployment > Web App.
//    - Execute as: Me
//    - Who has access: Anyone
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
    
    var requestData = {};
    if (e && e.parameter && typeof e.parameter === 'object') {
      for (var key in e.parameter) requestData[key] = e.parameter[key];
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var key in body) requestData[key] = body[key];
      } catch (jsonErr) {}
    }

    var action = requestData.action ? String(requestData.action).toLowerCase().trim() : 'read';

    // ==========================================
    // ACTION: READ
    // ==========================================
    if (action === 'read' || action === '') {
      var allSheets = ss.getSheets();
      var result = { sessions: [], users: [], attendance: [] };
      
      for (var s = 0; s < allSheets.length; s++) {
        var currentSheet = allSheets[s];
        var sheetName = currentSheet.getName();
        if (sheetName === 'Config' || sheetName === 'Settings' || sheetName === 'Template') continue;
        
        var data = currentSheet.getDataRange().getDisplayValues();
        if (data.length < 2) continue; 
        
        var header = data[0];
        // Dynamic Column Detection
        var userCol = -1, dateCol = -1, durCol = -1;
        for(var h=0; h<header.length; h++) {
          var hVal = String(header[h]).toLowerCase();
          if(hVal === 'email' || hVal === 'user') userCol = h;
          if(hVal === 'date' || hVal === 'n') dateCol = h;
          if(hVal.includes('duration')) durCol = h;
        }

        var isUsersSheet = sheetName === 'Users';
        var isAttendanceSheet = (sheetName.includes('20') && durCol !== -1); 

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          // Check for emptiness
          var isEmpty = true;
          for(var c=0; c<row.length; c++) { if(row[c]) { isEmpty=false; break; } }
          if (isEmpty) continue;
          
          if (isUsersSheet) {
             result.users.push({
              email: row[0], password: row[1], name: row[2], role: row[3] || 'user', 
              createdAt: row[4], recordId: row[0], _sheetName: sheetName
            });
          } else if (isAttendanceSheet && dateCol !== -1 && userCol !== -1 && durCol !== -1) {
            result.attendance.push({
              date: row[dateCol],
              user: row[userCol],
              totalDuration: row[durCol],
              _sheetName: sheetName
            });
          } else {
             // Requests/Sessions
             var rid = parseInt(row[0]);
             if (isNaN(rid)) continue;
             
             result.sessions.push({
               recordId: row[0], date: row[1], userName: row[2], sessionNo: row[3],
               startTime: row[4], endTime: row[5], duration: row[6],
               workDescription: row[7], project: row[8], category: row[9],
               status: row[10], approvedState: row[11], approvedBy: row[12],
               _sheetName: sheetName
             });
          }
        }
      }
      result.sessions.sort(function(a, b) { return parseInt(b.recordId) - parseInt(a.recordId); });
      return responseJSON({ status: 'success', sessions: result.sessions, users: result.users, attendance: result.attendance });
    }

    // ==========================================
    // ACTION: SYNC (Original Logic)
    // ==========================================
    if (action === 'sync') {
       var targetUrl = requestData.targetUrl;
       if (!targetUrl) return responseError('Missing targetUrl');
       var allSheets = ss.getSheets();
       var approvedRecords = [];
       var syncedCount = 0;
       var errors = [];
       for (var s = 0; s < allSheets.length; s++) {
         var currentSheet = allSheets[s];
         var sheetName = currentSheet.getName();
         if (['Config','Settings','Template','Users'].indexOf(sheetName) !== -1) continue;
         var data = currentSheet.getDataRange().getDisplayValues();
         if (data.length < 2) continue;
         for (var i = 1; i < data.length; i++) {
           var row = data[i];
           if (!row[0] || isNaN(parseInt(row[0]))) continue;
           if (String(row[11]).toLowerCase() === 'completed') {
             approvedRecords.push({
               recordId: row[0], date: row[1], userName: row[2], sessionNo: row[3],
               startTime: row[4], endTime: row[5], duration: row[6],
               workDescription: row[7], project: row[8], category: row[9],
               status: row[10], approvedState: row[11], approvedBy: row[12]
             });
           }
         }
       }
       for (var r = 0; r < approvedRecords.length; r++) {
         try {
           var rec = approvedRecords[r];
           var params = 'action=create&date=' + encodeURIComponent(rec.date) + 
             '&userName=' + encodeURIComponent(rec.userName) + 
             '&sessionNo=' + encodeURIComponent(rec.sessionNo) + 
             '&startTime=' + encodeURIComponent(rec.startTime) +
             '&endTime=' + encodeURIComponent(rec.endTime) +
             '&duration=' + encodeURIComponent(rec.duration) +
             '&workDescription=' + encodeURIComponent(rec.workDescription) +
             '&project=' + encodeURIComponent(rec.project) +
             '&category=' + encodeURIComponent(rec.category) +
             '&status=' + encodeURIComponent(rec.status) +
             '&approvedState=' + encodeURIComponent(rec.approvedState) +
             '&approvedBy=' + encodeURIComponent(rec.approvedBy||'');
           var resp = UrlFetchApp.fetch(targetUrl + '?' + params, {method:'POST',muteHttpExceptions:true});
           if(JSON.parse(resp.getContentText()).status === 'success') syncedCount++;
           else errors.push(rec.recordId + ': ' + JSON.parse(resp.getContentText()).message);
         } catch(e) { errors.push(rec.recordId + ': ' + e.toString()); }
       }
       return responseJSON({status:'success', message:'Sync completed', count: syncedCount, errors: errors});
    }

    // ==========================================
    // ACTION: UPDATE (User)
    // ==========================================
    if(action === 'update') {
       var recordId = requestData.recordId; 
       if(!recordId) return responseError('Missing recordId');
       
       var usersSheet = ss.getSheetByName('Users');
       if(!usersSheet) return responseError('Users sheet not found');
       
       var data = usersSheet.getDataRange().getValues();
       var updated = false;
       
       for(var i=1; i<data.length; i++) {
         // Assuming recordId is the original email/ID
         if(String(data[i][0]) === String(recordId)) {
            // Update fields if provided
            if(requestData.email) usersSheet.getRange(i+1, 1).setValue(requestData.email);
            // Only update password if it's not empty
            if(requestData.password && requestData.password !== '') usersSheet.getRange(i+1, 2).setValue(requestData.password);
            if(requestData.name) usersSheet.getRange(i+1, 3).setValue(requestData.name);
            if(requestData.role) usersSheet.getRange(i+1, 4).setValue(requestData.role);
            
            updated = true;
            break;
         }
       }
       
       if(updated) return responseJSON({status:'success', message:'User updated'});
       return responseError('User not found');
    }

    // ==========================================
    // ACTION: DELETE
    // ==========================================
    if(action === 'delete') {
      var recordId = requestData.recordId;
      var sheetName = requestData.sheetName || 'Requests';
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return responseError('Sheet not found');
      var data = sheet.getDataRange().getValues();
      var deleted = false;
      for(var i=data.length-1; i>=1; i--) {
        if(String(data[i][0]) === String(recordId)) {
          sheet.deleteRow(i+1);
          deleted = true;
          break;
        }
      }
      return deleted ? responseJSON({status:'success'}) : responseError('Not found');
    }

    // ==========================================
    // ACTION: REGISTER
    // ==========================================
    if(action === 'register') {
       var usersSheet = ss.getSheetByName('Users');
       if (!usersSheet) { usersSheet = ss.insertSheet('Users'); usersSheet.appendRow(['Email', 'Password', 'Name', 'Role', 'CreatedAt']); }
       // Check duplicate
       var data = usersSheet.getDataRange().getValues();
       for(var i=1; i<data.length; i++) { if(String(data[i][0]).toLowerCase() === String(requestData.email).toLowerCase()) return responseError('Email exists'); }
       usersSheet.appendRow([requestData.email, requestData.password, requestData.name, requestData.role||'user', new Date()]);
       return responseJSON({status:'success'});
    }

    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if(action === 'login') {
       var usersSheet = ss.getSheetByName('Users');
       if(!usersSheet) return responseError('No users');
       var data = usersSheet.getDataRange().getValues();
       for(var i=1; i<data.length; i++) {
         if(String(data[i][0]).toLowerCase() === String(requestData.email).toLowerCase() && String(data[i][1]) === String(requestData.password)) {
           return responseJSON({status:'success', user:{name:data[i][2], email:data[i][0], role:data[i][3]}});
         }
       }
       return responseError('Invalid credentials');
    }

    // ==========================================
    // SHARED HELPER: FIND OR CREATE DAILY ROW
    // ==========================================
    // Returns { sheet, idx, currentTotalStr }
    function findDailyRow(dateStr, userName) {
      // 1. Determine Sheet Name
      var parts = dateStr.split('-');
      // Assumption: dateStr is YYYY-MM-DD
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]); 
      var day = parseInt(parts[2]);
      
      var dateObj = new Date(year, month - 1, day);
      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var sheetName = monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear();
      
      var targetSheet = ss.getSheetByName(sheetName);
      if (!targetSheet) {
        targetSheet = ss.insertSheet(sheetName);
        targetSheet.appendRow(["Date", "User", "Total Duration"]);
        targetSheet.getRange(1,1,1,3).setFontWeight("bold").setBackground("#e2e8f0");
      }
      
      var lastRow = targetSheet.getLastRow();
      // Heuristic Cols
      var dCol = 1, uCol = 2, tCol = 3; 

      // Search & Gap Filling
      var foundIdx = -1;
      var firstEmptyIdx = -1;
      var currentTotal = "00 HRS : 00 MIN : 00 SEC";
      
      if(lastRow > 1) {
        // Read A, B, C
        var data = targetSheet.getRange(2, 1, lastRow-1, 3).getValues();
        var timeZone = ss.getSpreadsheetTimeZone();
        
        for(var i=0; i<data.length; i++) {
          var rowDateVal = data[i][0];
          var rowUserVal = data[i][1];
          var rowDurVal = data[i][2];
          
          // Track First Empty Row to avoid skipping
          var isEmpty = (rowDateVal === "" && rowUserVal === "");
          if (isEmpty && firstEmptyIdx === -1) {
             firstEmptyIdx = i + 2; // +2 offset (Header=1, i=0 is Row 2)
          }

          // KEY FIX: Use Utilities.formatDate to strictly match YYYY-MM-DD
          var rowDateStr = "";
          if (rowDateVal instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateVal, timeZone, "yyyy-MM-dd");
          } else {
            rowDateStr = String(rowDateVal).trim();
          }
          
          if (!isEmpty && rowDateStr === dateStr && String(rowUserVal) === String(userName)) {
            foundIdx = i + 2; // +2 offset
            currentTotal = rowDurVal;
            break;
          }
        }
      }
      
      // If we found empty rows but NO existing record, we should use the first empty row
      // BUT ONLY if we are planning to overwrite/create new.
      // We return both indices.
      
      return { sheet: targetSheet, idx: foundIdx, emptyIdx: firstEmptyIdx, currentTotalStr: currentTotal, dateCol: dCol, userCol: uCol, durCol: tCol };
    }


    // ==========================================
    // ACTION: SET_DAILY_TOTAL (Force)
    // ==========================================
    if (action === 'set_daily_total') {
       var info = findDailyRow(requestData.date, requestData.userName);
       if (info.idx !== -1) {
         info.sheet.getRange(info.idx, info.durCol).setValue(requestData.totalDuration);
       } else if (info.emptyIdx !== -1) {
         info.sheet.getRange(info.emptyIdx, 1).setValue(requestData.date);
         info.sheet.getRange(info.emptyIdx, 2).setValue(requestData.userName);
         info.sheet.getRange(info.emptyIdx, 3).setValue(requestData.totalDuration);
        } else {
          // --- Date Separator Logic (Summary Sheet) ---
          var lastRow = info.sheet.getLastRow();
          var shouldAddSeparator = false;
          
          if (lastRow > 1) {
             // Header is row 1. Data starts row 2.
             // Check last Date (Column A is index 0 in values)
             var lastRowVals = info.sheet.getRange(lastRow, 1, 1, 1).getDisplayValues()[0];
             var lastDate = lastRowVals[0];
             if (lastDate !== requestData.date) shouldAddSeparator = true;
          } else {
             shouldAddSeparator = true; 
          }

          if (shouldAddSeparator) {
               var p = requestData.date.split('-');
               var dObj = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
               var formattedTx = Utilities.formatDate(dObj, ss.getSpreadsheetTimeZone(), "MMM d - EEEE");
               
               info.sheet.appendRow([formattedTx]);
               var sRow = info.sheet.getLastRow();
               var rng = info.sheet.getRange(sRow, 1, 1, 3); // Merge A, B, C (3 cols)
               rng.merge()
                  .setBackground("#f1f5f9")
                  .setFontColor("#1e293b")
                  .setFontWeight("bold")
                  .setFontSize(12) 
                  .setHorizontalAlignment("center")
                  .setVerticalAlignment("middle");
          }
          // -------------------------------------------
          info.sheet.appendRow([requestData.date, requestData.userName, requestData.totalDuration]);
        }
       return responseJSON({status:'success', message:'Updated'});
    }

    // ==========================================
    // ACTION: CREATE (Incremental)
    // ==========================================
    if (action === 'create') {
        // 1. Requests
        var reqSheet = ss.getSheetByName('Requests');
        if(!reqSheet) { reqSheet=ss.insertSheet('Requests'); reqSheet.appendRow(['ID','Date','User', 'Session', 'Start','End','Duration','Description','Project','Category','Status','ReqStatus','ApprovedBy']); }

        // --- Date Separator Logic ---
        var lastRow = reqSheet.getLastRow();
        var shouldAddSeparator = false;
        if (lastRow > 1) {
           // Check last record's date (Col B is index 1, but getDisplayValues is 0-indexed array)
           // We only read the last row to save time
           var lastRowVals = reqSheet.getRange(lastRow, 1, 1, 2).getDisplayValues()[0]; 
           var lastDate = lastRowVals[1]; // Column B
           if (lastDate !== requestData.date) shouldAddSeparator = true;
        } else {
           shouldAddSeparator = true; // First data row
        }

        if (shouldAddSeparator) {
             // Parse YYYY-MM-DD to Date Obj for formatting
             var p = requestData.date.split('-');
             var dObj = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
             var formattedTx = Utilities.formatDate(dObj, ss.getSpreadsheetTimeZone(), "MMM d - EEEE");
             
             reqSheet.appendRow([formattedTx]);
             var sRow = reqSheet.getLastRow();
             // Merge 13 Columns (A-M) matching header width
             var rng = reqSheet.getRange(sRow, 1, 1, 13); 
             rng.merge()
                .setBackground("#f1f5f9")
                .setFontColor("#1e293b")
                .setFontWeight("bold")
                .setFontSize(14) // Slightly smaller than monthly sheet (20) which is huge, sticking to readable
                .setHorizontalAlignment("center")
                .setVerticalAlignment("middle");
        }
        // -----------------------------
        reqSheet.appendRow([
          Date.now(), 
          requestData.date, 
          requestData.userName, 
          requestData.sessionNo||'1', 
          requestData.startTime, 
          requestData.endTime, 
          requestData.duration, 
          requestData.workDescription, 
          requestData.project, 
          requestData.category, 
          requestData.status || 'Completed', 
          requestData.approvedState || 'Pending', 
          requestData.approvedBy || ''
        ]);

        // 2. Attendance (Increment)
        var info = findDailyRow(requestData.date, requestData.userName);
        var durToAdd = parseDurationToSeconds(requestData.duration);
        
        if (durToAdd > 0) {
            if (info.idx !== -1) {
               var currentSec = parseDurationToSeconds(info.currentTotalStr);
               var newTotal = currentSec + durToAdd;
               info.sheet.getRange(info.idx, info.durCol).setValue(formatDuration(newTotal));
            } else if (info.emptyIdx !== -1) {
               info.sheet.getRange(info.emptyIdx, 1).setValue(requestData.date);
               info.sheet.getRange(info.emptyIdx, 2).setValue(requestData.userName);
               info.sheet.getRange(info.emptyIdx, 3).setValue(formatDuration(durToAdd));
            } else {
               info.sheet.appendRow([requestData.date, requestData.userName, formatDuration(durToAdd)]);
            }
        }
        return responseJSON({status:'success', message:'Created'});
    }

    return responseJSON({status:'success', message:'Auth API Ready'});

  } catch (err) { return responseError(err.toString()); }
  finally { lock.releaseLock(); }
}

function parseDurationToSeconds(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  var str = val.toString().toLowerCase();
  
  // Clean special chars
  if (str.includes(':')) {
     var p = str.replace(/[a-z]/g, '').split(':').map(function(s){ return parseInt(s.trim())||0 });
     if(p.length===3) return p[0]*3600 + p[1]*60 + p[2];
     if(p.length===2) return p[0]*60 + p[1];
  }
  
  // Natural
  var t=0;
  var h=str.match(/(\d+)\s*hr/); if(h) t+=parseInt(h[1])*3600;
  var m=str.match(/(\d+)\s*min/); if(m) t+=parseInt(m[1])*60;
  var s=str.match(/(\d+)\s*sec/); if(s) t+=parseInt(s[1]);
  if(t>0) return t;
  
  // Legacy Number
  if(!isNaN(parseInt(str))) return parseInt(str)*60;
  return 0;
}

function formatDuration(sec) {
  if(isNaN(sec) || sec<0) sec=0;
  var h=Math.floor(sec/3600);
  var m=Math.floor((sec%3600)/60);
  var s=Math.floor(sec%60);
  var hh=h<10?'0'+h:h;
  var mm=m<10?'0'+m:m;
  var ss=s<10?'0'+s:s;
  return hh+" HRS : "+mm+" MIN : "+ss+" SEC";
}

function responseJSON(d) { return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }
function responseError(m) { return responseJSON({status:'error', message:m}); }`;

const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">Google Apps Script</span>
        <button onClick={handleCopy} className="copy-btn">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

const SetupPage = () => {
  const navigate = useNavigate();
  const [apiUrl, setApiUrl] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [companyName, setCompanyName] = useState('Hope3-Services');
  const [urlError, setUrlError] = useState('');

  // Validation function - returns true if valid, false to block completion
  const handleBeforeComplete = () => {
    // Validate Main URL
    if (!apiUrl || !apiUrl.startsWith('https://script.google.com/')) {
      setUrlError('Please enter a valid Main Data Script URL (Sheet 1)');
      return false;
    }

    // Validate Auth URL
    if (!authUrl || !authUrl.startsWith('https://script.google.com/')) {
      setUrlError('Please enter a valid Auth Script URL (Sheet 2)');
      return false;
    }

    // Validate Company Name
    if (!companyName.trim()) {
      setUrlError('Please enter a Company Name');
      return false;
    }

    return true; // Allow completion
  };

  // State for initialization
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState('');

  // Called after validation passes - Initialize both sheets then navigate
  const handleComplete = async () => {
    setIsInitializing(true);
    setInitError('');

    try {
      // 1. Initialize Main Data Sheet
      const mainResponse = await fetch(`${apiUrl}?action=initialize`);
      const mainResult = await mainResponse.json();
      if (mainResult.status !== 'success') {
        throw new Error('Failed to initialize Sheet 1: ' + (mainResult.message || 'Unknown error'));
      }

      // 2. Initialize Auth Sheet
      const authResponse = await fetch(`${authUrl}?action=initialize`);
      const authResult = await authResponse.json();
      if (authResult.status !== 'success') {
        throw new Error('Failed to initialize Sheet 2: ' + (authResult.message || 'Unknown error'));
      }

      // Store URLs in localStorage
      localStorage.setItem('userApiUrl', apiUrl);
      localStorage.setItem('userAuthUrl', authUrl);
      localStorage.setItem('appCompanyName', companyName.trim());
      localStorage.setItem('setupCompleted', 'true');

      // Navigate to login
      navigate('/login');

    } catch (error) {
      console.error('Initialization error:', error);
      setInitError(error.message || 'Failed to initialize sheets. Please check your URLs.');
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50 py-8">
      {/* Header */}
      <div className="text-center mb-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium mb-4">
          ⚡ One-time Setup
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Setup Your Attendance Tracker
        </h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Connect your own Google Sheet in 8 simple steps
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        initialStep={1}
        onBeforeComplete={handleBeforeComplete}
        onFinalStepCompleted={handleComplete}
        nextButtonText="Next Step"
        backButtonText="Previous"
      >
        {/* ===== SHEET 1: MAIN DATA ===== */}
        <Step>
          <h2>📊 Sheet 1: Create Main Data Sheet</h2>
          <p>First, create a Google Spreadsheet for <strong>attendance records</strong>.</p>
          <ol>
            <li>Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sheets.google.com <ExternalLink size={12} className="inline" /></a></li>
            <li>Click <strong>+ Blank</strong> to create new spreadsheet</li>
            <li>Name it <strong>"Attendance Data"</strong></li>
          </ol>
          <div className="info-box">
            📊 This sheet will store: attendance records, sessions, time tracking
          </div>
        </Step>

        <Step>
          <h2>📋 Sheet 1: Paste the Code</h2>
          <ol>
            <li>In your sheet, click <strong>Extensions → Apps Script</strong></li>
            <li>Delete any existing code</li>
            <li>Copy and paste the code below:</li>
          </ol>
          <CodeBlock code={MAIN_SCRIPT_CODE} />
          <div className="success-box">
            ✅ Press <strong>Ctrl+S</strong> to save!
          </div>
        </Step>

        <Step>
          <h2>🚀 Sheet 1: Deploy & Authorize</h2>
          <ol>
            <li>Click <strong>Deploy → New deployment</strong></li>
            <li>Click ⚙️ gear → Choose <strong>Web app</strong></li>
            <li>Set "Execute as" → <strong>Me</strong></li>
            <li>Set "Who has access" → <strong>Anyone</strong></li>
            <li>Click <strong>Deploy</strong></li>
          </ol>
          <div className="tip-box">
            ⚠️ <strong>Authorization:</strong> Click "Review permissions" → Select account → Click "Advanced" → "Go to [Project] (unsafe)" → "Allow"
          </div>
        </Step>

        <Step>
          <h2>🔗 Sheet 1: Copy & Paste URL</h2>
          <p>After deployment, copy your Web App URL and paste it below:</p>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>
              📊 Sheet 1 - Main Data Script URL:
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => { setApiUrl(e.target.value); setUrlError(''); }}
              placeholder="https://script.google.com/macros/s/.../exec"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Only show success when URL is valid */}
          {apiUrl && apiUrl.startsWith('https://script.google.com/') ? (
            <div className="success-box" style={{ marginTop: '1rem' }}>
              ✅ Sheet 1 Done! Now let's set up Sheet 2...
            </div>
          ) : (
            <div className="tip-box" style={{ marginTop: '1rem' }}>
              ⚠️ Please paste your Sheet 1 URL above before continuing
            </div>
          )}
        </Step>

        {/* ===== SHEET 2: AUTH ===== */}
        <Step>
          <h2>🔐 Sheet 2: Create Auth Sheet + Users Table</h2>
          <p>Create a <strong>NEW</strong> Google Spreadsheet for <strong>user accounts</strong>.</p>
          <ol>
            <li>Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sheets.google.com <ExternalLink size={12} className="inline" /></a></li>
            <li>Click <strong>+ Blank</strong> to create another spreadsheet</li>
            <li>Name it <strong>"Auth Users"</strong></li>
            <li>Rename the first sheet tab to <strong>"Users"</strong></li>
            <li>Create headers in Row 1: <strong>Email | Password | Name | Role | CreatedAt</strong></li>
          </ol>

          <div className="tip-box" style={{ marginTop: '1rem' }}>
            <strong>⚠️ Add Your First Admin User (Row 2):</strong><br />
            <code className="bg-amber-100 px-1 rounded">admin@company.com | your_password | Admin Name | admin | 2026-01-10</code>
          </div>

          <div className="info-box">
            🔐 This sheet stores: user accounts, login credentials, admin requests
          </div>
        </Step>

        <Step>
          <h2>📋 Sheet 2: Paste the Code</h2>
          <ol>
            <li>In your new sheet, click <strong>Extensions → Apps Script</strong></li>
            <li>Delete any existing code</li>
            <li>Copy and paste the code below:</li>
          </ol>
          <CodeBlock code={AUTH_SCRIPT_CODE} />
          <div className="success-box">
            ✅ Press <strong>Ctrl+S</strong> to save!
          </div>
        </Step>

        <Step>
          <h2>🚀 Sheet 2: Deploy & Authorize</h2>
          <ol>
            <li>Click <strong>Deploy → New deployment</strong></li>
            <li>Click ⚙️ gear → Choose <strong>Web app</strong></li>
            <li>Set "Execute as" → <strong>Me</strong></li>
            <li>Set "Who has access" → <strong>Anyone</strong></li>
            <li>Click <strong>Deploy</strong></li>
          </ol>
          <div className="tip-box">
            ⚠️ <strong>Authorization:</strong> Same as before - Click "Advanced" → "Go to [Project] (unsafe)" → "Allow"
          </div>
        </Step>

        <Step>
          <h2>🔗 Sheet 2: Copy & Paste URL</h2>
          <p>Copy your Sheet 2 Web App URL and paste it below:</p>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>
              🔐 Sheet 2 - Auth Script URL:
            </label>
            <input
              type="url"
              value={authUrl}
              onChange={(e) => { setAuthUrl(e.target.value); setUrlError(''); }}
              placeholder="https://script.google.com/macros/s/.../exec"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>
              🏢 Company Name (for App Header):
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setUrlError(''); }}
              placeholder="e.g. Acme Corp"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {urlError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              ⚠️ {urlError}
            </p>
          )}

          {/* Initialization Error */}
          {initError && (
            <div className="error-box" style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', borderRadius: '0.75rem', border: '1px solid #fecaca' }}>
              <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>❌ Initialization Failed</p>
              <p style={{ color: '#991b1b', fontSize: '0.9rem' }}>{initError}</p>
            </div>
          )}

          {/* Loading State */}
          {isInitializing && (
            <div className="info-box" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #0f172a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span>🔄 <strong>Initializing sheets...</strong> Creating tables and columns...</span>
            </div>
          )}

          {/* Success State - Show when URLs are valid and not initializing */}
          <div style={{ marginTop: '1.5rem' }}>
            {!isInitializing && authUrl && authUrl.startsWith('https://script.google.com/') ? (
              <div className="success-box">
                🎉 <strong>Ready!</strong> Click "Complete" to auto-create sheets and go to login!
                <br /><small style={{ opacity: 0.8 }}>📧 Default admin: admin@company.com / admin123</small>
              </div>
            ) : !isInitializing && (
              <div className="tip-box">
                ⚠️ Please enter your Sheet 2 Auth Script URL above to complete setup
              </div>
            )}
          </div>
        </Step>
      </Stepper>
    </div>
  );
};

export default SetupPage;
