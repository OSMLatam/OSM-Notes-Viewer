// Data validation utilities

/**
 * Validate user data structure
 */
export function validateUser(user) {
    if (!user) return false;

    const required = ['user_id', 'username'];
    return required.every(field => user.hasOwnProperty(field));
}

/**
 * Validate country data structure
 */
export function validateCountry(country) {
    if (!country) return false;

    const required = ['country_id'];
    return required.every(field => country.hasOwnProperty(field));
}

/**
 * Validate metadata structure
 */
export function validateMetadata(metadata) {
    if (!metadata) return false;

    const required = ['export_date', 'total_users', 'total_countries'];
    return required.every(field => metadata.hasOwnProperty(field));
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(str) {
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

