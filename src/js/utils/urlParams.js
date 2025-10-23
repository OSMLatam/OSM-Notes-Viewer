// URL parameter utilities

/**
 * Get URL parameter by name
 */
export function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Get all URL parameters as object
 */
export function getAllUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    return params;
}

/**
 * Set URL parameter without reload
 */
export function setUrlParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

/**
 * Remove URL parameter without reload
 */
export function removeUrlParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.pushState({}, '', url);
}

/**
 * Build query string from object
 */
export function buildQueryString(params) {
    const searchParams = new URLSearchParams(params);
    return searchParams.toString();
}

