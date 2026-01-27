/**
 * Tests for Map Viewer Page
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Calculate bounding box around a point
 * This function is extracted from mapViewer.js for testing
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Bounding box {minLon, minLat, maxLon, maxLat}
 */
function calculateBbox(lat, lon, radiusKm) {
  // Approximate: 1 degree latitude ≈ 111 km
  // Longitude varies by latitude: 1 degree ≈ 111 km * cos(latitude)
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    minLon: lon - lonDelta,
    minLat: lat - latDelta,
    maxLon: lon + lonDelta,
    maxLat: lat + latDelta,
  };
}

/**
 * Calculate appropriate zoom level for a bounding box
 * This function is extracted from mapViewer.js for testing
 * @param {Object} bbox - Bounding box
 * @returns {number} Zoom level
 */
function calculateZoomForBbox(bbox) {
  const latDiff = bbox.maxLat - bbox.minLat;
  const lonDiff = bbox.maxLon - bbox.minLon;
  const maxDiff = Math.max(latDiff, lonDiff);

  // Approximate zoom calculation
  if (maxDiff > 180) return 2;
  if (maxDiff > 90) return 3;
  if (maxDiff > 45) return 4;
  if (maxDiff > 22.5) return 5;
  if (maxDiff > 11.25) return 6;
  if (maxDiff > 5.625) return 7;
  if (maxDiff > 2.813) return 8;
  if (maxDiff > 1.406) return 9;
  if (maxDiff > 0.703) return 10;
  return 11;
}

describe('Map Viewer', () => {
  describe('calculateBbox', () => {
    it('should calculate bbox for 500km radius at equator', () => {
      const lat = 0;
      const lon = 0;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);

      // At equator, lat and lon deltas should be approximately equal
      expect(bbox.minLat).toBeLessThan(lat);
      expect(bbox.maxLat).toBeGreaterThan(lat);
      expect(bbox.minLon).toBeLessThan(lon);
      expect(bbox.maxLon).toBeGreaterThan(lon);

      // Check approximate size (500km ≈ 4.5 degrees at equator, but bbox spans 2*delta)
      const latDiff = bbox.maxLat - bbox.minLat;
      expect(latDiff).toBeCloseTo((500 / 111) * 2, 1);
    });

    it('should calculate bbox for 500km radius at mid-latitudes', () => {
      const lat = 40; // New York area
      const lon = -74;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);

      expect(bbox.minLat).toBeLessThan(lat);
      expect(bbox.maxLat).toBeGreaterThan(lat);
      expect(bbox.minLon).toBeLessThan(lon);
      expect(bbox.maxLon).toBeGreaterThan(lon);

      // Longitude delta should be larger than latitude delta at mid-latitudes
      const latDiff = bbox.maxLat - bbox.minLat;
      const lonDiff = bbox.maxLon - bbox.minLon;
      expect(lonDiff).toBeGreaterThan(latDiff);
    });

    it('should calculate bbox for 500km radius at high latitudes', () => {
      const lat = 60; // Northern Europe
      const lon = 10;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);

      expect(bbox.minLat).toBeLessThan(lat);
      expect(bbox.maxLat).toBeGreaterThan(lat);
      expect(bbox.minLon).toBeLessThan(lon);
      expect(bbox.maxLon).toBeGreaterThan(lon);

      // Longitude delta should be much larger at high latitudes
      const latDiff = bbox.maxLat - bbox.minLat;
      const lonDiff = bbox.maxLon - bbox.minLon;
      expect(lonDiff).toBeGreaterThan(latDiff * 1.5);
    });

    it('should calculate symmetric bbox around point', () => {
      const lat = 0;
      const lon = 0;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);

      const latDiff = bbox.maxLat - bbox.minLat;
      const lonDiff = bbox.maxLon - bbox.minLon;

      // Center should be approximately in the middle
      const centerLat = (bbox.maxLat + bbox.minLat) / 2;
      const centerLon = (bbox.maxLon + bbox.minLon) / 2;

      expect(centerLat).toBeCloseTo(lat, 1);
      expect(centerLon).toBeCloseTo(lon, 1);
    });

    it('should handle different radius values', () => {
      const lat = 0;
      const lon = 0;
      const bbox100 = calculateBbox(lat, lon, 100);
      const bbox500 = calculateBbox(lat, lon, 500);
      const bbox1000 = calculateBbox(lat, lon, 1000);

      const size100 = (bbox100.maxLat - bbox100.minLat) * (bbox100.maxLon - bbox100.minLon);
      const size500 = (bbox500.maxLat - bbox500.minLat) * (bbox500.maxLon - bbox500.minLon);
      const size1000 = (bbox1000.maxLat - bbox1000.minLat) * (bbox1000.maxLon - bbox1000.minLon);

      expect(size500).toBeGreaterThan(size100);
      expect(size1000).toBeGreaterThan(size500);
    });

    it('should return valid bbox structure', () => {
      const bbox = calculateBbox(0, 0, 500);
      expect(bbox).toHaveProperty('minLon');
      expect(bbox).toHaveProperty('minLat');
      expect(bbox).toHaveProperty('maxLon');
      expect(bbox).toHaveProperty('maxLat');
      expect(typeof bbox.minLon).toBe('number');
      expect(typeof bbox.minLat).toBe('number');
      expect(typeof bbox.maxLon).toBe('number');
      expect(typeof bbox.maxLat).toBe('number');
    });

    it('should handle negative coordinates', () => {
      const lat = -34; // Buenos Aires
      const lon = -58;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);

      expect(bbox.minLat).toBeLessThan(lat);
      expect(bbox.maxLat).toBeGreaterThan(lat);
      expect(bbox.minLon).toBeLessThan(lon);
      expect(bbox.maxLon).toBeGreaterThan(lon);
    });
  });

  describe('calculateZoomForBbox', () => {
    it('should return zoom 2 for very large bbox', () => {
      const bbox = { minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 };
      const zoom = calculateZoomForBbox(bbox);
      expect(zoom).toBe(2);
    });

    it('should return zoom 3 for large bbox', () => {
      const bbox = { minLon: -90, minLat: -45, maxLon: 90, maxLat: 45 };
      const zoom = calculateZoomForBbox(bbox);
      expect(zoom).toBe(3);
    });

    it('should return zoom 6-8 for medium bbox (500km)', () => {
      // 500km ≈ 4.5 degrees at equator (total span ≈ 9 degrees)
      const bbox = { minLon: -2.25, minLat: -2.25, maxLon: 2.25, maxLat: 2.25 };
      const zoom = calculateZoomForBbox(bbox);
      expect(zoom).toBeGreaterThanOrEqual(6);
      expect(zoom).toBeLessThanOrEqual(8);
    });

    it('should return zoom 10-11 for small bbox', () => {
      const bbox = { minLon: -0.5, minLat: -0.5, maxLon: 0.5, maxLat: 0.5 };
      const zoom = calculateZoomForBbox(bbox);
      // 1 degree difference should give zoom 10
      expect(zoom).toBeGreaterThanOrEqual(10);
      expect(zoom).toBeLessThanOrEqual(11);
    });

    it('should use max difference for zoom calculation', () => {
      // Wide but narrow bbox
      const bbox = { minLon: -10, minLat: -1, maxLon: 10, maxLat: 1 };
      const zoom = calculateZoomForBbox(bbox);
      // Should use lonDiff (20) for calculation, which gives zoom 5
      expect(zoom).toBeLessThanOrEqual(6);
    });

    it('should handle edge cases', () => {
      const bbox1 = { minLon: 0, minLat: 0, maxLon: 0.7, maxLat: 0.7 };
      const zoom1 = calculateZoomForBbox(bbox1);
      // 0.7 < 0.703, so should return 11 (default)
      expect(zoom1).toBe(11);

      const bbox2 = { minLon: 0, minLat: 0, maxLon: 0.704, maxLat: 0.704 };
      const zoom2 = calculateZoomForBbox(bbox2);
      // 0.704 > 0.703, so should return 10
      expect(zoom2).toBe(10);
    });

    it('should return valid zoom level', () => {
      const bbox = { minLon: -5, minLat: -5, maxLon: 5, maxLat: 5 };
      const zoom = calculateZoomForBbox(bbox);
      expect(zoom).toBeGreaterThanOrEqual(2);
      expect(zoom).toBeLessThanOrEqual(11);
      expect(Number.isInteger(zoom)).toBe(true);
    });
  });

  describe('500km bbox integration', () => {
    it('should calculate appropriate zoom for 500km bbox at equator', () => {
      const lat = 0;
      const lon = 0;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);
      const zoom = calculateZoomForBbox(bbox);

      // 500km bbox should result in zoom level around 6-7
      expect(zoom).toBeGreaterThanOrEqual(5);
      expect(zoom).toBeLessThanOrEqual(8);
    });

    it('should calculate appropriate zoom for 500km bbox at mid-latitudes', () => {
      const lat = 40;
      const lon = -74;
      const radiusKm = 500;
      const bbox = calculateBbox(lat, lon, radiusKm);
      const zoom = calculateZoomForBbox(bbox);

      expect(zoom).toBeGreaterThanOrEqual(5);
      expect(zoom).toBeLessThanOrEqual(8);
    });
  });
});
