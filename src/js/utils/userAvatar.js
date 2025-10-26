// User Avatar Utility
// Functions to get user avatar images

// Cache para avatares de OSM para evitar múltiples llamadas
const osmAvatarCache = new Map();

/**
 * Get OpenStreetMap user avatar URL
 * OSM stores user avatars on S3 or Gravatar
 * We'll try to fetch from the user's public profile
 * @param {number} userId - OSM user ID
 * @returns {Promise<string>} Avatar URL or empty string
 */
export async function getOSMUserAvatar(userId) {
    if (!userId) return '';

    // Check cache first
    if (osmAvatarCache.has(userId)) {
        const cached = osmAvatarCache.get(userId);
        if (cached === null) return ''; // Cached as "no avatar"
        return cached;
    }

    try {
        // Fetch user details from OSM API v0.6 (XML format)
        const response = await fetch(`https://www.openstreetmap.org/api/0.6/user/${userId}`, {
            method: 'GET',
        });

        if (response.ok) {
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');

            // OSM API returns XML like this:
            // <osm version="0.6">
            //   <user id="..." display_name="..." account_created="...">
            //     <img href="https://..." />
            //   </user>
            // </osm>

            const userElement = xmlDoc.querySelector('user');
            if (userElement) {
                const imgElement = userElement.querySelector('img');
                if (imgElement) {
                    const href = imgElement.getAttribute('href');
                    if (href && href.startsWith('http')) {
                        osmAvatarCache.set(userId, href);
                        return href;
                    }
                }
            }
        }
    } catch (error) {
        console.debug('Could not fetch OSM avatar:', error);
    }

    // Cache null to avoid retrying
    osmAvatarCache.set(userId, null);
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

    // First check cache for OSM avatar
    if (user.user_id && osmAvatarCache.has(user.user_id)) {
        const cached = osmAvatarCache.get(user.user_id);
        if (cached && cached.startsWith('http')) {
            return cached;
        }
    }

    // Return generated avatar as fallback
    return generateAvatarFromUsername(user.username, size);
}

/**
 * Start loading OSM avatar in background and update when ready
 * @param {Object} user - User object with user_id and username
 * @param {HTMLElement} imgElement - Image element to update
 * @returns {void}
 */
export async function loadOSMAvatarInBackground(user, imgElement) {
    if (!user || !user.user_id || !imgElement) return;

    try {
        const osmAvatar = await getOSMUserAvatar(user.user_id);
        if (osmAvatar && imgElement.src) {
            // Only update if the current image is still the generated one
            if (imgElement.src.includes('ui-avatars.com')) {
                imgElement.src = osmAvatar;
            }
        }
    } catch (error) {
        // Silently fail, keep generated avatar
        console.debug('Failed to load OSM avatar in background:', error);
    }
}

