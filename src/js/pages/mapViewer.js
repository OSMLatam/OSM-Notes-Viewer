/**
 * Map Viewer Page
 * Displays three maps: Open Notes, Closed Notes, and Boundaries
 * Uses WMS layers and geolocation for initial view
 */

import { i18n } from '../utils/i18n.js';

// Configuration
const WMS_BASE_URL = 'https://geoserver.osm.lat/geoserver/osm_notes/wms';

const WMS_LAYERS = {
    openNotes: 'osm_notes:notesopen',
    // closedNotes: 'osm_notes:notesclosed', // Disabled - causing issues
    countries: 'osm_notes:countries',
    disputedAreas: 'osm_notes:disputedareas'
};

// Layer names for JOSM/iD format (without namespace prefix)
const WMS_LAYER_NAMES = {
    openNotes: 'notesopen',
    // closedNotes: 'notesclosed', // Disabled - causing issues
    countries: 'countries',
    disputedAreas: 'disputedareas'
};

// State
let maps = {
    openNotes: null,
    // closedNotes: null, // Disabled - causing issues
    boundaries: null
};

let currentMap = 'open-notes';
let userLocation = null;
let initialViews = {
    openNotes: null,
    // closedNotes: null, // Disabled - causing issues
    boundaries: null
};

// Default location: Bogotá, Colombia
const DEFAULT_LOCATION = {
    lat: 4.6097,
    lon: -74.0817
};
const DEFAULT_ZOOM = 6;

/**
 * Convert map name (kebab-case) to map key (camelCase)
 * @param {string} mapName - Map name (e.g., 'open-notes')
 * @returns {string} Map key (e.g., 'openNotes')
 */
function mapNameToKey(mapName) {
    return mapName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

let baseLayers = {
    osm: null,
    satellite: null
};

// Store WMS layers per map to avoid sharing issues
// Each map should have its own layer instances
let wmsLayers = {
    openNotes: null,
    // closedNotes: null, // Disabled - causing issues
    'boundaries-countries': null,
    'boundaries-disputed': null
};

// Track which map each layer belongs to
let wmsLayerMap = {
    openNotes: null,
    // closedNotes: null, // Disabled - causing issues
    'boundaries-countries': null,
    'boundaries-disputed': null
};

// Initialize on page load
// Use window.load instead of DOMContentLoaded to ensure all resources are loaded
window.addEventListener('load', async () => {
    try {
        // Initialize i18n
        await i18n.init();

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            // Update base layer select options
            const baseLayerSelect = document.getElementById('baseLayerSelect');
            if (baseLayerSelect) {
                const options = baseLayerSelect.querySelectorAll('option');
                options.forEach(option => {
                    if (option.value === 'osm') {
                        option.textContent = i18n.t('map.controls.baseLayerOsm');
                    } else if (option.value === 'satellite') {
                        option.textContent = i18n.t('map.controls.baseLayerSatellite');
                    }
                });
            }
            // Update page content
            i18n.updatePageContent();
        });

        setupTabs();
        await initializeMaps();
        setupControls();
        setupWMSDocumentation();

        // Force refresh by simulating a base layer switch
        // This fixes WMS layer alignment issues that occur on initial load
        // The same mechanism that works when user manually switches layers
        // Wait longer to ensure WMS layers are already added
        requestAnimationFrame(() => {
            setTimeout(() => {
                const baseLayerSelect = document.getElementById('baseLayerSelect');
                const activeMapKey = mapNameToKey(currentMap);
                const activeMapInstance = maps[activeMapKey];

                if (baseLayerSelect && activeMapInstance) {
                    // Ensure select is set to OSM
                    baseLayerSelect.value = 'osm';

                    // Simulate a base layer switch to force WMS layer refresh
                    // This is what fixes the alignment when user manually switches layers
                    // Temporarily switch to satellite and back to OSM
                    if (activeMapInstance.hasLayer(baseLayers.osm)) {
                        activeMapInstance.removeLayer(baseLayers.osm);
                    }
                    baseLayers.satellite.addTo(activeMapInstance);

                    // Switch back to OSM after a delay
                    // Use a longer delay to allow satellite tiles to start loading
                    // This reduces NS_BINDING_ABORTED errors
                    setTimeout(() => {
                        if (activeMapInstance.hasLayer(baseLayers.satellite)) {
                            activeMapInstance.removeLayer(baseLayers.satellite);
                        }
                        baseLayers.osm.addTo(activeMapInstance);

                        // Ensure select shows OSM
                        baseLayerSelect.value = 'osm';

                        // Refresh WMS layers by removing and re-adding them
                        // This ensures proper alignment after base layer switch
                        // Only refresh WMS layers for the active map
                        const wmsLayersToRefresh = [];
                        Object.keys(wmsLayers).forEach(layerKey => {
                            const wmsLayer = wmsLayers[layerKey];
                            if (wmsLayer && activeMapInstance.hasLayer(wmsLayer)) {
                                wmsLayersToRefresh.push({ layerKey, wmsLayer });
                                activeMapInstance.removeLayer(wmsLayer);
                            }
                        });

                        // Re-add WMS layers after a delay
                        setTimeout(() => {
                            wmsLayersToRefresh.forEach(({ wmsLayer }) => {
                                wmsLayer.addTo(activeMapInstance);
                            });

                            // Force refresh - invalidateSize should be enough
                            requestAnimationFrame(() => {
                                activeMapInstance.invalidateSize();
                            });
                        }, 200);
                    }, 300);
                }
            }, 1000);
        });

        // Don't request user location immediately - wait for tiles to start loading
        // This prevents view changes that cancel ongoing tile requests
        setTimeout(() => {
            requestUserLocation();
        }, 2000);
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

    // Show/hide boundaries layer controls based on active tab
    const boundariesControls = document.getElementById('boundariesLayerControls');
    if (boundariesControls) {
        boundariesControls.style.display = mapName === 'boundaries' ? 'block' : 'none';
    }

    // Ensure base layer selector is set to OSM when on boundaries tab
    if (mapName === 'boundaries') {
        const baseLayerSelect = document.getElementById('baseLayerSelect');
        if (baseLayerSelect) {
            baseLayerSelect.value = 'osm';
            // Force OSM as base layer for boundaries map
            const boundariesMap = maps.boundaries;
            if (boundariesMap) {
                // Ensure container is visible first
                const mapContainer = document.getElementById('boundaries-map');
                if (mapContainer) {
                    mapContainer.classList.add('active');
                }

                // Remove satellite if present
                if (boundariesMap.hasLayer(baseLayers.satellite)) {
                    boundariesMap.removeLayer(baseLayers.satellite);
                }

                // Ensure OSM base layer is present
                if (!boundariesMap.hasLayer(baseLayers.osm)) {
                    if (baseLayers.osm) {
                        baseLayers.osm.addTo(boundariesMap);
                    }
                }

                // Invalidate size to ensure tiles load
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        boundariesMap.invalidateSize();
                        // Force a small view change to refresh tiles
                        const center = boundariesMap.getCenter();
                        const zoom = boundariesMap.getZoom();
                        boundariesMap.setView([center.lat + 0.000001, center.lng], zoom, {
                            reset: false,
                            animate: false
                        });
                        setTimeout(() => {
                            boundariesMap.setView(center, zoom, {
                                reset: false,
                                animate: false
                            });
                            boundariesMap.invalidateSize();
                        }, 50);
                    }, 100);
                });
            }
        }
    }

    // Ensure only the correct WMS layers are visible on each map
    const mapKey = mapNameToKey(mapName);

    // First, ensure base layers are on all maps
    Object.entries(maps).forEach(([key, mapInstance]) => {
        if (mapInstance) {
            // Ensure base layer is present
            const baseLayerSelect = document.getElementById('baseLayerSelect');
            const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
            const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
            const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;

            // Remove other base layer if present
            if (mapInstance.hasLayer(otherBaseLayer)) {
                mapInstance.removeLayer(otherBaseLayer);
            }

            // Add current base layer if not present
            if (!mapInstance.hasLayer(currentBaseLayer)) {
                currentBaseLayer.addTo(mapInstance);
            }
        }
    });

    // Hide WMS layers on all maps first, then add only correct ones
    Object.entries(maps).forEach(([key, mapInstance]) => {
        if (mapInstance) {
            Object.keys(wmsLayers).forEach(layerKey => {
                const wmsLayer = wmsLayers[layerKey];
                if (wmsLayer) {
                    // Determine which layers should be on which map
                    const shouldBeOnMap =
                        (key === 'openNotes' && layerKey === 'openNotes') ||
                        // (key === 'closedNotes' && layerKey === 'closedNotes') || // Disabled
                        (key === 'boundaries' && (layerKey === 'boundaries-countries' || layerKey === 'boundaries-disputed'));

                    // Remove layer if it shouldn't be on this map
                    if (!shouldBeOnMap) {
                        if (mapInstance.hasLayer(wmsLayer)) {
                            mapInstance.removeLayer(wmsLayer);
                        }
                    }
                    // Also remove if layer is tracked as being on a different map
                    else if (wmsLayerMap[layerKey] && wmsLayerMap[layerKey] !== mapInstance) {
                        if (mapInstance.hasLayer(wmsLayer)) {
                            mapInstance.removeLayer(wmsLayer);
                        }
                    }
                }
            });
        }
    });

    // Ensure correct layers are on the active map
    const activeMapInstance = maps[mapKey];
    if (activeMapInstance) {
        Object.keys(wmsLayers).forEach(layerKey => {
            const wmsLayer = wmsLayers[layerKey];
            if (wmsLayer) {
                // Determine which layers should be on the active map
                const shouldBeOnMap =
                    (mapKey === 'openNotes' && layerKey === 'openNotes') ||
                    // (mapKey === 'closedNotes' && layerKey === 'closedNotes') || // Disabled
                    (mapKey === 'boundaries' && (layerKey === 'boundaries-countries' || layerKey === 'boundaries-disputed'));

                // Add layer if it should be on this map
                if (shouldBeOnMap) {
                    // If layer is on a different map, remove it first
                    if (wmsLayerMap[layerKey] && wmsLayerMap[layerKey] !== activeMapInstance) {
                        if (wmsLayerMap[layerKey].hasLayer(wmsLayer)) {
                            wmsLayerMap[layerKey].removeLayer(wmsLayer);
                        }
                    }

                    // Add layer if not already on this map
                    if (!activeMapInstance.hasLayer(wmsLayer)) {
                        activeMapInstance.addLayer(wmsLayer);
                        wmsLayerMap[layerKey] = activeMapInstance; // Update tracking
                        // Ensure open notes are on top if both are present (shouldn't happen, but just in case)
                        if (layerKey === 'openNotes') {
                            wmsLayer.bringToFront();
                        }
                    }
                }
            }
        });

        // Use requestAnimationFrame to ensure the container is visible before invalidating
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Special handling for boundaries map to ensure base layer is visible
                if (mapKey === 'boundaries') {
                    // Ensure base layer OSM is present
                    if (!baseLayers.osm) {
                        console.error('Base layer OSM not initialized');
                        return;
                    }

                    // Remove satellite if present
                    if (activeMapInstance.hasLayer(baseLayers.satellite)) {
                        activeMapInstance.removeLayer(baseLayers.satellite);
                    }

                    // Remove and re-add OSM layer to force refresh
                    if (activeMapInstance.hasLayer(baseLayers.osm)) {
                        activeMapInstance.removeLayer(baseLayers.osm);
                    }

                    setTimeout(() => {
                        baseLayers.osm.addTo(activeMapInstance);
                        activeMapInstance.invalidateSize();

                        const currentCenter = activeMapInstance.getCenter();
                        const currentZoom = activeMapInstance.getZoom();

                        // Force a view change to refresh tiles
                        activeMapInstance.setView([currentCenter.lat + 0.000001, currentCenter.lng], currentZoom, {
                            reset: false,
                            animate: false
                        });

                        setTimeout(() => {
                            activeMapInstance.setView(currentCenter, currentZoom, {
                                reset: false,
                                animate: false
                            });
                            activeMapInstance.invalidateSize();
                        }, 100);
                    }, 50);
                } else {
                    // Standard handling for other maps
                    const baseLayerSelect = document.getElementById('baseLayerSelect');
                    const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                    const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                    const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;

                    // Remove other base layer if present
                    if (activeMapInstance.hasLayer(otherBaseLayer)) {
                        activeMapInstance.removeLayer(otherBaseLayer);
                    }

                    // Add current base layer if not present
                    if (!activeMapInstance.hasLayer(currentBaseLayer)) {
                        currentBaseLayer.addTo(activeMapInstance);
                    }

                    // Invalidate size to ensure map renders correctly
                    activeMapInstance.invalidateSize();

                    // Force a view update to ensure tiles load correctly
                    const currentCenter = activeMapInstance.getCenter();
                    const currentZoom = activeMapInstance.getZoom();
                    activeMapInstance.setView(currentCenter, currentZoom);

                    setTimeout(() => {
                        activeMapInstance.invalidateSize();
                        // Ensure base layer is still there
                        if (!activeMapInstance.hasLayer(currentBaseLayer)) {
                            currentBaseLayer.addTo(activeMapInstance);
                        }

                        setTimeout(() => {
                            activeMapInstance.invalidateSize();
                            // Trigger a small view change to force tile refresh
                            activeMapInstance.setView([currentCenter.lat + 0.000001, currentCenter.lng], currentZoom, {
                                reset: false,
                                animate: false
                            });
                            setTimeout(() => {
                                activeMapInstance.setView(currentCenter, currentZoom, {
                                    reset: false,
                                    animate: false
                                });
                                activeMapInstance.invalidateSize();
                            }, 50);
                        }, 100);
                    }, 150);
                }
            }, 150);
        });
    }
}

/**
 * Initialize all maps
 */
async function initializeMaps() {
    showLoading();

    try {
        // Initialize base layers
        // Both layers use EPSG:3857 (Web Mercator) by default in Leaflet
        baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        });

        baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            // Ensure the satellite layer uses the same CRS as the map
            // Leaflet uses EPSG:3857 by default, but we make it explicit
            tms: false, // ArcGIS uses standard TMS (not TMS flipped)
            // Ensure tiles update properly when map moves or zooms
            updateWhenIdle: true,
            updateWhenZooming: true,
            // Allow cross-origin requests
            crossOrigin: true,
            // Detect retina displays for better quality
            detectRetina: false
        });

        // Initialize Map 1: Open Notes (active by default)
        await initializeOpenNotesMap();

        // Initialize Map 2: Boundaries (hidden initially)
        await initializeBoundariesMap();

        // Closed Notes map disabled - causing issues with open notes display

        // Ensure OSM is selected on all maps from the start
        const baseLayerSelect = document.getElementById('baseLayerSelect');
        if (baseLayerSelect) {
            baseLayerSelect.value = 'osm';
        }

        // Ensure OSM is on the active map and satellite is not
        const activeMapKey = mapNameToKey(currentMap);
        const activeMapInstance = maps[activeMapKey];
        if (activeMapInstance) {
            // Ensure OSM is on the map
            if (!activeMapInstance.hasLayer(baseLayers.osm)) {
                baseLayers.osm.addTo(activeMapInstance);
            }
            // Ensure satellite is NOT on the map
            if (activeMapInstance.hasLayer(baseLayers.satellite)) {
                activeMapInstance.removeLayer(baseLayers.satellite);
            }
        }

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

    // Ensure the container is visible before initializing Leaflet
    // The container should have 'active' class, but verify it's actually visible
    if (!mapContainer.classList.contains('active')) {
        mapContainer.classList.add('active');
    }

    // Wait for the container to be fully rendered and visible
    await new Promise(resolve => {
        // Check if container is visible
        const checkVisibility = () => {
            const rect = mapContainer.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                resolve();
            } else {
                requestAnimationFrame(checkVisibility);
            }
        };
        requestAnimationFrame(checkVisibility);
    });

    // Create map with default location (Bogotá) - will be updated if geolocation succeeds
    // Explicitly use EPSG:3857 (Web Mercator) to match OpenStreetMap tiles
    maps.openNotes = L.map('open-notes-map', {
        zoomControl: true,
        attributionControl: false, // Disable default to avoid duplicates
        center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon],
        zoom: DEFAULT_ZOOM,
        crs: L.CRS.EPSG3857 // Explicitly set CRS to match base map tiles
    });

    // Add custom attribution control without "Leaflet" prefix
    const openNotesAttribution = L.control.attribution({
        prefix: false
    });
    openNotesAttribution.addTo(maps.openNotes);
    // Add OSM attribution manually to ensure it's always shown
    openNotesAttribution.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');

    // Set initial view to default location
    initialViews.openNotes = { center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon], zoom: DEFAULT_ZOOM };

    // Add base layer - ensure OSM is added, not satellite
    baseLayers.osm.addTo(maps.openNotes);

    // Double-check that satellite is NOT on the map
    if (maps.openNotes.hasLayer(baseLayers.satellite)) {
        maps.openNotes.removeLayer(baseLayers.satellite);
    }

    // Wait for next frame to ensure map container is fully rendered
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Force Leaflet to calculate size and start loading tiles immediately
    maps.openNotes.invalidateSize();

    // Listen for map load event to ensure tiles are displayed
    maps.openNotes.once('load', () => {
        // Map is fully loaded, ensure tiles are visible
        maps.openNotes.invalidateSize();
    });

    // Also force a refresh after a delay to ensure tiles load
    setTimeout(() => {
        maps.openNotes.invalidateSize();
        const center = maps.openNotes.getCenter();
        const zoom = maps.openNotes.getZoom();
        maps.openNotes.setView(center, zoom);
    }, 200);

    // Wait a bit for base map tiles to start loading before adding WMS layer
    // This prevents WMS layer from canceling base map tile requests
    setTimeout(() => {
        // Add WMS layer for open notes (will be updated with geolocation if available)
        const bbox = calculateBbox(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, 500);
        addWMSLayer(maps.openNotes, WMS_LAYERS.openNotes, 'openNotes', bbox);
    }, 500);
}

/**
 * Initialize Closed Notes Map
 * DISABLED - Causing issues with open notes display
 */
async function initializeClosedNotesMap() {
    // Function completely disabled - closed notes causing issues with open notes visibility
    return;
}

/**
 * Initialize Boundaries Map
 */
async function initializeBoundariesMap() {
    const mapContainer = document.getElementById('boundaries-map');
    if (!mapContainer) return;

    // Temporarily make container visible for Leaflet to calculate size correctly
    const wasHidden = !mapContainer.classList.contains('active');
    if (wasHidden) {
        mapContainer.classList.add('active');
        mapContainer.style.display = 'block';
    }

    // Wait for container to be rendered
    await new Promise(resolve => {
        requestAnimationFrame(() => {
            setTimeout(resolve, 50);
        });
    });

    // Create map with world view
    // Explicitly use EPSG:3857 (Web Mercator) to match base map tiles
    maps.boundaries = L.map('boundaries-map', {
        zoomControl: true,
        attributionControl: false, // Disable default to avoid duplicates
        crs: L.CRS.EPSG3857 // Explicitly set CRS to match base map tiles
    });

    // Add custom attribution control without "Leaflet" prefix
    const boundariesAttribution = L.control.attribution({
        prefix: false
    });
    boundariesAttribution.addTo(maps.boundaries);
    // Add OSM attribution manually to ensure it's always shown
    boundariesAttribution.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');

    // Set initial view (world view)
    maps.boundaries.setView([0, 0], 2);
    initialViews.boundaries = { center: [0, 0], zoom: 2 };

    // Force Leaflet to calculate size
    maps.boundaries.invalidateSize();

    // Add base layer (always OSM for boundaries map)
    if (baseLayers.osm) {
        baseLayers.osm.addTo(maps.boundaries);
    }

    // Wait a bit for base layer to start loading
    await new Promise(resolve => setTimeout(resolve, 200));

    // Invalidate size again after base layer is added
    maps.boundaries.invalidateSize();

    // Restore original visibility state if it was hidden
    if (wasHidden) {
        mapContainer.classList.remove('active');
        mapContainer.style.display = '';
    }

    // Don't add WMS layers automatically - user will select them via checkboxes
    // Layers will be added/removed based on checkbox state
}

/**
 * Request user location for maps 1 and 2
 */
async function requestUserLocation() {
    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        // Maps already initialized with default location, don't change anything
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

                // Update initial views for open notes map
                const zoom = calculateZoomForBbox(bbox);
                initialViews.openNotes = { center: [userLocation.lat, userLocation.lon], zoom };
                // initialViews.closedNotes = { center: [userLocation.lat, userLocation.lon], zoom }; // Disabled

                // Only update map views if user explicitly wants to use their location
                // For now, we'll keep the default location (Bogotá) to avoid disrupting the map
                // The user can use the "My Location" button if they want to center on their location

                resolve();
            },
            (error) => {
                console.warn('Geolocation error:', error);
                // Maps already initialized with default location, don't change anything
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
 * Invalidate map sizes to ensure tiles load correctly
 */
function invalidateMapSizes() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        if (maps.openNotes) {
            maps.openNotes.invalidateSize();
        }
        // if (maps.closedNotes) { // Disabled
        //     maps.closedNotes.invalidateSize();
        // }
        if (maps.boundaries) {
            maps.boundaries.invalidateSize();
        }
    }, 100);
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

    // Check if this layer already exists and is on a different map
    // If so, remove it from that map first (a Leaflet layer can only be on one map at a time)
    if (wmsLayers[layerKey] && wmsLayerMap[layerKey] && wmsLayerMap[layerKey] !== map) {
        const previousMap = wmsLayerMap[layerKey];
        if (previousMap.hasLayer(wmsLayers[layerKey])) {
            previousMap.removeLayer(wmsLayers[layerKey]);
        }
        // Clear the reference since we're moving it to a new map
        wmsLayers[layerKey] = null;
        wmsLayerMap[layerKey] = null;
    }

    // Remove existing layer from this map if present
    if (wmsLayers[layerKey] && map.hasLayer(wmsLayers[layerKey])) {
        map.removeLayer(wmsLayers[layerKey]);
    }

    // Use native Leaflet TileLayer.WMS implementation for better CRS handling
    // The plugin leaflet.wms may have issues with CRS alignment
    // Skip plugin and use native implementation directly
    const usePlugin = false; // Set to false to force native implementation

    // Check if leaflet.wms plugin is available and should be used
    if (usePlugin && typeof L.WMS !== 'undefined' && typeof L.WMS.source !== 'undefined') {
        // Use leaflet.wms plugin for better WMS support
        try {
            // Ensure map is using EPSG:3857 (Web Mercator) to match base map tiles
            // The plugin will use the map's CRS automatically
            const mapCrs = map.options.crs || map.getCRS();
            const mapCrsCode = mapCrs?.code || (mapCrs === L.CRS.EPSG3857 ? 'EPSG:3857' : 'unknown');

            if (mapCrs !== L.CRS.EPSG3857 && mapCrsCode !== 'EPSG:3857') {
                console.warn('Map CRS is not EPSG:3857, WMS layers may not align correctly');
            }

            // Create WMS source - ensure it uses the map's CRS
            const wmsSource = L.WMS.source(WMS_BASE_URL, {
                version: '1.1.0',
                transparent: true,
                format: 'image/png',
                uppercase: true,
                identify: true, // Enable GetFeatureInfo
                tiled: true, // Use tiled mode for better performance
                updateWhenIdle: false, // Update only when pan/zoom ends
                updateWhenZooming: true, // Update during zoom
                // Explicitly set CRS to match map's CRS
                crs: mapCrs
            });

            // Add the specific layer
            const wmsLayer = wmsSource.getLayer(layerName);

            if (wmsLayer) {
                wmsLayer.addTo(map);
                wmsLayers[layerKey] = wmsLayer;
                wmsLayerMap[layerKey] = map; // Track which map this layer belongs to

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

    // Use native Leaflet TileLayer.WMS implementation
    // This ensures proper CRS handling and alignment with base map tiles
    // Always create a new layer instance to ensure it's bound to the correct map
    if (!wmsLayers[layerKey] || !map.hasLayer(wmsLayers[layerKey])) {
        // Verify map CRS
        const mapCrs = map.options.crs || map.getCRS();
        const mapCrsCode = mapCrs?.code || (mapCrs === L.CRS.EPSG3857 ? 'EPSG:3857' : 'unknown');

        // L.tileLayer.wms uses the map's CRS automatically
        // Ensure the map is using EPSG:3857 (Web Mercator) to match base map tiles
        const wmsLayer = L.tileLayer.wms(WMS_BASE_URL, {
            layers: layerName,
            format: 'image/png',
            transparent: true,
            version: '1.1.0',
            uppercase: true,
            attribution: '<a href="https://github.com/OSMLatam/OSM-Notes-Analytics">OSM Notes Analytics</a>',
            tiled: true,
            updateWhenIdle: false,
            updateWhenZooming: true,
            // Ensure WMS layer appears on top of base layers
            pane: 'overlayPane'
        });

        // Add WMS layer to map - it will appear on top of base layers
        wmsLayer.addTo(map);
        wmsLayers[layerKey] = wmsLayer;
        wmsLayerMap[layerKey] = map; // Track which map this layer belongs to

        // Ensure open notes layer is always on top of closed notes layer
        if (layerKey === 'openNotes') {
            // Use a small delay to ensure closed notes layer is added first if it exists
            setTimeout(() => {
                if (map.hasLayer(wmsLayer)) {
                    wmsLayer.bringToFront();
                }
            }, 100);
        }

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
            <div class="note-popup-title">${i18n.t('common.note')} #${noteId}</div>
            <a href="note.html?id=${noteId}" class="note-popup-link" target="_blank">
                ${i18n.t('common.view')} ${i18n.t('common.note')} →
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
            // Don't allow satellite on boundaries map - force OSM
            if (currentMap === 'boundaries' && selectedLayer === 'satellite') {
                e.target.value = 'osm';
                return;
            }
            switchBaseLayer(selectedLayer);
        });
    }

    // Boundaries layer checkboxes
    const countriesCheckbox = document.getElementById('boundariesCountriesCheckbox');
    const disputedCheckbox = document.getElementById('boundariesDisputedCheckbox');

    if (countriesCheckbox) {
        countriesCheckbox.addEventListener('change', (e) => {
            toggleBoundariesLayer('boundaries-countries', e.target.checked);
        });
        // Initialize with checked state (both layers visible by default)
        if (countriesCheckbox.checked && maps.boundaries) {
            toggleBoundariesLayer('boundaries-countries', true);
        }
    }

    if (disputedCheckbox) {
        disputedCheckbox.addEventListener('change', (e) => {
            toggleBoundariesLayer('boundaries-disputed', e.target.checked);
        });
        // Initialize with checked state (both layers visible by default)
        if (disputedCheckbox.checked && maps.boundaries) {
            toggleBoundariesLayer('boundaries-disputed', true);
        }
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
    // Don't allow satellite on boundaries map - force OSM
    if (currentMap === 'boundaries' && layerType === 'satellite') {
        const baseLayerSelect = document.getElementById('baseLayerSelect');
        if (baseLayerSelect) {
            baseLayerSelect.value = 'osm';
        }
        return;
    }

    const newLayer = layerType === 'satellite' ? baseLayers.satellite : baseLayers.osm;
    const oldLayer = layerType === 'satellite' ? baseLayers.osm : baseLayers.satellite;

    Object.entries(maps).forEach(([mapKey, map]) => {
        if (map && oldLayer && newLayer) {
            try {
                // Preserve current view (center and zoom) before switching layers
                const currentCenter = map.getCenter();
                const currentZoom = map.getZoom();

                // Stop any ongoing animations
                if (map.stop) {
                    map.stop();
                }

                // Remove old layer if present
                if (map.hasLayer(oldLayer)) {
                    map.removeLayer(oldLayer);
                }

                // Add new layer if not already present
                if (!map.hasLayer(newLayer)) {
                    newLayer.addTo(map);
                }

                // Ensure view stays the same after layer switch
                // Use requestAnimationFrame to allow Leaflet to process the layer change
                requestAnimationFrame(() => {
                    // Set view without reset to avoid canceling tile requests
                    map.setView(currentCenter, currentZoom, {
                        reset: false,
                        animate: false
                    });

                    // Invalidate size after a small delay to ensure tiles start loading
                    setTimeout(() => {
                        map.invalidateSize();

                        // Refresh WMS layers to ensure they align properly and appear on top
                        // Order matters: closed notes first, then open notes (so open notes appear on top)
                        setTimeout(() => {
                            // Define layer order: open notes first, then boundaries
                            const layerOrder = ['openNotes', 'boundaries-countries', 'boundaries-disputed'];

                            // Process layers in the correct order
                            layerOrder.forEach(layerKey => {
                                const wmsLayer = wmsLayers[layerKey];
                                if (wmsLayer) {
                                    try {
                                        // Check if layer should be on this map
                                        // Only refresh layers that belong to this map
                                        const shouldBeOnMap =
                                            (mapKey === 'openNotes' && layerKey === 'openNotes') ||
                                            // (mapKey === 'closedNotes' && layerKey === 'closedNotes') || // Disabled
                                            (mapKey === 'boundaries' && (layerKey === 'boundaries-countries' || layerKey === 'boundaries-disputed'));

                                        if (!shouldBeOnMap) {
                                            return; // Skip layers that don't belong to this map
                                        }

                                        // Check if layer is on the map
                                        const wasOnMap = map.hasLayer(wmsLayer);

                                        // Remove layer if present to force refresh
                                        if (wasOnMap) {
                                            map.removeLayer(wmsLayer);
                                        }

                                        // Re-add after a short delay to ensure base layer is ready
                                        // This ensures WMS layers appear on top of base layers
                                        // Use a delay that increases for each layer to maintain order
                                        const delay = layerKey === 'openNotes' ? 200 : 300;

                                        setTimeout(() => {
                                            // Add layer back to map - it will appear on top of base layer
                                            wmsLayer.addTo(map);

                                            // If this is the open notes layer, bring it to front to ensure it's on top
                                            if (layerKey === 'openNotes' && map.hasLayer(wmsLayer)) {
                                                wmsLayer.bringToFront();
                                            }

                                            // Force WMS layer to update its tiles
                                            // Trigger a small view change to force tile refresh
                                            const center = map.getCenter();
                                            const zoom = map.getZoom();

                                            // Use a tiny offset to force refresh without visible movement
                                            map.setView([center.lat + 0.000001, center.lng], zoom, {
                                                reset: false,
                                                animate: false
                                            });

                                            // Immediately restore original view
                                            setTimeout(() => {
                                                map.setView(center, zoom, {
                                                    reset: false,
                                                    animate: false
                                                });

                                                // Ensure open notes are on top after view restore
                                                if (layerKey === 'openNotes' && map.hasLayer(wmsLayer)) {
                                                    wmsLayer.bringToFront();
                                                }
                                            }, 50);
                                        }, delay);
                                    } catch (wmsError) {
                                        console.warn('Error refreshing WMS layer:', wmsError);
                                        // Try to re-add layer even if refresh failed
                                        if (wmsLayer && !map.hasLayer(wmsLayer)) {
                                            wmsLayer.addTo(map);
                                            // Ensure open notes are on top
                                            if (layerKey === 'openNotes') {
                                                wmsLayer.bringToFront();
                                            }
                                        }
                                    }
                                }
                            });
                        }, 300);
                    }, 100);
                });
            } catch (error) {
                console.warn('Error switching base layer:', error);
            }
        }
    });

    // Update select options text
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    if (baseLayerSelect) {
        const options = baseLayerSelect.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === 'osm') {
                option.textContent = i18n.t('map.controls.baseLayerOsm');
            } else if (option.value === 'satellite') {
                option.textContent = i18n.t('map.controls.baseLayerSatellite');
            }
        });
    }
}

/**
 * Center current map on user location
 */
function centerOnUser() {
    if (!userLocation) {
        alert(i18n.t('map.error.location'));
        return;
    }

    const mapKey = mapNameToKey(currentMap);
    const currentMapInstance = maps[mapKey];
    if (currentMapInstance) {
        currentMapInstance.setView([userLocation.lat, userLocation.lon], 11);
    }
}

/**
 * Reset current map to initial view
 */
function resetView() {
    const mapKey = mapNameToKey(currentMap);
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
    // Generate WMS URLs for iD Editor (complete URLs)
    const openNotesUrl = generateWMSUrl('openNotes');
    // const closedNotesUrl = generateWMSUrl('closedNotes'); // Disabled
    const countriesUrl = generateWMSUrl('countries');
    const disputedAreasUrl = generateWMSUrl('disputedAreas');

    // Update URLs in documentation (showing iD format URLs)
    const openUrlEl = document.getElementById('wmsOpenUrl');
    const closedUrlEl = document.getElementById('wmsClosedUrl');
    const countriesUrlEl = document.getElementById('wmsCountriesUrl');
    const disputedUrlEl = document.getElementById('wmsDisputedUrl');

    if (openUrlEl) openUrlEl.textContent = openNotesUrl;
    // if (closedUrlEl) closedUrlEl.textContent = closedNotesUrl; // Disabled
    if (countriesUrlEl) countriesUrlEl.textContent = countriesUrl;
    if (disputedUrlEl) disputedUrlEl.textContent = disputedAreasUrl;

    // URLs are now hardcoded in the HTML/translations, no need to update dynamically

    // Setup copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.copy;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                copyToClipboard(targetEl.textContent);
                const originalText = btn.textContent;
                btn.textContent = i18n.t('map.wms.copied');
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    });

    // Apply i18n to newly added elements
    i18n.updatePageContent();
}

/**
 * Generate WMS GetCapabilities URL for JOSM and Vespucci
 * JOSM and Vespucci use GetCapabilities to query the service and discover available layers
 * The URL should end with ? (JOSM/Vespucci will add the GetCapabilities parameters)
 * @returns {string} WMS base URL for GetCapabilities
 */
function generateWMSGetCapabilitiesUrl() {
    // Base URL for GetCapabilities - JOSM/Vespucci will add SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
    return 'http://geoserver.osm.lat/geoserver/osm_notes/ows?';
}

/**
 * Toggle boundaries layer visibility
 * @param {string} layerKey - Layer key ('boundaries-countries' or 'boundaries-disputed')
 * @param {boolean} visible - Whether to show or hide the layer
 */
function toggleBoundariesLayer(layerKey, visible) {
    if (!maps.boundaries) return;

    const layerMap = {
        'boundaries-countries': WMS_LAYERS.countries,
        'boundaries-disputed': WMS_LAYERS.disputedAreas
    };

    const wmsLayerName = layerMap[layerKey];
    if (!wmsLayerName) return;

    const wmsLayer = wmsLayers[layerKey];

    if (visible) {
        // Add layer if not already present
        if (!wmsLayer) {
            addWMSLayer(maps.boundaries, wmsLayerName, layerKey);
        } else if (!maps.boundaries.hasLayer(wmsLayer)) {
            // Layer exists but not on map, add it
            wmsLayer.addTo(maps.boundaries);
            wmsLayerMap[layerKey] = maps.boundaries;
        }
    } else {
        // Remove layer if present
        if (wmsLayer && maps.boundaries.hasLayer(wmsLayer)) {
            maps.boundaries.removeLayer(wmsLayer);
        }
    }

    // After toggling, ensure base layer is visible and refresh map
    // This fixes issues when all WMS layers are removed - base layer should still be visible
    setTimeout(() => {
        // Ensure map container is visible
        const mapContainer = document.getElementById('boundaries-map');
        if (!mapContainer || !mapContainer.classList.contains('active')) {
            return; // Don't refresh if map is not active
        }

        // Ensure base layer OSM is present and visible
        if (!baseLayers.osm) {
            console.error('Base layer OSM not initialized');
            return;
        }

        // Remove satellite if present (boundaries map should only use OSM)
        if (maps.boundaries.hasLayer(baseLayers.satellite)) {
            maps.boundaries.removeLayer(baseLayers.satellite);
        }

        // Ensure OSM base layer is on the map - remove and re-add to force refresh
        const center = maps.boundaries.getCenter();
        const zoom = maps.boundaries.getZoom();

        // Remove OSM layer if present
        if (maps.boundaries.hasLayer(baseLayers.osm)) {
            maps.boundaries.removeLayer(baseLayers.osm);
        }

        // Wait a bit then re-add
        setTimeout(() => {
            baseLayers.osm.addTo(maps.boundaries);

            // Invalidate size to ensure tiles load correctly
            maps.boundaries.invalidateSize();

            // Force a refresh by slightly moving the view to trigger tile reload
            maps.boundaries.setView([center.lat + 0.000001, center.lng], zoom, {
                reset: false,
                animate: false
            });

            setTimeout(() => {
                maps.boundaries.setView(center, zoom, {
                    reset: false,
                    animate: false
                });
                maps.boundaries.invalidateSize();
            }, 100);
        }, 50);
    }, 150);
}

/**
 * Generate complete WMS URL for iD Editor format
 * iD Editor requires the complete URL with all parameters
 * @param {string} layerKey - Layer key (openNotes, closedNotes, etc.)
 * @returns {string} Complete WMS URL for iD Editor
 */
function generateWMSUrl(layerKey) {
    // Get the layer name without namespace prefix
    const layerName = WMS_LAYER_NAMES[layerKey] || layerKey;

    // Generate complete URL for iD Editor
    // Format: http://...?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=notesopen&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}
    const baseUrl = 'http://geoserver.osm.lat/geoserver/osm_notes/ows';
    return `${baseUrl}?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=${layerName}&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}`;
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
