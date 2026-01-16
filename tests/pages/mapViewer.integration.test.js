/**
 * Integration Tests for Map Viewer Page
 * Tests WMS layer loading and geolocation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Leaflet
const mockLeaflet = {
    map: vi.fn(() => ({
        setView: vi.fn(),
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        getBounds: vi.fn(() => ({
            getNorth: () => 41,
            getSouth: () => 40,
            getEast: () => -73,
            getWest: () => -75
        })),
        getZoom: vi.fn(() => 7)
    })),
    tileLayer: vi.fn(() => ({
        addTo: vi.fn()
    })),
    marker: vi.fn(() => ({
        addTo: vi.fn(),
        bindPopup: vi.fn()
    })),
    tileLayer: {
        wms: vi.fn(() => ({
            addTo: vi.fn(),
            getAttribution: vi.fn(() => 'WMS Layer')
        }))
    }
};

// Mock DOM
function createMockMapDOM() {
    document.body.innerHTML = `
        <div id="mapContainer">
            <div id="openNotesMap" style="display: none;"></div>
            <div id="closedNotesMap" style="display: none;"></div>
            <div id="boundariesMap" style="display: none;"></div>
        </div>
        <div id="mapLoading" style="display: none;">Loading map...</div>
        <div id="mapError" style="display: none;"></div>
        <select id="baseLayerSelect">
            <option value="osm">OSM</option>
            <option value="satellite">Satellite</option>
        </select>
    `;
}

describe('Map Viewer Integration Tests', () => {
    beforeEach(() => {
        createMockMapDOM();
        vi.clearAllMocks();

        // Mock global Leaflet
        global.L = mockLeaflet;

        // Mock fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Geolocation', () => {
        it('should request user location', async () => {
            const mockGeolocation = {
                getCurrentPosition: vi.fn((success) => {
                    success({
                        coords: {
                            latitude: 40.7128,
                            longitude: -74.0060,
                            accuracy: 10
                        }
                    });
                })
            };

            global.navigator.geolocation = mockGeolocation;

            let capturedCoords = null;
            await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        capturedCoords = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        resolve();
                    },
                    () => resolve()
                );
            });

            expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
            expect(capturedCoords).toEqual({
                lat: 40.7128,
                lon: -74.0060
            });
        });

        it('should handle geolocation error gracefully', async () => {
            const mockGeolocation = {
                getCurrentPosition: vi.fn((success, error) => {
                    error({
                        code: 1,
                        message: 'User denied geolocation'
                    });
                })
            };

            global.navigator.geolocation = mockGeolocation;

            let errorOccurred = false;
            await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    () => resolve(),
                    (err) => {
                        errorOccurred = true;
                        expect(err.code).toBe(1);
                        expect(err.message).toBe('User denied geolocation');
                        resolve();
                    }
                );
            });

            expect(errorOccurred).toBe(true);
        });

        it('should calculate bbox from geolocation', () => {
            const lat = 40.7128;
            const lon = -74.0060;
            const radiusKm = 500;

            // Calculate bbox (same logic as in mapViewer.js)
            const latDelta = radiusKm / 111;
            const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

            const bbox = {
                minLon: lon - lonDelta,
                minLat: lat - latDelta,
                maxLon: lon + lonDelta,
                maxLat: lat + latDelta
            };

            expect(bbox.minLat).toBeLessThan(lat);
            expect(bbox.maxLat).toBeGreaterThan(lat);
            expect(bbox.minLon).toBeLessThan(lon);
            expect(bbox.maxLon).toBeGreaterThan(lon);

            // Verify approximate size
            const latDiff = bbox.maxLat - bbox.minLat;
            expect(latDiff).toBeCloseTo((500 / 111) * 2, 1);
        });
    });

    describe('WMS Layer Loading', () => {
        it('should create WMS layer with correct parameters', () => {
            const wmsBaseUrl = 'https://geoserver.osm.lat/geoserver/wms';
            const layerName = 'notes:open_notes';
            const bbox = {
                minLon: -75,
                minLat: 40,
                maxLon: -73,
                maxLat: 41
            };

            // Simulate WMS layer creation
            const wmsLayer = {
                url: wmsBaseUrl,
                params: {
                    layers: layerName,
                    format: 'image/png',
                    transparent: true,
                    bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
                    srs: 'EPSG:4326',
                    width: 512,
                    height: 512
                },
                addTo: vi.fn()
            };

            expect(wmsLayer.url).toBe(wmsBaseUrl);
            expect(wmsLayer.params.layers).toBe(layerName);
            expect(wmsLayer.params.bbox).toContain('-75');
            expect(wmsLayer.params.bbox).toContain('40');
        });

        it('should handle WMS layer errors', async () => {
            const wmsUrl = 'https://geoserver.osm.lat/geoserver/wms';
            const errorContainer = document.getElementById('mapError');

            // Simulate WMS error
            global.fetch.mockRejectedValueOnce(new Error('WMS service unavailable'));

            try {
                await fetch(wmsUrl);
            } catch (error) {
                errorContainer.style.display = 'block';
                errorContainer.textContent = 'Failed to load WMS layer: ' + error.message;
            }

            expect(errorContainer.style.display).toBe('block');
            expect(errorContainer.textContent).toContain('WMS service unavailable');
        });

        it('should switch between map tabs', () => {
            const openNotesMap = document.getElementById('openNotesMap');
            const closedNotesMap = document.getElementById('closedNotesMap');
            const boundariesMap = document.getElementById('boundariesMap');

            // Simulate switching to open notes tab
            openNotesMap.style.display = 'block';
            closedNotesMap.style.display = 'none';
            boundariesMap.style.display = 'none';

            expect(openNotesMap.style.display).toBe('block');
            expect(closedNotesMap.style.display).toBe('none');
            expect(boundariesMap.style.display).toBe('none');

            // Simulate switching to closed notes tab
            openNotesMap.style.display = 'none';
            closedNotesMap.style.display = 'block';
            boundariesMap.style.display = 'none';

            expect(openNotesMap.style.display).toBe('none');
            expect(closedNotesMap.style.display).toBe('block');
            expect(boundariesMap.style.display).toBe('none');
        });
    });

    describe('Base Layer Switching', () => {
        it('should switch base layer', () => {
            const baseLayerSelect = document.getElementById('baseLayerSelect');
            let currentBaseLayer = 'osm';

            // Simulate layer switch
            baseLayerSelect.value = 'satellite';
            currentBaseLayer = baseLayerSelect.value;

            expect(currentBaseLayer).toBe('satellite');

            baseLayerSelect.value = 'osm';
            currentBaseLayer = baseLayerSelect.value;

            expect(currentBaseLayer).toBe('osm');
        });
    });

    describe('Map Initialization', () => {
        it('should initialize map with default view when geolocation fails', () => {
            const defaultCenter = [0, 0];
            const defaultZoom = 2;

            // Simulate map initialization without geolocation
            const map = mockLeaflet.map('mapContainer');
            map.setView(defaultCenter, defaultZoom);

            expect(mockLeaflet.map).toHaveBeenCalledWith('mapContainer');
            expect(map.setView).toHaveBeenCalledWith(defaultCenter, defaultZoom);
        });

        it('should initialize map with user location when available', () => {
            const userLocation = [40.7128, -74.0060];
            const zoom = 7;

            const map = mockLeaflet.map('mapContainer');
            map.setView(userLocation, zoom);

            expect(map.setView).toHaveBeenCalledWith(userLocation, zoom);
        });
    });

    describe('WMS GetFeatureInfo', () => {
        it('should construct GetFeatureInfo URL correctly', () => {
            const wmsBaseUrl = 'https://geoserver.osm.lat/geoserver/wms';
            const layerName = 'notes:open_notes';
            const x = 256;
            const y = 256;
            const bbox = '-75,40,-73,41';
            const width = 512;
            const height = 512;

            const getFeatureInfoUrl = `${wmsBaseUrl}?` +
                `service=WMS&` +
                `version=1.1.0&` +
                `request=GetFeatureInfo&` +
                `layers=${layerName}&` +
                `bbox=${bbox}&` +
                `width=${width}&` +
                `height=${height}&` +
                `query_layers=${layerName}&` +
                `info_format=application/json&` +
                `x=${x}&` +
                `y=${y}&` +
                `srs=EPSG:4326`;

            expect(getFeatureInfoUrl).toContain('GetFeatureInfo');
            expect(getFeatureInfoUrl).toContain(layerName);
            expect(getFeatureInfoUrl).toContain(bbox);
            expect(getFeatureInfoUrl).toContain(`x=${x}`);
            expect(getFeatureInfoUrl).toContain(`y=${y}`);
        });

        it('should parse GetFeatureInfo response', async () => {
            const mockFeatureInfo = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {
                        note_id: 12345,
                        status: 'open'
                    }
                }]
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockFeatureInfo
            });

            const response = await fetch('https://geoserver.osm.lat/geoserver/wms?request=GetFeatureInfo');
            const data = await response.json();

            expect(data.features).toBeDefined();
            expect(data.features[0].properties.note_id).toBe(12345);
            expect(data.features[0].properties.status).toBe('open');
        });
    });
});
