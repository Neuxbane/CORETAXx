// Enhanced sync service with authentication support for CORETAX
// Handles local changes queue, authenticated sync, and data persistence

const SYNC_QUEUE_KEY = 'syncQueue';
const LAST_SYNC_KEY = 'lastSyncAt';
const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

const API_BASE = '/api';
const AUTH_ENDPOINT = `${API_BASE}/auth.php`;
const USERS_ENDPOINT = `${API_BASE}/users.php`;
const SYNC_ENDPOINT = `${API_BASE}/sync.php`;
const FILES_ENDPOINT = `${API_BASE}/files.php`;
const OTP_ENDPOINT = `${API_BASE}/otp.php`;

// ========== Token Management ==========
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function setAuthUser(user) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

// ========== API Helpers ==========
async function apiRequest(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// ========== Auth API ==========
async function register(userData) {
  const response = await apiRequest(`${AUTH_ENDPOINT}?action=register`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  if (response.success && response.token) {
    setAuthToken(response.token);
    setAuthUser(response.user);
  }
  
  return response;
}

async function login(identifier, password, location = null) {
  const response = await apiRequest(`${AUTH_ENDPOINT}?action=login`, {
    method: 'POST',
    body: JSON.stringify({ identifier, password, location }),
  });
  
  if (response.success && response.token) {
    setAuthToken(response.token);
    setAuthUser(response.user);
    
    // Pull user data from server after login
    await pullSnapshot();
  }
  
  return response;
}

async function logout() {
  try {
    await apiRequest(`${AUTH_ENDPOINT}?action=logout`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Logout request failed', err);
  }
  
  clearAuth();
  writeQueue([]);
}

async function logoutAll() {
  try {
    await apiRequest(`${AUTH_ENDPOINT}?action=logout-all`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Logout all request failed', err);
  }
  
  clearAuth();
  writeQueue([]);
}

async function verifySession() {
  try {
    const response = await apiRequest(`${AUTH_ENDPOINT}?action=verify`);
    if (response.success && response.user) {
      setAuthUser(response.user);
      return response.user;
    }
  } catch (err) {
    if (err.status === 401) {
      clearAuth();
    }
    throw err;
  }
  return null;
}

async function refreshToken() {
  try {
    const response = await apiRequest(`${AUTH_ENDPOINT}?action=refresh`, {
      method: 'POST',
    });
    
    if (response.success && response.token) {
      setAuthToken(response.token);
      setAuthUser(response.user);
      return response;
    }
  } catch (err) {
    if (err.status === 401) {
      clearAuth();
    }
    throw err;
  }
  return null;
}

async function changePassword(oldPassword, newPassword, logoutOtherSessions = false) {
  return await apiRequest(`${AUTH_ENDPOINT}?action=change-password`, {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword, logoutOtherSessions }),
  });
}

async function forgotPassword(email) {
  return await apiRequest(`${AUTH_ENDPOINT}?action=forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

async function resetPassword(email, token, newPassword) {
  return await apiRequest(`${AUTH_ENDPOINT}?action=reset-password`, {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

// ========== User Profile API ==========
async function getProfile() {
  return await apiRequest(`${USERS_ENDPOINT}?action=profile`);
}

async function updateProfile(profileData) {
  return await apiRequest(`${USERS_ENDPOINT}?action=profile`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

async function listTransferUsers() {
  return await apiRequest(`${USERS_ENDPOINT}?action=list`);
}

// ========== User Data API ==========
async function getUserData(key = null) {
  const url = key 
    ? `${USERS_ENDPOINT}?action=data&key=${encodeURIComponent(key)}`
    : `${USERS_ENDPOINT}?action=data`;
  return await apiRequest(url);
}

async function setUserData(key, value) {
  return await apiRequest(`${USERS_ENDPOINT}?action=data`, {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

async function setUserDataBulk(items) {
  return await apiRequest(`${USERS_ENDPOINT}?action=data-bulk`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// ========== Location API ==========
async function updateLocation(currentLocation) {
  return await apiRequest(`${USERS_ENDPOINT}?action=location`, {
    method: 'POST',
    body: JSON.stringify({ currentLocation }),
  });
}

// ========== Admin APIs ==========
async function getAllUsers() {
  return await apiRequest(`${AUTH_ENDPOINT}?action=users`);
}

async function updateUserStatus(userId, isActive) {
  return await apiRequest(`${AUTH_ENDPOINT}?action=update-user-status`, {
    method: 'POST',
    body: JSON.stringify({ userId, isActive }),
  });
}

async function getAllLocations() {
  return await apiRequest(`${USERS_ENDPOINT}?action=all-locations`);
}

async function getAllAssets() {
  return await apiRequest(`${USERS_ENDPOINT}?action=all-assets`);
}

async function getAllTransactions() {
  return await apiRequest(`${USERS_ENDPOINT}?action=all-transactions`);
}

// ========== Sync Queue Management ==========
function readQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Sync queue read error', err);
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Sync queue write error', err);
  }
}

async function recordChange(key, payload) {
  const queue = readQueue();
  const user = getAuthUser();
  
  const change = {
    key,
    payload,
    timestamp: new Date().toISOString(),
    userId: user ? user.id : (window.storage ? window.storage.getSession() : null),
  };
  
  queue.push(change);
  writeQueue(queue);
  
  console.log(`[Sync] Recorded change for ${key}, queue length: ${queue.length}`);

  // Attempt to flush immediately if online and authenticated
  if (navigator.onLine && getAuthToken()) {
    try {
      const result = await flush();
      console.log(`[Sync] Flush result:`, result);
      return result;
    } catch (err) {
      console.warn('[Sync] Immediate flush failed, will retry later', err);
      return { success: false, error: err.message, queued: true };
    }
  } else {
    console.log(`[Sync] Offline or no token, change queued for later`);
    return { success: false, queued: true, reason: !navigator.onLine ? 'offline' : 'no-token' };
  }
}

async function flush() {
  const queue = readQueue();
  if (queue.length === 0) {
    console.log('[Sync] Nothing to flush');
    return { success: true, sent: 0 };
  }

  const token = getAuthToken();
  if (!token) {
    console.warn('[Sync] No auth token, skipping sync flush');
    return { success: false, error: 'No auth token' };
  }

  console.log(`[Sync] Flushing ${queue.length} changes to server...`);

  try {
    const response = await apiRequest(SYNC_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        changes: queue,
      }),
    });

    console.log('[Sync] Server response:', response);

    if (response.success) {
      writeQueue([]);
      localStorage.setItem(LAST_SYNC_KEY, response.lastSync || new Date().toISOString());
      notifySyncComplete('push', queue.length);
      console.log(`[Sync] Successfully synced ${queue.length} changes`);
      return { success: true, sent: queue.length };
    }
    
    console.warn('[Sync] Server returned success: false');
    return { success: false, error: 'Sync failed' };
  } catch (err) {
    console.error('[Sync] Flush error:', err);
    return { success: false, error: err.message };
  }
}

// ========== Real-time Sync System ==========
let syncInterval = null;
const SYNC_INTERVAL_MS = 30000; // 30 seconds
const syncListeners = [];

function addSyncListener(callback) {
  if (typeof callback === 'function') {
    syncListeners.push(callback);
  }
}

function removeSyncListener(callback) {
  const idx = syncListeners.indexOf(callback);
  if (idx > -1) syncListeners.splice(idx, 1);
}

function notifySyncComplete(type, count) {
  syncListeners.forEach(cb => {
    try { cb({ type, count, timestamp: new Date().toISOString() }); }
    catch (err) { console.warn('Sync listener error', err); }
  });
}

async function periodicSync() {
  if (!getAuthToken()) return;
  
  try {
    // First flush any pending changes
    await flush();
    
    // Then pull latest from server
    const result = await pullSnapshot();
    if (result.applied) {
      notifySyncComplete('pull', Object.keys(result.data || {}).length);
    }
  } catch (err) {
    console.warn('Periodic sync error', err);
  }
}

function startPeriodicSync() {
  if (syncInterval) return;
  
  syncInterval = setInterval(periodicSync, SYNC_INTERVAL_MS);
  console.log('Periodic sync started');
}

function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Periodic sync stopped');
  }
}

function init() {
  // Sync when coming back online
  window.addEventListener('online', () => {
    if (getAuthToken()) {
      flush();
      periodicSync();
    }
  });
  
  // Handle visibility change - sync when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getAuthToken()) {
      periodicSync();
    }
  });
  
  // Start periodic sync if authenticated
  if (getAuthToken()) {
    startPeriodicSync();
  }
  
  // Handle before unload - try to flush pending changes
  window.addEventListener('beforeunload', () => {
    if (getAuthToken() && readQueue().length > 0) {
      // Use sendBeacon for reliable delivery
      const queue = readQueue();
      if (queue.length > 0) {
        navigator.sendBeacon(SYNC_ENDPOINT, JSON.stringify({
          changes: queue,
          token: getAuthToken()
        }));
      }
    }
  });
}

function getLastSync() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

async function pullSnapshot(userId) {
  const token = getAuthToken();
  
  // Use authenticated endpoint if we have a token
  if (token) {
    try {
      const since = getLastSync();
      const url = since 
        ? `${SYNC_ENDPOINT}?since=${encodeURIComponent(since)}`
        : SYNC_ENDPOINT;
        
      const data = await apiRequest(url);
      
      if (data && data.data) {
        Object.entries(data.data).forEach(([key, value]) => {
          if (key === '_user') {
            setAuthUser(value);
            return;
          }
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (err) {
            console.warn('Snapshot apply error', key, err);
          }
        });
        if (data.lastSync) {
          localStorage.setItem(LAST_SYNC_KEY, data.lastSync);
        }
        return { applied: true, data: data.data };
      }
    } catch (err) {
      console.warn('Authenticated snapshot pull failed', err);
    }
  }
  
  // Fallback to legacy userId-based sync
  if (!userId) return { applied: false };
  
  try {
    const res = await fetch(`${SYNC_ENDPOINT}?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch snapshot');
    const data = await res.json();
    if (data && data.data) {
      Object.entries(data.data).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
          console.warn('Snapshot apply error', key, err);
        }
      });
      if (data.lastSync) {
        localStorage.setItem(LAST_SYNC_KEY, data.lastSync);
      }
      return { applied: true };
    }
  } catch (err) {
    console.warn('Snapshot pull failed', err);
  }
  return { applied: false };
}

async function pushAllData() {
  const token = getAuthToken();
  if (!token) {
    console.warn('No auth token, cannot push data');
    return { success: false, error: 'No auth token' };
  }

  const keysToSync = ['users', 'assets', 'taxes', 'transactions', 'userLocations'];
  const changes = [];

  keysToSync.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        changes.push({
          key,
          payload: JSON.parse(value),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Error parsing local data for sync', key, err);
      }
    }
  });

  if (changes.length === 0) {
    return { success: true, sent: 0 };
  }

  try {
    const response = await apiRequest(SYNC_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });

    if (response.success) {
      localStorage.setItem(LAST_SYNC_KEY, response.lastSync || new Date().toISOString());
      return { success: true, sent: changes.length };
    }
    
    return { success: false, error: 'Push failed' };
  } catch (err) {
    console.warn('Push all data failed', err);
    return { success: false, error: err.message };
  }
}

// ========== File Upload API ==========
async function uploadFile(file, type = 'image', assetId = null) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (assetId) formData.append('assetId', assetId);
  
  const response = await fetch(`${FILES_ENDPOINT}?action=upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  return data;
}

async function uploadBase64(base64Data, name, type = 'image', assetId = null) {
  return await apiRequest(`${FILES_ENDPOINT}?action=upload-base64`, {
    method: 'POST',
    body: JSON.stringify({ data: base64Data, name, type, assetId }),
  });
}

async function uploadBulk(files, assetId = null) {
  return await apiRequest(`${FILES_ENDPOINT}?action=upload-bulk`, {
    method: 'POST',
    body: JSON.stringify({ files, assetId }),
  });
}

async function listFiles(assetId = null, type = null) {
  let url = `${FILES_ENDPOINT}?action=list`;
  if (assetId) url += `&assetId=${encodeURIComponent(assetId)}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  return await apiRequest(url);
}

async function deleteFile(fileId) {
  return await apiRequest(`${FILES_ENDPOINT}?action=delete&id=${encodeURIComponent(fileId)}`, {
    method: 'POST',
  });
}

function getFileUrl(fileId) {
  return `${FILES_ENDPOINT}?action=download&id=${encodeURIComponent(fileId)}`;
}

// ========== OTP API ==========
async function sendOtp(email, name = 'User') {
  const response = await fetch(`${OTP_ENDPOINT}?action=send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, name }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send OTP');
  }
  return data;
}

async function verifyOtp(email, code) {
  const response = await fetch(`${OTP_ENDPOINT}?action=verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Invalid OTP');
    error.status = response.status;
    throw error;
  }
  return data;
}

// ========== Export ==========
window.sync = {
  // Queue management
  recordChange,
  flush,
  getQueue: readQueue,
  init,
  getLastSync,
  pullSnapshot,
  pushAllData,
  
  // Auth
  register,
  login,
  logout,
  logoutAll,
  verifySession,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  getAuthToken,
  getAuthUser,
  setAuthToken,
  setAuthUser,
  clearAuth,
  
  // Profile
  getProfile,
  updateProfile,
  listTransferUsers,
  
  // User data
  getUserData,
  setUserData,
  setUserDataBulk,
  updateLocation,
  
  // Admin
  getAllUsers,
  updateUserStatus,
  getAllLocations,
  getAllAssets,
  getAllTransactions,
  
  // Files
  uploadFile,
  uploadBase64,
  uploadBulk,
  listFiles,
  deleteFile,
  getFileUrl,
  
  // OTP
  sendOtp,
  verifyOtp,
  
  // Real-time sync
  startPeriodicSync,
  stopPeriodicSync,
  periodicSync,
  addSyncListener,
  removeSyncListener,
  
  // Helper
  apiRequest,
};
