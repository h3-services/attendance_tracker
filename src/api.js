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
    date: item.date || item['Date'] || item['date'],
    userName: item.userName || item['User Name'] || item['Name'] || item['user name'],
    sessionNo: item.sessionNo || item['Session No'] || item['Session'] || item['session no'],
    startTime: item.startTime || item['Start Time'] || item['start time'],
    endTime: item.endTime || item['End Time'] || item['end time'],
    duration: item.duration || item['Duration'] || item['duration'],
    workDescription: item.workDescription || item['Work Description'] || item['work description'],
    status: item.status || item['Status'] || item['status'],
    project: item.project || item['Project'] || item['project'],
    category: item.category || item['category'] || item['Category'],
    approvedState: item.approvedState || item['Approved State'] || item['Approved'] || item['approved state'],
    approvedBy: item.approvedBy || item['Approved By'] || item['approved by']
  }));
};

export const fetchData = async () => {
  try {
    const response = await fetch(getUrl('read'));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await handleResponse(response);
    return normalizeData(rawData);
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};


export const createRecord = async (data) => {
  try {
    // Explicitly construct params to avoid any object spread weirdness
    const params = new URLSearchParams();
    params.append('action', 'create');

    // Check and append each field efficiently
    if (data.date) params.append('date', data.date);
    if (data.userName) params.append('userName', data.userName);
    if (data.sessionNo) params.append('sessionNo', data.sessionNo);
    if (data.startTime) params.append('startTime', data.startTime);
    if (data.endTime) params.append('endTime', data.endTime);
    if (data.duration) params.append('duration', data.duration);
    if (data.workDescription) params.append('workDescription', data.workDescription);
    if (data.status) params.append('status', data.status);
    if (data.project) params.append('project', data.project);
    if (data.category) params.append('category', data.category);
    if (data.approvedState) params.append('approvedState', data.approvedState);
    if (data.approvedBy) params.append('approvedBy', data.approvedBy);

    const urlWithParams = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;

    console.log("Creating Record URL:", urlWithParams); // Debugging

    // Use POST with text/plain to avoid CORS strictness, but data is in URL
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
      ...data,
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
