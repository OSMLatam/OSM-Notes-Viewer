/**
 * Map Viewer Page
 * Displays three maps: Open Notes, Closed Notes, and Boundaries
 * Uses WMS layers and geolocation for initial view
 */

// Configuration
const WMS_BASE_URL = 'https://geoserver.osm.lat/geoserver/osm_notes/wms';

const WMS_LAYERS = {
    openNotes: 'osm_notes:notesopen',
    closedNotes: 'osm_notes:notesclosed',
    countries: 'osm_notes:countries',
    disputedAreas: 'osm_notes:disputedareas'
};

// State
let maps = {
    openNotes: null,
    closedNotes: null,
    boundaries: null
};

let currentMap = 'open-notes';
let userLocation = null;
let initialViews = {
    openNotes: null,
    closedNotes: null,
    boundaries: null
};

let baseLayers = {
    osm: null,
    satellite: null
};

let wmsLayers = {
    openNotes: null,
    closedNotes: null,
    'boundaries-countries': null,
    'boundaries-disputed': null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        setupTabs();
        await initializeMaps();
        setupControls();
        setupWMSDocumentation();
        await requestUserLocation();
    } catch (error) {
        console.error('Error initializing map viewer:', error);
        showError('Failed to initialize maps: ' + error.message);
    }
});

/**
 * Setup tab switching
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.map-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchMap(tabName);
        });
    });
}

/**
 * Switch between maps
 * @param {string} mapName - Map name (open-notes, closed-notes, boundaries)
 */
function switchMap(mapName) {
    // Update tabs
    document.querySelectorAll('.map-tab').forEach((tab, index) => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('tabindex', '-1');
    });
    const activeTab = document.querySelector(`[data-tab="${mapName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activeTab.setAttribute('tabindex', '0');
    }

    // Update map containers
    document.querySelectorAll('.map-container').forEach(container => {
        container.classList.remove('active');
        container.setAttribute('aria-hidden', 'true');
    });
    const activeMapContainer = document.getElementById(`${mapName}-map`);
    if (activeMapContainer) {
        activeMapContainer.classList.add('active');
        activeMapContainer.setAttribute('aria-hidden', 'false');
    }

    currentMap = mapName;

    // Invalidate size to fix rendering issues when switching tabs
    const mapKey = mapName.replace('-', '');
    const mapInstance = maps[mapKey];
    if (mapInstance) {
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 100);
    }
}

/**
 * Initialize all maps
 */
async function initializeMaps() {
    showLoading();

    try {
        // Initialize base layers
        baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });

        // Initialize Map 1: Open Notes
        await initializeOpenNotesMap();

        // Initialize Map 2: Closed Notes
        await initializeClosedNotesMap();

        // Initialize Map 3: Boundaries
        await initializeBoundariesMap();

        hideLoading();
    } catch (error) {
        console.error('Error initializing maps:', error);
        hideLoading();
        showError('Failed to initialize maps: ' + error.message);
    }
}

/**
 * Initialize Open Notes Map
 */
async function initializeOpenNotesMap() {
    const mapContainer = document.getElementById('open-notes-map');
    if (!mapContainer) return;

    // Create map with default view (will be updated with geolocation)
    maps.openNotes = L.map('open-notes-map', {
        zoomControl: true,
        attributionControl: true
    });

    // Set initial view (world view, will be updated)
    maps.openNotes.setView([0, 0], 2);
    initialViews.openNotes = { center: [0, 0], zoom: 2 };

    // Add base layer
    baseLayers.osm.addTo(maps.openNotes);

    // Add WMS layer for open notes
    // Will be added after geolocation is obtained
}

/**
 * Initialize Closed Notes Map
 */
async function initializeClosedNotesMap() {
    const mapContainer = document.getElementById('closed-notes-map');
    if (!mapContainer) return;

    // Create map with default view
    maps.closedNotes = L.map('closed-notes-map', {
        zoomControl: true,
        attributionControl: true
    });

    // Set initial view
    maps.closedNotes.setView([0, 0], 2);
    initialViews.closedNotes = { center: [0, 0], zoom: 2 };

    // Add base layer
    baseLayers.osm.addTo(maps.closedNotes);

    // Add WMS layer for closed notes
    // Will be added after geolocation is obtained
}

/**
 * Initialize Boundaries Map
 */
async function initializeBoundariesMap() {
    const mapContainer = document.getElementById('boundaries-map');
    if (!mapContainer) return;

    // Create map with world view
    maps.boundaries = L.map('boundaries-map', {
        zoomControl: true,
        attributionControl: true
    });

    // Set initial view (world view)
    maps.boundaries.setView([0, 0], 2);
    initialViews.boundaries = { center: [0, 0], zoom: 2 };

    // Add base layer
    baseLayers.osm.addTo(maps.boundaries);

    // Add WMS layers for boundaries (countries and disputed areas)
    addWMSLayer(maps.boundaries, WMS_LAYERS.countries, 'boundaries-countries');
    addWMSLayer(maps.boundaries, WMS_LAYERS.disputedAreas, 'boundaries-disputed');
}

/**
 * Request user location for maps 1 and 2
 */
async function requestUserLocation() {
    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        // Use default world view
        return;
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };

                // Calculate 500km bbox
                const bbox = calculateBbox(userLocation.lat, userLocation.lon, 500);

                // Update initial views for open and closed notes maps
                const zoom = calculateZoomForBbox(bbox);
                initialViews.openNotes = { center: [userLocation.lat, userLocation.lon], zoom };
                initialViews.closedNotes = { center: [userLocation.lat, userLocation.lon], zoom };

                // Update map views
                if (maps.openNotes) {
                    maps.openNotes.setView([userLocation.lat, userLocation.lon], zoom);
                    addWMSLayer(maps.openNotes, WMS_LAYERS.openNotes, 'openNotes', bbox);
                }

                if (maps.closedNotes) {
                    maps.closedNotes.setView([userLocation.lat, userLocation.lon], zoom);
                    addWMSLayer(maps.closedNotes, WMS_LAYERS.closedNotes, 'closedNotes', bbox);
                }

                resolve();
            },
            (error) => {
                console.warn('Geolocation error:', error);
                // Use default world view
                resolve();
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 600000 // 10 minutes
            }
        );
    });
}

/**
 * Calculate bounding box around a point
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Bounding box {minLon, minLat, maxLon, maxLat}
 */
function calculateBbox(lat, lon, radiusKm) {
    // Approximate: 1 degree latitude ≈ 111 km
    // Longitude varies by latitude: 1 degree ≈ 111 km * cos(latitude)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    return {
        minLon: lon - lonDelta,
        minLat: lat - latDelta,
        maxLon: lon + lonDelta,
        maxLat: lat + latDelta
    };
}

/**
 * Calculate appropriate zoom level for a bounding box
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

/**
 * Add WMS layer to a map using leaflet.wms plugin for better WMS support
 * @param {L.Map} map - Leaflet map instance
 * @param {string} layerName - WMS layer name
 * @param {string} layerKey - Key for storing layer reference
 * @param {Object} bbox - Optional bounding box (not used with plugin, but kept for compatibility)
 */
function addWMSLayer(map, layerName, layerKey, bbox = null) {
    if (!map) return;

    // Remove existing layer if present
    if (wmsLayers[layerKey]) {
        map.removeLayer(wmsLayers[layerKey]);
    }

    // Check if leaflet.wms plugin is available
    if (typeof L.WMS !== 'undefined' && typeof L.WMS.source !== 'undefined') {
        // Use leaflet.wms plugin for better WMS support
        try {
            const wmsSource = L.WMS.source(WMS_BASE_URL, {
                version: '1.1.0',
                transparent: true,
                format: 'image/png',
                crs: L.CRS.EPSG4326,
                uppercase: true,
                identify: true, // Enable GetFeatureInfo
                tiled: true, // Use tiled mode for better performance
                updateWhenIdle: false, // Update only when pan/zoom ends
                updateWhenZooming: true // Update during zoom
            });

            // Add the specific layer
            const wmsLayer = wmsSource.getLayer(layerName);
            
            if (wmsLayer) {
                wmsLayer.addTo(map);
                wmsLayers[layerKey] = wmsLayer;

                // Setup click handler for GetFeatureInfo
                wmsLayer.on('click', async (e) => {
                    await handleWMSLayerClick(e, map, layerName);
                });
            } else {
                console.warn(`Could not create WMS layer: ${layerName}, falling back to native implementation`);
                throw new Error('Layer creation failed');
            }
        } catch (error) {
            console.warn('Error using leaflet.wms plugin:', error, 'Falling back to native implementation');
            // Fall through to native implementation
        }
    }
    
    // Fallback to native Leaflet TileLayer.WMS if plugin not available or failed
    if (!wmsLayers[layerKey]) {
        // Fallback to native Leaflet TileLayer.WMS if plugin not available
        console.warn('leaflet.wms plugin not available, using fallback implementation');
        
        const wmsLayer = L.tileLayer.wms(WMS_BASE_URL, {
            layers: layerName,
            format: 'image/png',
            transparent: true,
            version: '1.1.0',
            crs: L.CRS.EPSG4326,
            uppercase: true,
            attribution: 'OSM Notes Analytics',
            tiled: true,
            updateWhenIdle: false,
            updateWhenZooming: true
        });

        wmsLayer.addTo(map);
        wmsLayers[layerKey] = wmsLayer;

        // Add click handler for popups
        map.on('click', async (e) => {
            await handleMapClick(e, map, layerName);
        });
    }
}

/**
 * Handle WMS layer click (when using leaflet.wms plugin)
 * @param {Object} e - Click event from leaflet.wms
 * @param {L.Map} map - Leaflet map instance
 * @param {string} layerName - WMS layer name
 */
async function handleWMSLayerClick(e, map, layerName) {
    try {
        // The leaflet.wms plugin provides feature info in the event
        if (e.latlng && e.info) {
            const info = e.info;
            // Try to extract note ID from feature info
            let noteId = null;
            
            if (info.features && info.features.length > 0) {
                const feature = info.features[0];
                noteId = feature.properties?.note_id || 
                         feature.properties?.id || 
                         feature.properties?.noteId ||
                         feature.id;
            } else if (info.properties) {
                noteId = info.properties.note_id || 
                         info.properties.id || 
                         info.properties.noteId;
            }

            if (noteId) {
                showNotePopup(e.latlng, noteId, map);
            }
        }
    } catch (error) {
        console.error('Error handling WMS layer click:', error);
    }
}

/**
 * Handle map click to show note popup (fallback for native Leaflet WMS)
 * @param {L.MouseEvent} e - Leaflet mouse event
 * @param {L.Map} map - Leaflet map instance
 * @param {string} layerName - WMS layer name
 */
async function handleMapClick(e, map, layerName) {
    try {
        // Get feature info from WMS using GetFeatureInfo
        const wmsUrl = WMS_BASE_URL;
        const bbox = map.getBounds();
        const size = map.getSize();

        const getFeatureInfoUrl = `${wmsUrl}?` +
            `SERVICE=WMS&` +
            `VERSION=1.1.0&` +
            `REQUEST=GetFeatureInfo&` +
            `LAYERS=${encodeURIComponent(layerName)}&` +
            `QUERY_LAYERS=${encodeURIComponent(layerName)}&` +
            `BBOX=${bbox.toBBoxString()}&` +
            `FEATURE_COUNT=1&` +
            `HEIGHT=${size.y}&` +
            `WIDTH=${size.x}&` +
            `X=${Math.floor(e.containerPoint.x)}&` +
            `Y=${Math.floor(e.containerPoint.y)}&` +
            `INFO_FORMAT=application/json&` +
            `SRS=EPSG:4326`;

        const response = await fetch(getFeatureInfoUrl);
        if (!response.ok) return;

        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const noteId = feature.properties?.note_id || 
                          feature.properties?.id || 
                          feature.properties?.noteId ||
                          feature.id;

            if (noteId) {
                showNotePopup(e.latlng, noteId, map);
            }
        }
    } catch (error) {
        console.error('Error getting feature info:', error);
    }
}

/**
 * Show popup for a note
 * @param {L.LatLng} latlng - Location
 * @param {number} noteId - Note ID
 * @param {L.Map} map - Leaflet map instance
 */
function showNotePopup(latlng, noteId, map) {
    const popupContent = `
        <div class="note-popup">
            <div class="note-popup-title">Note #${noteId}</div>
            <a href="note.html?id=${noteId}" class="note-popup-link" target="_blank">
                View Note →
            </a>
        </div>
    `;

    L.popup()
        .setLatLng(latlng)
        .setContent(popupContent)
        .openOn(map);
}

/**
 * Setup map controls
 */
function setupControls() {
    // Base layer selector
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    if (baseLayerSelect) {
        baseLayerSelect.addEventListener('change', (e) => {
            const selectedLayer = e.target.value;
            switchBaseLayer(selectedLayer);
        });
    }

    // Center on user button
    const centerUserBtn = document.getElementById('centerUserBtn');
    if (centerUserBtn) {
        centerUserBtn.addEventListener('click', () => {
            centerOnUser();
        });
    }

    // Reset view button
    const resetViewBtn = document.getElementById('resetViewBtn');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            resetView();
        });
    }
}

/**
 * Switch base layer for all maps
 * @param {string} layerType - 'osm' or 'satellite'
 */
function switchBaseLayer(layerType) {
    const newLayer = layerType === 'satellite' ? baseLayers.satellite : baseLayers.osm;
    const oldLayer = layerType === 'satellite' ? baseLayers.osm : baseLayers.satellite;

    Object.values(maps).forEach(map => {
        if (map) {
            map.removeLayer(oldLayer);
            newLayer.addTo(map);
        }
    });
}

/**
 * Center current map on user location
 */
function centerOnUser() {
    if (!userLocation) {
        alert('User location not available. Please allow geolocation access.');
        return;
    }

    const mapKey = currentMap.replace('-', '');
    const currentMapInstance = maps[mapKey];
    if (currentMapInstance) {
        currentMapInstance.setView([userLocation.lat, userLocation.lon], 11);
    }
}

/**
 * Reset current map to initial view
 */
function resetView() {
    const mapKey = currentMap.replace('-', '');
    const initialView = initialViews[mapKey];
    const mapInstance = maps[mapKey];

    if (initialView && mapInstance) {
        mapInstance.setView(initialView.center, initialView.zoom);
    }
}

/**
 * Setup WMS documentation section
 */
function setupWMSDocumentation() {
    // Generate WMS URLs
    const openNotesUrl = generateWMSUrl(WMS_LAYERS.openNotes);
    const closedNotesUrl = generateWMSUrl(WMS_LAYERS.closedNotes);
    const countriesUrl = generateWMSUrl(WMS_LAYERS.countries);
    const disputedAreasUrl = generateWMSUrl(WMS_LAYERS.disputedAreas);

    // Update URLs in documentation
    const openUrlEl = document.getElementById('wmsOpenUrl');
    const closedUrlEl = document.getElementById('wmsClosedUrl');
    const countriesUrlEl = document.getElementById('wmsCountriesUrl');
    const disputedUrlEl = document.getElementById('wmsDisputedUrl');

    if (openUrlEl) openUrlEl.textContent = openNotesUrl;
    if (closedUrlEl) closedUrlEl.textContent = closedNotesUrl;
    if (countriesUrlEl) countriesUrlEl.textContent = countriesUrl;
    if (disputedUrlEl) disputedUrlEl.textContent = disputedAreasUrl;

    // Setup copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.copy;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                copyToClipboard(targetEl.textContent);
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    });
}

/**
 * Generate WMS URL
 * @param {string} layerName - Layer name
 * @returns {string} WMS URL
 */
function generateWMSUrl(layerName) {
    return `${WMS_BASE_URL}/wms?service=WMS&version=1.1.0&request=GetMap&layers=${layerName}&styles=&format=image/png&transparent=true`;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    const loading = document.getElementById('mapLoading');
    if (loading) {
        loading.style.display = 'block';
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loading = document.getElementById('mapLoading');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    const error = document.getElementById('mapError');
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
    }
}
