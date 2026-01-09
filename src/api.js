const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

const handleResponse = async (response) => {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    if (json.status === 'error') {
      throw new Error(json.message || 'Unknown API Error');
    }
    return json;
  } catch (e) {
    if (e.message.startsWith('API Error') || e.message === 'Unknown API Error' || e.message.includes('API returned invalid')) {
      throw e;
    }
    console.error("API Error: Response was not JSON", text);
    throw new Error(`API returned invalid format. Check console. URL might be wrong. Response: ${text.substring(0, 100)}...`);
  }
};

const getUrl = (action) => {
  const separator = API_URL.includes('?') ? '&' : '?';
  return `${API_URL}${separator}action=${action}`;
};
const normalizeData = (data) => {
  if (data.status === 'success' && Array.isArray(data.data)) {
    data = data.data;
  }
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    recordId: item.recordId || item['Record ID'] || item['record id'],
    date: item.date || item['Date'] || item['date'] || '',
    userName: item.userName || item['User Name'] || item['Name'] || item['user name'] || '',
    sessionNo: item.sessionNo || item['Session No'] || item['Session'] || item['session no'] || '',
    startTime: item.startTime || item['Start Time'] || item['start time'] || '',
    endTime: item.endTime || item['End Time'] || item['end time'] || '',
    duration: item.duration || item['Duration'] || item['duration'] || '',
    workDescription: item.workDescription || item['Work Description'] || item['work description'] || '',
    status: item.status || item['Status'] || item['status'] || 'Pending',
    project: item.project || item['Project'] || item['project'] || '',
    category: item.category || item['category'] || item['Category'] || '',
    approvedState: item.approvedState || item['Approved State'] || item['Approved'] || item['approved state'] || 'Pending',
    approvedBy: item.approvedBy || item['Approved By'] || item['approved by'] || ''
  }));
};

// Helper to clean and construct URL params
const buildParams = (data) => {
  const params = new URLSearchParams();
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      params.append(key, data[key]);
    }
  }
  return params;
};

export const fetchData = async (options = {}) => {
  try {
    const params = buildParams({
      action: 'read',
      ...options
    });

    // Construct URL with params
    const separator = API_URL.includes('?') ? '&' : '?';
    const finalUrl = `${API_URL}${separator}${params.toString()}`;

    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await handleResponse(response);
    return normalizeData(rawData);
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

// Helper to remove undefined/null from object before params
const cleanParams = (data) => {
  const cleaned = {};
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
};

// Create record in Main Data Sheet
export const createRecord = async (data) => {

  try {
    const params = new URLSearchParams({
      ...cleanParams(data),
      action: 'create'
    });

    const urlWithParams = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;



    const response = await fetch(urlWithParams, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Error creating record:", error);
    throw error;
  }
};

export const updateRecord = async (data) => {
  try {
    const params = new URLSearchParams({
      ...cleanParams(data),
      action: 'update'
    });
    const urlWithParams = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;

    const response = await fetch(urlWithParams, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

export const deleteRecord = async (id) => {
  try {
    const params = new URLSearchParams({
      recordId: id,
      action: 'delete'
    });
    const urlWithParams = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;

    const response = await fetch(urlWithParams, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
};

// ==========================================
// AUTHENTICATION API
// ==========================================
// Consolidated: Auth now lives in the main script
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL;

// Consolidated: Auth now lives in the main script
const authRequest = async (data) => {
  if (!AUTH_API_URL || AUTH_API_URL.includes('ADD_YOUR_AUTH_SCRIPT_URL_HERE')) {
    throw new Error("Auth API URL not configured. Please deploy the Auth Script and update .env");
  }

  try {
    const response = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    });
    const text = await response.text();
    const json = JSON.parse(text);

    if (json.status === 'error') {
      throw new Error(json.message);
    }
    return json;
  } catch (error) {
    console.error("Auth Request Error:", error);
    throw error;
  }
};

export const registerUser = async (email, password, name, role = 'user') => {
  return await authRequest({
    action: 'register',
    email,
    password,
    name,
    role
  });
};

export const loginUser = async (email, password) => {
  return await authRequest({
    action: 'login',
    email,
    password
  });
};

export const updateUser = async (recordId, email, name, role, password) => {
  return await authRequest({
    action: 'update',
    recordId,
    email,
    name,
    role,
    password
  });
};

// Create record in Auth API (Requests sheet)
// Create record in Auth API (Requests sheet)
export const createAuthRecord = async (data) => {
  if (!AUTH_API_URL) {
    throw new Error("Auth API URL not configured");
  }

  try {
    const params = new URLSearchParams({
      ...cleanParams(data),
      action: 'create'
    });

    const urlWithParams = `${AUTH_API_URL}${AUTH_API_URL.includes('?') ? '&' : '?'}${params.toString()}`;



    const response = await fetch(urlWithParams, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    const text = await response.text();
    const json = JSON.parse(text);

    if (json.status === 'error') {
      throw new Error(json.message);
    }
    return json;
  } catch (error) {
    console.error("Error creating auth record:", error);
    throw error;
  }
};

// Delete record from Auth API (Requests sheet)
export const deleteAuthRecord = async (recordId, sheetName = 'Requests') => {
  if (!AUTH_API_URL) {
    throw new Error("Auth API URL not configured");
  }

  try {
    const params = new URLSearchParams({
      action: 'delete',
      recordId: recordId,
      sheetName: sheetName
    });

    const urlWithParams = `${AUTH_API_URL}${AUTH_API_URL.includes('?') ? '&' : '?'}${params.toString()}`;



    const response = await fetch(urlWithParams, {
      method: "POST", // Using POST for state-changing operations
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    const text = await response.text();
    const json = JSON.parse(text);

    if (json.status === 'error') {
      throw new Error(json.message);
    }
    return json;
  } catch (error) {
    console.error("Error deleting auth record:", error);
    throw error;
  }
};

// ==========================================
// SYNC API - Transfer approved records
// ==========================================

// Fetch all data from Auth API
export const fetchAuthData = async () => {
  if (!AUTH_API_URL) {
    throw new Error("Auth API URL not configured");
  }

  try {
    const response = await fetch(AUTH_API_URL);
    const text = await response.text();
    const json = JSON.parse(text);

    if (json.status === 'error') {
      throw new Error(json.message);
    }
    return json;
  } catch (error) {
    console.error("Fetch Auth Data Error:", error);
    throw error;
  }
};

// Sync approved records from Auth API to main data script
export const syncApprovedRecords = async () => {
  try {
    // Step 1: Fetch data from Auth API
    const authData = await fetchAuthData();

    // Get sessions array (handle both formats)
    const sessions = authData.sessions || (Array.isArray(authData) ? authData : []);

    // Step 2: Filter only approved records
    const approvedRecords = sessions.filter(record =>
      record.approvedState &&
      record.approvedState.toLowerCase() === 'completed'
    );

    if (approvedRecords.length === 0) {
      return {
        status: 'success',
        message: 'No approved records to sync',
        syncedCount: 0
      };
    }

    // Step 3: Fetch existing data from main script to calculate proper session numbers
    const existingData = await fetchData();

    // Track session counts per date
    const sessionCountByDate = {};

    // Count existing sessions per date
    existingData.forEach(record => {
      if (record.date) {
        const dateKey = record.date;
        const sessionNum = parseInt(record.sessionNo) || 0;
        if (!sessionCountByDate[dateKey] || sessionNum > sessionCountByDate[dateKey]) {
          sessionCountByDate[dateKey] = sessionNum;
        }
      }
    });

    // Step 4: Send each approved record with calculated session numbers
    let syncedCount = 0;
    const errors = [];

    for (const record of approvedRecords) {
      try {
        const dateKey = record.date;

        // Calculate next session number for this date
        const currentMax = sessionCountByDate[dateKey] || 0;
        const nextSessionNo = currentMax + 1;
        sessionCountByDate[dateKey] = nextSessionNo; // Update for next record

        await createRecord({
          date: record.date,
          userName: record.userName,
          sessionNo: nextSessionNo.toString(), // Use calculated session number
          startTime: record.startTime,
          endTime: record.endTime,
          duration: record.duration,
          workDescription: record.workDescription,
          project: record.project,
          category: record.category,
          status: record.status,
          approvedState: record.approvedState,
          approvedBy: record.approvedBy || ''
        });
        syncedCount++;
      } catch (err) {
        errors.push(`Record ${record.recordId}: ${err.message}`);
      }
    }

    return {
      status: 'success',
      message: `Synced ${syncedCount} of ${approvedRecords.length} approved records`,
      totalApproved: approvedRecords.length,
      syncedCount,
      errors
    };
  } catch (error) {
    console.error("Sync Error:", error);
    throw error;
  }
};

// Force update daily total in Auth Sheet (action: set_daily_total)
export const updateDailyTotal = async (date, userName, totalDuration) => {
  if (!AUTH_API_URL) throw new Error("Auth API URL not configured");

  try {
    const params = new URLSearchParams({
      action: 'set_daily_total',
      date,
      userName,
      totalDuration
    });

    const url = `${AUTH_API_URL}${AUTH_API_URL.includes('?') ? '&' : '?'}${params.toString()}`;
    await fetch(url, { method: "POST" });
    return { status: 'success', message: 'Daily total updated' };
  } catch (error) {
    console.error("Error setting daily total:", error);
    throw error;
  }
};
