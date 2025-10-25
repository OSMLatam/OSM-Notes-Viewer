// User Avatar Utility
// Functions to get user avatar images

/**
 * Get OpenStreetMap user avatar URL
 * OSM stores user images externally (typically on Gravatar or uploads)
 * We'll try to fetch from OSM API
 * @param {number} userId - OSM user ID
 * @returns {Promise<string>} Avatar URL or empty string
 */
export async function getOSMUserAvatar(userId) {
    if (!userId) return '';

    try {
        // Try to fetch user details from OSM API
        const response = await fetch(`https://www.openstreetmap.org/api/0.6/user/${userId}`, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const text = await response.text();
            // Parse XML to find img URL if available
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            const imgElement = xmlDoc.querySelector('img');

            if (imgElement && imgElement.getAttribute('href')) {
                return imgElement.getAttribute('href');
            }
        }
    } catch (error) {
        console.debug('Could not fetch OSM avatar:', error);
    }

    return '';
}

/**
 * Generate a simple avatar URL based on username using UI Avatars service
 * This is a fallback when OSM avatar is not available
 * @param {string} username - Username
 * @param {number} size - Avatar size in pixels (default: 200)
 * @returns {string} Avatar URL
 */
export function generateAvatarFromUsername(username, size = 200) {
    if (!username) return '';

    // Use UI Avatars service to generate avatar from username
    const encodedUsername = encodeURIComponent(username);
    return `https://ui-avatars.com/api/?name=${encodedUsername}&size=${size}&background=random&color=fff&bold=true&format=svg`;
}

/**
 * Get user avatar with fallback options
 * Tries OSM avatar first, then falls back to generated avatar
 * @param {Object} user - User object with user_id and username
 * @param {number} size - Avatar size in pixels (default: 200)
 * @returns {Promise<string>} Avatar URL
 */
export async function getUserAvatar(user, size = 200) {
    if (!user) return '';

    // Try to get OSM avatar
    if (user.user_id) {
        const osmAvatar = await getOSMUserAvatar(user.user_id);
        if (osmAvatar) {
            return osmAvatar;
        }
    }

    // Fallback: simple avatar generator based on username
    if (user.username) {
        return generateAvatarFromUsername(user.username, size);
    }

    return '';
}

/**
 * Get user avatar synchronously (uses generated avatar only)
 * This is faster but doesn't try to fetch from OSM
 * @param {Object} user - User object with username
 * @param {number} size - Avatar size in pixels (default: 200)
 * @returns {string} Avatar URL
 */
export function getUserAvatarSync(user, size = 200) {
    if (!user || !user.username) return '';
    return generateAvatarFromUsername(user.username, size);
}

