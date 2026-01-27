// Cache utility for localStorage management

const CACHE_PREFIX = 'osm_notes_';
const CACHE_VERSION = '1.0';

/**
 * Save data to localStorage with timestamp
 */
export function cacheSet(key, data) {
  try {
    const cacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.warn('Failed to cache data:', error);
    return false;
  }
}

/**
 * Get data from localStorage if valid
 */
export function cacheGet(key, maxAge = 15 * 60 * 1000) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // Check version
    if (cacheData.version !== CACHE_VERSION) {
      cacheDelete(key);
      return null;
    }

    // Check age
    const age = Date.now() - cacheData.timestamp;
    if (age > maxAge) {
      cacheDelete(key);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn('Failed to get cached data:', error);
    return null;
  }
}

/**
 * Delete specific cache entry
 */
export function cacheDelete(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
    return true;
  } catch (error) {
    console.warn('Failed to delete cache:', error);
    return false;
  }
}

/**
 * Clear all cache
 */
export function cacheClear() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.warn('Failed to clear cache:', error);
    return false;
  }
}

/**
 * Get cache info (size, entries)
 */
export function cacheInfo() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
  let totalSize = 0;

  keys.forEach((key) => {
    const item = localStorage.getItem(key);
    totalSize += item ? item.length : 0;
  });

  return {
    entries: keys.length,
    sizeBytes: totalSize,
    sizeKB: (totalSize / 1024).toFixed(2),
    sizeMB: (totalSize / 1024 / 1024).toFixed(2),
  };
}
