/**
 * OSM OAuth 2.0 Authentication Module
 * Handles authentication with OpenStreetMap for note actions
 */

// OAuth Configuration
// Note: Client ID must be registered at https://www.openstreetmap.org/user/{username}/oauth_clients
// For production, set these via environment variables or config file
const OSM_OAUTH_CONFIG = {
  // Production Client ID (can be overridden via VITE_OSM_CLIENT_ID env var)
  clientId: import.meta.env.VITE_OSM_CLIENT_ID || 'u6fZ5psm4aMc72QKhr0b9bfcv9GRa3sYdbUFRjIkz1s',
  authorizationUrl: 'https://www.openstreetmap.org/oauth2/authorize',
  tokenUrl: 'https://www.openstreetmap.org/oauth2/token',
  // Redirect URI must match the one registered in OSM OAuth app
  redirectUri: `${window.location.origin}/pages/auth/callback.html`,
  scope: 'write_notes', // Permission for note actions (comment, close, reopen)
  apiBaseUrl: 'https://api.openstreetmap.org/api/0.6',
};

// Storage keys
const STORAGE_KEYS = {
  accessToken: 'osm_auth_access_token',
  tokenType: 'osm_auth_token_type',
  scope: 'osm_auth_scope',
  userInfo: 'osm_auth_user_info',
  oauthState: 'osm_oauth_state',
};

/**
 * Generate random state for CSRF protection
 * @returns {string} Random state string
 */
function generateRandomState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current user information from storage
 * @returns {Object|null} User info or null if not authenticated
 */
export function getCurrentUser() {
  try {
    const userInfoStr = localStorage.getItem(STORAGE_KEYS.userInfo);
    if (!userInfoStr) return null;

    const userInfo = JSON.parse(userInfoStr);

    // Check if token exists
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return null;

    return userInfo;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  return !!token;
}

/**
 * Get access token
 * @returns {string|null} Access token or null
 */
export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Initiate OAuth login flow
 * Redirects user to OSM authorization page
 */
export function initiateLogin() {
  const state = generateRandomState();
  sessionStorage.setItem(STORAGE_KEYS.oauthState, state);

  const params = new URLSearchParams({
    client_id: OSM_OAUTH_CONFIG.clientId,
    redirect_uri: OSM_OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: OSM_OAUTH_CONFIG.scope,
    state: state,
  });

  const authUrl = `${OSM_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 * Should be called from auth/callback.html page
 * @returns {Promise<Object>} User info
 */
export async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');

  // Check for errors
  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (!code) {
    throw new Error('No authorization code received');
  }

  // Validate state (CSRF protection)
  const savedState = sessionStorage.getItem(STORAGE_KEYS.oauthState);
  if (!state || state !== savedState) {
    throw new Error('Invalid state parameter. Possible CSRF attack.');
  }

  // Clear state
  sessionStorage.removeItem(STORAGE_KEYS.oauthState);

  try {
    // Exchange code for token
    const tokenResponse = await fetch(OSM_OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OSM_OAUTH_CONFIG.redirectUri,
        client_id: OSM_OAUTH_CONFIG.clientId,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    // Store tokens
    localStorage.setItem(STORAGE_KEYS.accessToken, tokenData.access_token);
    localStorage.setItem(STORAGE_KEYS.tokenType, tokenData.token_type || 'Bearer');
    if (tokenData.scope) {
      localStorage.setItem(STORAGE_KEYS.scope, tokenData.scope);
    }

    // Get user information
    const userInfo = await fetchUserDetails(tokenData.access_token);

    // Store user info
    localStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(userInfo));

    return userInfo;
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    throw error;
  }
}

/**
 * Fetch user details from OSM API
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} User details
 */
async function fetchUserDetails(accessToken) {
  const response = await fetch(`${OSM_OAUTH_CONFIG.apiBaseUrl}/user/details.json`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user details: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.user.id,
    username: data.user.display_name,
    accountCreated: data.user.account_created,
    changesets: data.user.changesets?.count || 0,
  };
}

/**
 * Logout user
 * Clears all stored authentication data
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.tokenType);
  localStorage.removeItem(STORAGE_KEYS.scope);
  localStorage.removeItem(STORAGE_KEYS.userInfo);
  sessionStorage.removeItem(STORAGE_KEYS.oauthState);
}

/**
 * Make authenticated request to OSM API
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated. Please log in first.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/xml', // OSM API uses XML
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token might be invalid
  if (response.status === 401) {
    logout();
    throw new Error('Authentication expired. Please log in again.');
  }

  return response;
}

/**
 * Comment on a note
 * @param {number|string} noteId - Note ID
 * @param {string} commentText - Comment text
 * @returns {Promise<Object>} API response
 */
export async function commentOnNote(noteId, commentText) {
  if (!isAuthenticated()) {
    throw new Error('Authentication required to comment on notes');
  }

  const url = `${OSM_OAUTH_CONFIG.apiBaseUrl}/notes/${noteId}/comment`;

  // OSM API expects XML format
  // Format: <osm><note id="..."><comment text="..."/></note></osm>
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <note id="${noteId}">
    <comment text="${escapeXml(commentText)}" />
  </note>
</osm>`;

  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: xmlBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to comment on note: ${response.status} ${errorText}`);
  }

  return await response.text(); // OSM API returns XML
}

/**
 * Close a note
 * @param {number|string} noteId - Note ID
 * @param {string} commentText - Optional comment text
 * @returns {Promise<Object>} API response
 */
export async function closeNote(noteId, commentText = '') {
  if (!isAuthenticated()) {
    throw new Error('Authentication required to close notes');
  }

  const url = `${OSM_OAUTH_CONFIG.apiBaseUrl}/notes/${noteId}/close`;

  let xmlBody;
  if (commentText) {
    xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <note id="${noteId}">
    <comment text="${escapeXml(commentText)}" />
  </note>
</osm>`;
  } else {
    xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <note id="${noteId}" />
</osm>`;
  }

  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: xmlBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to close note: ${response.status} ${errorText}`);
  }

  return await response.text();
}

/**
 * Reopen a note
 * @param {number|string} noteId - Note ID
 * @param {string} commentText - Optional comment text
 * @returns {Promise<Object>} API response
 */
export async function reopenNote(noteId, commentText = '') {
  if (!isAuthenticated()) {
    throw new Error('Authentication required to reopen notes');
  }

  const url = `${OSM_OAUTH_CONFIG.apiBaseUrl}/notes/${noteId}/reopen`;

  let xmlBody;
  if (commentText) {
    xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <note id="${noteId}">
    <comment text="${escapeXml(commentText)}" />
  </note>
</osm>`;
  } else {
    xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <note id="${noteId}" />
</osm>`;
  }

  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: xmlBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to reopen note: ${response.status} ${errorText}`);
  }

  return await response.text();
}

/**
 * Escape XML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Check if user has required permissions
 * @param {string} requiredScope - Required scope (e.g., 'write_notes')
 * @returns {boolean} True if user has permission
 */
export function hasPermission(requiredScope) {
  const scope = localStorage.getItem(STORAGE_KEYS.scope);
  if (!scope) return false;

  const scopes = scope.split(' ');
  return scopes.includes(requiredScope);
}
