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

    // ==========================================
    // INITIALIZE ACTION (Auto-Setup)
    // ==========================================
    if (action === 'initialize') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var created = [];
      
      // 1. Create Users sheet
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        usersSheet = ss.insertSheet('Users');
        usersSheet.appendRow(['Email', 'Password', 'Name', 'Role', 'CreatedAt']);
        
        // Style headers
        var uRange = usersSheet.getRange(1, 1, 1, 5);
        uRange.setFontWeight("bold")
              .setBackground("#e2e8f0")
              .setBorder(true, true, true, true, true, true)
              .setHorizontalAlignment("center");
              
        // Add sample admin (user should update this)
        usersSheet.appendRow(['admin@company.com', 'admin123', 'Admin User', 'admin', new Date()]);
        
        // Set column widths
        usersSheet.setColumnWidth(1, 200);  // Email
        usersSheet.setColumnWidth(2, 120);  // Password
        usersSheet.setColumnWidth(3, 150);  // Name
        usersSheet.setColumnWidth(4, 80);   // Role
        usersSheet.setColumnWidth(5, 150);  // CreatedAt
        
        created.push('Users');
      }
      
      // 2. Create Requests sheet
      var reqSheet = ss.getSheetByName('Requests');
      if (!reqSheet) {
        reqSheet = ss.insertSheet('Requests');
        reqSheet.appendRow(['ID', 'Date', 'User', 'Session', 'Start', 'End', 'Duration', 'Description', 'Project', 'Category', 'Status', 'ReqStatus', 'ApprovedBy']);
        
        // Style headers
        var rRange = reqSheet.getRange(1, 1, 1, 13);
        rRange.setFontWeight("bold")
              .setBackground("#f1f5f9")
              .setBorder(true, true, true, true, true, true)
              .setHorizontalAlignment("center");
              
        created.push('Requests');
      }
      
      return responseJSON({ 
        status: 'success', 
        message: 'Auth sheets initialized', 
        created: created,
        defaultAdmin: 'admin@company.com / admin123'
      });
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
function responseError(m) { return responseJSON({status:'error', message:m}); }
