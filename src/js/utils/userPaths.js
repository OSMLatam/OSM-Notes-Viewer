/**
 * Utility functions for calculating user file paths with hexadecimal directory structure
 * @module utils/userPaths
 */

/**
 * Calculates the hexadecimal subdirectory for a user_id
 * Uses modulo 4096 for uniform distribution across 4096 possible directories
 * @param {number|string} userId - User ID
 * @returns {string} Subdirectory path in format "x/y/z"
 * @example
 * getUserSubdir(12345) // Returns "0/3/9"
 * getUserSubdir(23670762) // Returns "f/e/a"
 */
export function getUserSubdir(userId) {
    // Convert to number if string
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    // Modulo 4096 for uniform distribution
    const mod = id % 4096;

    // Convert to hexadecimal with 3 digits (pad with zeros)
    const hexMod = mod.toString(16).padStart(3, '0');

    // Divide into 3 levels: first char, second char, third char
    return `${hexMod[0]}/${hexMod[1]}/${hexMod[2]}`;
}

/**
 * Gets the complete file path for a user JSON file
 * @param {number|string} userId - User ID
 * @returns {string} Complete path like "/users/0/3/9/12345.json"
 * @example
 * getUserPath(12345) // Returns "/users/0/3/9/12345.json"
 * getUserPath(23670762) // Returns "/users/f/e/a/23670762.json"
 */
export function getUserPath(userId) {
    const subdir = getUserSubdir(userId);
    return `/users/${subdir}/${userId}.json`;
}

/**
 * Gets the complete URL for a user JSON file (with base URL if provided)
 * @param {number|string} userId - User ID
 * @param {string} baseUrl - Optional base URL to prepend
 * @returns {string} Complete URL
 * @example
 * getUserUrl(12345, '/data') // Returns "/data/users/0/3/9/12345.json"
 */
export function getUserUrl(userId, baseUrl = '') {
    return `${baseUrl}${getUserPath(userId)}`;
}
