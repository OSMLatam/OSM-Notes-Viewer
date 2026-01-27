// Data validation utilities

/**
 * Validate user data structure
 */
export function validateUser(user) {
  if (!user) return false;

  const required = ['user_id', 'username'];
  return required.every((field) => user.hasOwnProperty(field));
}

/**
 * Validate country data structure
 */
export function validateCountry(country) {
  if (!country) return false;

  const required = ['country_id'];
  return required.every((field) => country.hasOwnProperty(field));
}

/**
 * Validate metadata structure
 */
export function validateMetadata(metadata) {
  if (!metadata) return false;

  const required = ['export_date', 'total_users', 'total_countries'];
  return required.every((field) => metadata.hasOwnProperty(field));
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate and parse user ID
 */
export function parseUserId(input) {
  const id = parseInt(input, 10);
  if (isNaN(id) || id < 0) {
    throw new Error('Invalid user ID');
  }
  return id;
}

/**
 * Validate and parse country ID
 */
export function parseCountryId(input) {
  const id = parseInt(input, 10);
  if (isNaN(id) || id < 0) {
    throw new Error('Invalid country ID');
  }
  return id;
}

/**
 * Validate and parse note ID
 * @param {string|number} input - Note ID input
 * @returns {number} Parsed note ID
 * @throws {Error} If note ID is invalid
 */
export function parseNoteId(input) {
  const id = parseInt(input, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid note ID. Note ID must be a positive number.');
  }
  return id;
}

/**
 * Validate latitude coordinate
 * @param {number} lat - Latitude
 * @returns {boolean} True if valid
 */
export function validateLatitude(lat) {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude coordinate
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
export function validateLongitude(lon) {
  return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180;
}

/**
 * Validate coordinates (latitude and longitude)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if both coordinates are valid
 */
export function validateCoordinates(lat, lon) {
  return validateLatitude(lat) && validateLongitude(lon);
}

/**
 * Validate date string (ISO 8601 format)
 * @param {string} dateStr - Date string
 * @returns {boolean} True if valid date format
 */
export function validateDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate hashtag format
 * @param {string} hashtag - Hashtag string
 * @returns {boolean} True if valid hashtag format
 */
export function validateHashtag(hashtag) {
  if (typeof hashtag !== 'string') return false;
  // Hashtag should be alphanumeric, underscore, or hyphen, 1-100 chars
  const hashtagRegex = /^[a-zA-Z0-9_-]{1,100}$/;
  return hashtagRegex.test(hashtag);
}

/**
 * Validate URL format
 * @param {string} url - URL string
 * @returns {boolean} True if valid URL
 */
export function validateUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format (basic)
 * @param {string} email - Email string
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
