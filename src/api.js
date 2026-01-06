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

export const createRecord = async (data) => {
  try {
    const params = new URLSearchParams({
      ...cleanParams(data),
      action: 'create'
    });

    const urlWithParams = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;

    console.log("Creating Record URL:", urlWithParams);

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
