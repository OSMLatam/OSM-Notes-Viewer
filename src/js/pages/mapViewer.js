/**
 * Map Viewer Page
 * Displays three maps: Open Notes, Closed Notes, and Boundaries
 * Uses WMS layers and geolocation for initial view
 */

import { i18n } from '../utils/i18n.js';
import { getUrlParam, setUrlParam, removeUrlParam } from '../utils/urlParams.js';

// Configuration
const WMS_BASE_URL = 'https://geoserver.osm.lat/geoserver/osm_notes/wms';

const WMS_LAYERS = {
    openNotes: 'osm_notes:notesopen',
    closedNotes: 'osm_notes:notesclosed',
    countries: 'osm_notes:countries',
    disputedAreas: 'osm_notes:disputedareas'
};

// Layer names for JOSM/iD format (without namespace prefix)
const WMS_LAYER_NAMES = {
    openNotes: 'notesopen',
    closedNotes: 'notesclosed',
    countries: 'countries',
    disputedAreas: 'disputedareas'
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
let isRestoringState = false; // Flag to prevent URL updates during state restoration

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

// Store WMS layers per map - each map gets its own layer instances
// Structure: wmsLayers[mapKey][layerKey] = layer instance
// This ensures complete isolation between maps
let wmsLayers = {
    openNotes: {
        openNotes: null
    },
    closedNotes: {
        closedNotes: null
    },
    boundaries: {
        'boundaries-countries': null,
        'boundaries-disputed': null
    }
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
        setupPermalink();
        
        // Restore map state from URL after a delay to ensure maps are ready
        setTimeout(() => {
            restoreMapStateFromUrl();
        }, 500);

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
                    safeRemoveLayer(activeMapInstance, baseLayers.osm);
                    baseLayers.satellite.addTo(activeMapInstance);

                    // Switch back to OSM after a delay
                    // Use a longer delay to allow satellite tiles to start loading
                    // This reduces NS_BINDING_ABORTED errors
                    setTimeout(() => {
                        safeRemoveLayer(activeMapInstance, baseLayers.satellite);
                        baseLayers.osm.addTo(activeMapInstance);

                        // Ensure select shows OSM
                        baseLayerSelect.value = 'osm';

                        // Refresh WMS layers by removing and re-adding them
                        // This ensures proper alignment after base layer switch
                        // Only refresh WMS layers for the active map
                        const activeMapKey = mapNameToKey(currentMap);
                        const wmsLayersToRefresh = [];
                        if (wmsLayers[activeMapKey]) {
                            Object.entries(wmsLayers[activeMapKey]).forEach(([layerKey, wmsLayer]) => {
                                if (wmsLayer && activeMapInstance.hasLayer(wmsLayer)) {
                                    wmsLayersToRefresh.push({ layerKey, wmsLayer });
                                    activeMapInstance.removeLayer(wmsLayer);
                                }
                            });
                        }

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
    const mapKey = mapNameToKey(mapName);

    // CRITICAL: Remove ALL WMS layers from ALL maps first to prevent cross-contamination
    // This ensures that when switching tabs, only the correct layer is visible
    // BUT: Do NOT remove base layers - they should persist
    Object.entries(maps).forEach(([currentMapKey, mapInstance]) => {
        if (mapInstance) {
            // Remove all WMS layers from all maps' storage - be very aggressive
            Object.keys(wmsLayers).forEach(storageMapKey => {
                if (wmsLayers[storageMapKey]) {
                    Object.entries(wmsLayers[storageMapKey]).forEach(([layerKey, layer]) => {
                        if (layer) {
                            // Force remove from this map instance
                            if (mapInstance.hasLayer(layer)) {
                                mapInstance.removeLayer(layer);
                            }
                            // Also check if layer has a reference to this map
                            if (layer._map && layer._map === mapInstance) {
                                mapInstance.removeLayer(layer);
                            }
                        }
                    });
                }
            });
        }
    });

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
                safeRemoveLayer(boundariesMap, baseLayers.satellite);

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

    // First, ensure base layers are on the ACTIVE map only
    // Other maps will get their base layers when they become active
    const activeMapInstance = maps[mapKey];
    if (activeMapInstance) {
        // CRITICAL: For closed notes map, ensure container is visible first
        if (mapKey === 'closedNotes') {
            const mapContainer = document.getElementById('closed-notes-map');
            if (mapContainer) {
                // Ensure container is visible
                mapContainer.classList.add('active');
                mapContainer.setAttribute('aria-hidden', 'false');
            }
        }
        
        // CRITICAL: For open notes map, ensure container is visible first
        if (mapKey === 'openNotes') {
            const mapContainer = document.getElementById('open-notes-map');
            if (mapContainer) {
                // Ensure container is visible
                mapContainer.classList.add('active');
                mapContainer.setAttribute('aria-hidden', 'false');
            }
        }
        
        // Setup base layer - this is async, so we need to wait before adding WMS layers
        setupBaseLayerForMap(activeMapInstance, mapKey);
    }
}

/**
 * Safely remove a layer from a map instance
 * @param {L.Map} mapInstance - The map instance
 * @param {L.Layer} layer - The layer to remove
 */
function safeRemoveLayer(mapInstance, layer) {
    if (!mapInstance || !layer) return;
    try {
        // Check if layer exists and has a map reference
        if (layer._map && layer._map === mapInstance) {
            // Check if layer's container still exists in DOM
            if (layer._container && layer._container.parentNode) {
                if (mapInstance.hasLayer(layer)) {
                    mapInstance.removeLayer(layer);
                }
            } else {
                // Container doesn't exist, just remove from map's layer registry
                if (mapInstance.hasLayer(layer)) {
                    try {
                        mapInstance.removeLayer(layer);
                    } catch (e) {
                        // Ignore errors if layer is already being removed
                    }
                }
            }
        } else if (mapInstance.hasLayer(layer)) {
            // Layer is registered but may not have proper map reference
            try {
                mapInstance.removeLayer(layer);
            } catch (e) {
                // Ignore errors - layer may already be removed
            }
        }
    } catch (e) {
        // Layer may have already been removed or DOM node may be null
        // This is safe to ignore - don't log to avoid console spam
    }
}

/**
 * Setup base layer for a map instance
 * @param {L.Map} mapInstance - The map instance
 * @param {string} mapKey - The map key ('openNotes', 'closedNotes', 'boundaries')
 */
function setupBaseLayerForMap(mapInstance, mapKey) {
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
    const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
    const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;

    // CRITICAL: For closed notes, always remove and re-add base layer to force refresh
    // This works for both OSM and satellite
    if (mapKey === 'closedNotes') {
        // Remove ALL base layers first to ensure clean state
        safeRemoveLayer(mapInstance, baseLayers.osm);
        safeRemoveLayer(mapInstance, baseLayers.satellite);
        
        // Wait a moment for removal to complete, then add the correct one
        // For satellite, wait longer to ensure proper cleanup and tile loading
        const removalDelay = selectedBaseLayer === 'satellite' ? 300 : 150;
        setTimeout(() => {
            // Re-read the selector to get current value (could be OSM or satellite)
            const baseLayerSelect2 = document.getElementById('baseLayerSelect');
            const selectedBaseLayer2 = baseLayerSelect2 ? baseLayerSelect2.value : 'osm';
            const correctBaseLayer = selectedBaseLayer2 === 'satellite' ? baseLayers.satellite : baseLayers.osm;
            
            // CRITICAL: For satellite, ensure we're adding to the correct map instance
            // Add base layer (works for both OSM and satellite)
            // For satellite, always force add to ensure it's present
            if (correctBaseLayer === baseLayers.satellite) {
                // Remove first if present to force clean add
                safeRemoveLayer(mapInstance, baseLayers.satellite);
                // Wait a moment then add
                setTimeout(() => {
                    baseLayers.satellite.addTo(mapInstance);
                    mapInstance.invalidateSize();
                }, 50);
            } else {
                if (!mapInstance.hasLayer(correctBaseLayer)) {
                    correctBaseLayer.addTo(mapInstance);
                }
            }
            mapInstance.invalidateSize();
            
            // Force a view change to trigger tile loading (works for both OSM and satellite)
            const center = mapInstance.getCenter();
            const zoom = mapInstance.getZoom();
            mapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                reset: false,
                animate: false
            });
            
            // For satellite, use longer delays to ensure tiles start loading
            const viewRefreshDelay = correctBaseLayer === baseLayers.satellite ? 400 : 200;
            setTimeout(() => {
                mapInstance.setView(center, zoom, {
                    reset: false,
                    animate: false
                });
                mapInstance.invalidateSize();
                
                // Final verification - ensure base layer is present and visible
                if (!mapInstance.hasLayer(correctBaseLayer)) {
                    correctBaseLayer.addTo(mapInstance);
                    mapInstance.invalidateSize();
                }
                
                // Force another refresh to ensure tiles load (especially important for satellite)
                const finalRefreshDelay = correctBaseLayer === baseLayers.satellite ? 350 : 150;
                setTimeout(() => {
                    mapInstance.invalidateSize();
                    // Final check - CRITICAL for satellite
                    if (!mapInstance.hasLayer(correctBaseLayer)) {
                        correctBaseLayer.addTo(mapInstance);
                        mapInstance.invalidateSize();
                    }
                    // For satellite, force multiple refreshes to ensure tiles load
                    if (correctBaseLayer === baseLayers.satellite) {
                        setTimeout(() => {
                            mapInstance.invalidateSize();
                            // One more check
                            if (!mapInstance.hasLayer(correctBaseLayer)) {
                                correctBaseLayer.addTo(mapInstance);
                                mapInstance.invalidateSize();
                            }
                            // Final refresh for satellite
                            setTimeout(() => {
                                mapInstance.invalidateSize();
                                if (!mapInstance.hasLayer(correctBaseLayer)) {
                                    correctBaseLayer.addTo(mapInstance);
                                    mapInstance.invalidateSize();
                                }
                            }, 100);
                        }, 200);
                    }
                }, finalRefreshDelay);
            }, viewRefreshDelay);
        }, removalDelay);
    } else {
        // For other maps (open notes, boundaries), standard logic
        // CRITICAL: For open notes, ensure base layer is always present when switching back
        // This works for both OSM and satellite
        if (mapKey === 'openNotes') {
            // Remove ALL base layers first to ensure clean state (works for both OSM and satellite)
            safeRemoveLayer(mapInstance, baseLayers.osm);
            safeRemoveLayer(mapInstance, baseLayers.satellite);
            
            // Wait a moment for removal to complete, then add the correct one
            setTimeout(() => {
                // Re-read the selector to get current value (could be OSM or satellite)
                const baseLayerSelect3 = document.getElementById('baseLayerSelect');
                const selectedBaseLayer3 = baseLayerSelect3 ? baseLayerSelect3.value : 'osm';
                const correctBaseLayer = selectedBaseLayer3 === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                
                // Add base layer (works for both OSM and satellite)
                correctBaseLayer.addTo(mapInstance);
                mapInstance.invalidateSize();
                
                // Force a view change to trigger tile loading (works for both OSM and satellite)
                const center = mapInstance.getCenter();
                const zoom = mapInstance.getZoom();
                mapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                    reset: false,
                    animate: false
                });
                
                setTimeout(() => {
                    mapInstance.setView(center, zoom, {
                        reset: false,
                        animate: false
                    });
                    mapInstance.invalidateSize();
                    
                    // Final verification - ensure base layer is present and visible
                    if (!mapInstance.hasLayer(correctBaseLayer)) {
                        correctBaseLayer.addTo(mapInstance);
                        mapInstance.invalidateSize();
                    }
                    
                    // Force another refresh to ensure tiles load (especially important for satellite)
                    setTimeout(() => {
                        mapInstance.invalidateSize();
                        // Final check
                        if (!mapInstance.hasLayer(correctBaseLayer)) {
                            correctBaseLayer.addTo(mapInstance);
                            mapInstance.invalidateSize();
                        }
                        // For satellite, force one more refresh
                        if (correctBaseLayer === baseLayers.satellite) {
                            setTimeout(() => {
                                mapInstance.invalidateSize();
                                if (!mapInstance.hasLayer(correctBaseLayer)) {
                                    correctBaseLayer.addTo(mapInstance);
                                    mapInstance.invalidateSize();
                                }
                            }, 100);
                        }
                    }, 150);
                }, 200);
            }, 150);
        } else {
            // For boundaries map
            if (mapInstance.hasLayer(otherBaseLayer)) {
                mapInstance.removeLayer(otherBaseLayer);
            }
            if (!mapInstance.hasLayer(currentBaseLayer)) {
                currentBaseLayer.addTo(mapInstance);
            }
            requestAnimationFrame(() => {
                mapInstance.invalidateSize();
            });
        }
    }

    // WMS layers have already been removed from all maps above
    // Now we only add the correct layers to the active map

    // Ensure correct layers are on the active map ONLY
    // Each map has its own isolated layer instances
    // Use setTimeout to ensure layers are fully removed before adding new ones
    // CRITICAL: Check if satellite is selected - need longer delay for satellite tiles to load
    const baseLayerSelectEl = document.getElementById('baseLayerSelect');
    const selectedBaseLayerType = baseLayerSelectEl ? baseLayerSelectEl.value : 'osm';
    const isSatellite = selectedBaseLayerType === 'satellite';
    // For satellite, wait longer to ensure setupBaseLayerForMap has finished (it has multiple nested setTimeout calls)
    // For closed notes with satellite, need even more time due to complex async operations
    const initialDelay = (isSatellite && mapKey === 'closedNotes') ? 600 : (isSatellite ? 500 : 200);
    
    setTimeout(() => {
        const activeMapInstance = maps[mapKey];
        if (!activeMapInstance) return;
        
        // CRITICAL: Always ensure base layer is present FIRST
        // Re-read selector to get current value (may have changed)
        const baseLayerSelectInner = document.getElementById('baseLayerSelect');
        const selectedBaseLayerInner = baseLayerSelectInner ? baseLayerSelectInner.value : 'osm';
        const currentBaseLayer = selectedBaseLayerInner === 'satellite' ? baseLayers.satellite : baseLayers.osm;
        const otherBaseLayer = selectedBaseLayerInner === 'satellite' ? baseLayers.osm : baseLayers.satellite;

        // CRITICAL: Verify base layer is present (setupBaseLayerForMap should have set it, but verify)
        // For satellite, this is especially important as it takes longer to load
        if (!activeMapInstance.hasLayer(currentBaseLayer)) {
            // If base layer is not present, add it immediately
            currentBaseLayer.addTo(activeMapInstance);
            activeMapInstance.invalidateSize();
            
            // For satellite, force a view refresh to trigger tile loading
            if (isSatellite) {
                const center = activeMapInstance.getCenter();
                const zoom = activeMapInstance.getZoom();
                activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                    reset: false,
                    animate: false
                });
                setTimeout(() => {
                    activeMapInstance.setView(center, zoom, {
                        reset: false,
                        animate: false
                    });
                    activeMapInstance.invalidateSize();
                }, 100);
            }
        }
        
        // Remove other base layer if present
        safeRemoveLayer(activeMapInstance, otherBaseLayer);
        
        // Force invalidate size to ensure base layer renders
        activeMapInstance.invalidateSize();
        
        // CRITICAL: Remove ALL WMS layers from this map first, then add only the correct ones
        // This ensures clean state when switching tabs
        Object.keys(wmsLayers).forEach(storageMapKey => {
            if (wmsLayers[storageMapKey]) {
                Object.values(wmsLayers[storageMapKey]).forEach(layer => {
                    if (layer) {
                        safeRemoveLayer(activeMapInstance, layer);
                    }
                });
            }
        });
        
        // Wait a bit to ensure base layer is ready before adding WMS layers
        // For satellite, wait longer to ensure tiles are loading
        // For closed notes with satellite, need even more time to ensure base layer is fully loaded
        const wmsDelay = (isSatellite && mapKey === 'closedNotes') ? 1000 : (isSatellite ? 600 : 200);
        setTimeout(() => {
            // CRITICAL: Remove ALL WMS layers from this map again to ensure clean state
            // This is especially important when switching back to open notes
            Object.keys(wmsLayers).forEach(storageMapKey => {
                if (wmsLayers[storageMapKey]) {
                    Object.values(wmsLayers[storageMapKey]).forEach(layer => {
                        if (layer) {
                            safeRemoveLayer(activeMapInstance, layer);
                        }
                    });
                }
            });
            
            // CRITICAL: Verify base layer is present before adding WMS layers
            // This is especially important when switching tabs with satellite selected
            const baseLayerSelect = document.getElementById('baseLayerSelect');
            const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
            const correctBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
            const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;
            
            // Remove other base layer if present
            safeRemoveLayer(activeMapInstance, otherBaseLayer);
            
            // CRITICAL: Ensure correct base layer is present (setupBaseLayerForMap should have set it, but verify)
            if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                // If base layer is not present, add it immediately
                correctBaseLayer.addTo(activeMapInstance);
                activeMapInstance.invalidateSize();
                
                // For satellite, force a view refresh to trigger tile loading
                if (correctBaseLayer === baseLayers.satellite) {
                    const center = activeMapInstance.getCenter();
                    const zoom = activeMapInstance.getZoom();
                    activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                        reset: false,
                        animate: false
                    });
                    setTimeout(() => {
                        activeMapInstance.setView(center, zoom, {
                            reset: false,
                            animate: false
                        });
                        activeMapInstance.invalidateSize();
                    }, 100);
                }
            } else {
                // Base layer is present, but for satellite, force a refresh to ensure tiles are loading
                if (correctBaseLayer === baseLayers.satellite) {
                    activeMapInstance.invalidateSize();
                    const center = activeMapInstance.getCenter();
                    const zoom = activeMapInstance.getZoom();
                    activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                        reset: false,
                        animate: false
                    });
                    setTimeout(() => {
                        activeMapInstance.setView(center, zoom, {
                            reset: false,
                            animate: false
                        });
                        activeMapInstance.invalidateSize();
                    }, 100);
                }
            }
            
            // Then, add only the layers that belong to this map
            // For closed notes map, create the layer if it doesn't exist yet
            if (mapKey === 'closedNotes' && (!wmsLayers.closedNotes || !wmsLayers.closedNotes.closedNotes)) {
                // CRITICAL: Ensure base layer is definitely present before adding WMS layer
                // The base layer should have been set up by setupBaseLayerForMap, but verify
                // This works for both OSM and satellite
                // Use correctBaseLayer which was defined above
                if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                    correctBaseLayer.addTo(activeMapInstance);
                    activeMapInstance.invalidateSize();
                }
                
                // Wait longer to ensure base layer tiles are loading before adding WMS
                // This is critical for closed notes map (works for both OSM and satellite)
                // For satellite, wait even longer to ensure tiles are fully loaded and visible
                const wmsAddDelay = correctBaseLayer === baseLayers.satellite ? 1000 : 500;
                setTimeout(() => {
                    // Re-read selector to get current value
                    const baseLayerSelect = document.getElementById('baseLayerSelect');
                    const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                    const correctBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                    
                    // Final check before adding WMS - ensure base layer is present
                    if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                        correctBaseLayer.addTo(activeMapInstance);
                        activeMapInstance.invalidateSize();
                    }
                    
                    // Force a view refresh to ensure base layer tiles are loading
                    // This is especially important for satellite tiles
                    const center = activeMapInstance.getCenter();
                    const zoom = activeMapInstance.getZoom();
                    activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                        reset: false,
                        animate: false
                    });
                    
                    setTimeout(() => {
                        activeMapInstance.setView(center, zoom, {
                            reset: false,
                            animate: false
                        });
                        activeMapInstance.invalidateSize();
                        
                        // Verify base layer is still present (for both OSM and satellite)
                        if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                            correctBaseLayer.addTo(activeMapInstance);
                            activeMapInstance.invalidateSize();
                        }
                        
                        // CRITICAL: Before adding WMS layer, ensure base layer is definitely present
                        // Re-read selector to ensure we have the correct base layer
                        const baseLayerSelectBeforeWMS = document.getElementById('baseLayerSelect');
                        const selectedBaseLayerBeforeWMS = baseLayerSelectBeforeWMS ? baseLayerSelectBeforeWMS.value : 'osm';
                        const baseLayerBeforeWMS = selectedBaseLayerBeforeWMS === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                        
                        // Ensure base layer is present before adding WMS
                        if (!activeMapInstance.hasLayer(baseLayerBeforeWMS)) {
                            baseLayerBeforeWMS.addTo(activeMapInstance);
                            activeMapInstance.invalidateSize();
                        }
                        
                        // Now add WMS layer
                        const bbox = calculateBbox(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, 500);
                        addWMSLayer(maps.closedNotes, WMS_LAYERS.closedNotes, 'closedNotes', bbox);
                        
                        // CRITICAL: Immediately verify base layer is still present after adding WMS
                        // This must happen synchronously, not in a setTimeout
                        // Re-read selector to ensure we have the correct base layer
                        const baseLayerSelectFinal = document.getElementById('baseLayerSelect');
                        const selectedBaseLayerFinal = baseLayerSelectFinal ? baseLayerSelectFinal.value : 'osm';
                        const finalBaseLayer = selectedBaseLayerFinal === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                        
                        // CRITICAL: Check immediately if base layer is still present
                        // For satellite, this is especially important
                        if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                            // Base layer was removed, re-add it immediately
                            finalBaseLayer.addTo(activeMapInstance);
                            // For satellite, ensure it's brought to back so WMS appears on top
                            if (finalBaseLayer === baseLayers.satellite && finalBaseLayer.bringToBack) {
                                finalBaseLayer.bringToBack();
                            }
                        }
                        
                        // Force refresh after adding WMS layer
                        activeMapInstance.invalidateSize();
                        
                        // For satellite, force an additional immediate refresh
                        if (finalBaseLayer === baseLayers.satellite) {
                            // Use requestAnimationFrame to ensure DOM is updated
                            requestAnimationFrame(() => {
                                // Double-check base layer is present
                                if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                                    finalBaseLayer.addTo(activeMapInstance);
                                    if (finalBaseLayer.bringToBack) {
                                        finalBaseLayer.bringToBack();
                                    }
                                }
                                activeMapInstance.invalidateSize();
                                
                                // Force a view refresh to trigger satellite tile loading
                                const center = activeMapInstance.getCenter();
                                const zoom = activeMapInstance.getZoom();
                                activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                                    reset: false,
                                    animate: false
                                });
                                setTimeout(() => {
                                    activeMapInstance.setView(center, zoom, {
                                        reset: false,
                                        animate: false
                                    });
                                    activeMapInstance.invalidateSize();
                                    // Final check
                                    if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                                        finalBaseLayer.addTo(activeMapInstance);
                                        if (finalBaseLayer.bringToBack) {
                                            finalBaseLayer.bringToBack();
                                        }
                                        activeMapInstance.invalidateSize();
                                    }
                                }, 100);
                            });
                        }
                        
                        // CRITICAL: Ensure base layer is still visible after WMS layer is added
                        // This is especially important for satellite - WMS layer addition can interfere
                        // Works for both OSM and satellite
                        setTimeout(() => {
                            // Double-check base layer is present
                            if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                                finalBaseLayer.addTo(activeMapInstance);
                                activeMapInstance.invalidateSize();
                            }
                            
                            // Force refresh for satellite tiles
                            if (finalBaseLayer === baseLayers.satellite) {
                                activeMapInstance.invalidateSize();
                                // Force view refresh to trigger tile loading
                                const center = activeMapInstance.getCenter();
                                const zoom = activeMapInstance.getZoom();
                                activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                                    reset: false,
                                    animate: false
                                });
                                setTimeout(() => {
                                    activeMapInstance.setView(center, zoom, {
                                        reset: false,
                                        animate: false
                                    });
                                    activeMapInstance.invalidateSize();
                                    // Final check
                                    if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                                        finalBaseLayer.addTo(activeMapInstance);
                                        activeMapInstance.invalidateSize();
                                    }
                                    // One more refresh for satellite
                                    setTimeout(() => {
                                        activeMapInstance.invalidateSize();
                                        if (!activeMapInstance.hasLayer(finalBaseLayer)) {
                                            finalBaseLayer.addTo(activeMapInstance);
                                            activeMapInstance.invalidateSize();
                                        }
                                    }, 150);
                                }, 150);
                            } else {
                                activeMapInstance.invalidateSize();
                            }
                        }, 200);
                    }, 200);
                }, 500);
            } else if (wmsLayers[mapKey]) {
                // For existing WMS layers (including when switching back to open notes or closed notes)
                // CRITICAL: Force base layer refresh BEFORE adding WMS (works for both OSM and satellite)
                if (mapKey === 'openNotes' || mapKey === 'closedNotes') {
                    // Re-read selector to get current value
                    const baseLayerSelect = document.getElementById('baseLayerSelect');
                    const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                    const correctBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                    const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;
                    
                    // Remove ALL base layers first to ensure clean state
                    safeRemoveLayer(activeMapInstance, baseLayers.osm);
                    safeRemoveLayer(activeMapInstance, baseLayers.satellite);
                    
                    // Wait a moment, then add correct base layer
                    setTimeout(() => {
                        correctBaseLayer.addTo(activeMapInstance);
                        activeMapInstance.invalidateSize();
                        
                        // Force view refresh for satellite tiles
                        if (correctBaseLayer === baseLayers.satellite) {
                            const center = activeMapInstance.getCenter();
                            const zoom = activeMapInstance.getZoom();
                            activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                                reset: false,
                                animate: false
                            });
                            setTimeout(() => {
                                activeMapInstance.setView(center, zoom, {
                                    reset: false,
                                    animate: false
                                });
                                activeMapInstance.invalidateSize();
                            }, 100);
                        }
                    }, 100);
                    
                    // Wait a moment for base layer to start loading
                    setTimeout(() => {
                        // Re-read selector to get current value
                        const baseLayerSelect = document.getElementById('baseLayerSelect');
                        const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                        const correctBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                        
                        // Verify base layer is present
                        if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                            correctBaseLayer.addTo(activeMapInstance);
                        }
                        activeMapInstance.invalidateSize();
                        
                        // Now add WMS layers
                        Object.entries(wmsLayers[mapKey]).forEach(([layerKey, wmsLayer]) => {
                            if (wmsLayer) {
                                // Add layer if not already on this map
                                if (!activeMapInstance.hasLayer(wmsLayer)) {
                                    activeMapInstance.addLayer(wmsLayer);
                                    // Ensure open notes are on top if present
                                    if (layerKey === 'openNotes') {
                                        wmsLayer.bringToFront();
                                    }
                                }
                                // Refresh WMS layer to ensure it renders correctly with current base layer
                                if (wmsLayer.redraw) {
                                    wmsLayer.redraw();
                                }
                            }
                        });
                        // Force invalidate size after adding WMS layers
                        activeMapInstance.invalidateSize();
                        
                        // Final check - ensure base layer is still present
                        setTimeout(() => {
                            if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                                correctBaseLayer.addTo(activeMapInstance);
                            }
                            // Force a view refresh to trigger tile loading (especially important for satellite)
                            const center = activeMapInstance.getCenter();
                            const zoom = activeMapInstance.getZoom();
                            activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                                reset: false,
                                animate: false
                            });
                            setTimeout(() => {
                                activeMapInstance.setView(center, zoom, {
                                    reset: false,
                                    animate: false
                                });
                                activeMapInstance.invalidateSize();
                                // Final verification
                                if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                                    correctBaseLayer.addTo(activeMapInstance);
                                    activeMapInstance.invalidateSize();
                                }
                                // For satellite, force one more refresh
                                if (correctBaseLayer === baseLayers.satellite) {
                                    setTimeout(() => {
                                        activeMapInstance.invalidateSize();
                                        if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                                            correctBaseLayer.addTo(activeMapInstance);
                                            activeMapInstance.invalidateSize();
                                        }
                                    }, 100);
                                }
                            }, 150);
                        }, 200);
                    });
                } else {
                    // For boundaries map with existing WMS layers
                    // Re-read selector to get current value
                    const baseLayerSelect = document.getElementById('baseLayerSelect');
                    const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                    const correctBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                    const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;
                    
                    // Remove other base layer if present
                    safeRemoveLayer(activeMapInstance, otherBaseLayer);
                    // Ensure current base layer is present
                    if (!activeMapInstance.hasLayer(correctBaseLayer)) {
                        correctBaseLayer.addTo(activeMapInstance);
                        activeMapInstance.invalidateSize();
                    }
                    
                    // Add WMS layers
                    Object.entries(wmsLayers[mapKey]).forEach(([layerKey, wmsLayer]) => {
                        if (wmsLayer) {
                            // Add layer if not already on this map
                            if (!activeMapInstance.hasLayer(wmsLayer)) {
                                activeMapInstance.addLayer(wmsLayer);
                            }
                            // Refresh WMS layer to ensure it renders correctly with current base layer
                            if (wmsLayer.redraw) {
                                wmsLayer.redraw();
                            }
                        }
                    });
                    activeMapInstance.invalidateSize();
                }
            }
        }, 200);
    }, 150);

    // Use requestAnimationFrame to ensure the container is visible before invalidating
    requestAnimationFrame(() => {
        setTimeout(() => {
            // Get the active map instance again (it's already set up by setupBaseLayerForMap)
            const activeMapInstance = maps[mapKey];
            if (!activeMapInstance) return;
            
            // Special handling for boundaries map to ensure base layer is visible
            if (mapKey === 'boundaries') {
                // Ensure base layer OSM is present
                if (!baseLayers.osm) {
                    console.error('Base layer OSM not initialized');
                    return;
                }

                // Remove satellite if present
                safeRemoveLayer(activeMapInstance, baseLayers.satellite);

                // Remove and re-add OSM layer to force refresh
                safeRemoveLayer(activeMapInstance, baseLayers.osm);

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
                // Standard handling for other maps (openNotes, closedNotes)
                // CRITICAL: Don't interfere with base layer setup that was done in setupBaseLayerForMap
                // Just verify that the correct base layer is present
                const baseLayerSelect = document.getElementById('baseLayerSelect');
                const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                const otherBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.osm : baseLayers.satellite;

                // Only remove other base layer if it's definitely present and wrong
                // Use safeRemoveLayer to avoid errors
                safeRemoveLayer(activeMapInstance, otherBaseLayer);

                // CRITICAL: Ensure current base layer is present (especially important for satellite)
                if (!activeMapInstance.hasLayer(currentBaseLayer)) {
                    currentBaseLayer.addTo(activeMapInstance);
                    activeMapInstance.invalidateSize();
                    
                    // For satellite, force a view refresh to trigger tile loading
                    if (currentBaseLayer === baseLayers.satellite) {
                        const center = activeMapInstance.getCenter();
                        const zoom = activeMapInstance.getZoom();
                        activeMapInstance.setView([center.lat + 0.000001, center.lng], zoom, {
                            reset: false,
                            animate: false
                        });
                        setTimeout(() => {
                            activeMapInstance.setView(center, zoom, {
                                reset: false,
                                animate: false
                            });
                            activeMapInstance.invalidateSize();
                        }, 100);
                    }
                } else {
                    // Base layer is present, but for satellite, ensure it's visible
                    if (currentBaseLayer === baseLayers.satellite) {
                        activeMapInstance.invalidateSize();
                    }
                }

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

        // Initialize Map 2: Closed Notes (hidden initially)
        await initializeClosedNotesMap();

        // Initialize Map 3: Boundaries (hidden initially)
        await initializeBoundariesMap();

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
            safeRemoveLayer(activeMapInstance, baseLayers.satellite);
        }

        // CRITICAL: After initialization, ensure only the active map has WMS layers
        // Remove any WMS layers from inactive maps that might have been added during initialization
        Object.entries(maps).forEach(([mapKeyIter, mapInstance]) => {
            if (mapInstance && mapKeyIter !== activeMapKey) {
                // Remove all WMS layers from inactive maps
                Object.keys(wmsLayers).forEach(storageMapKey => {
                    if (wmsLayers[storageMapKey]) {
                        Object.values(wmsLayers[storageMapKey]).forEach(layer => {
                            if (layer && mapInstance.hasLayer(layer)) {
                                mapInstance.removeLayer(layer);
                            }
                        });
                    }
                });
            }
        });

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
    safeRemoveLayer(maps.openNotes, baseLayers.satellite);

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
 */
async function initializeClosedNotesMap() {
    const mapContainer = document.getElementById('closed-notes-map');
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
    maps.closedNotes = L.map('closed-notes-map', {
        zoomControl: true,
        attributionControl: false, // Disable default to avoid duplicates
        center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon],
        zoom: DEFAULT_ZOOM,
        crs: L.CRS.EPSG3857 // Explicitly set CRS to match base map tiles
    });
    
    // Add custom attribution control without "Leaflet" prefix
    const closedNotesAttribution = L.control.attribution({
        prefix: false
    });
    closedNotesAttribution.addTo(maps.closedNotes);
    // Add OSM attribution manually to ensure it's always shown
    closedNotesAttribution.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');

    // Set initial view to default location
    initialViews.closedNotes = { center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon], zoom: DEFAULT_ZOOM };

    // Add base layer - ensure OSM is added, not satellite
    baseLayers.osm.addTo(maps.closedNotes);
    
    // Double-check that satellite is NOT on the map
    safeRemoveLayer(maps.closedNotes, baseLayers.satellite);

    // Wait for next frame to ensure map container is fully rendered
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Force Leaflet to calculate size and start loading tiles immediately
    maps.closedNotes.invalidateSize();
    
    // Listen for map load event to ensure tiles are displayed
    maps.closedNotes.once('load', () => {
        // Map is fully loaded, ensure tiles are visible
        maps.closedNotes.invalidateSize();
    });
    
    // Also force a refresh after a delay to ensure tiles load
    setTimeout(() => {
        maps.closedNotes.invalidateSize();
        const center = maps.closedNotes.getCenter();
        const zoom = maps.closedNotes.getZoom();
        maps.closedNotes.setView(center, zoom);
    }, 200);
    
    // DO NOT add WMS layer during initialization for closed notes map
    // The layer will be added when the user switches to the closed notes tab
    // This prevents both layers from being active at the same time on page load
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

                // Update initial views for open and closed notes maps
                const zoom = calculateZoomForBbox(bbox);
                initialViews.openNotes = { center: [userLocation.lat, userLocation.lon], zoom };
                initialViews.closedNotes = { center: [userLocation.lat, userLocation.lon], zoom };

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
        if (maps.closedNotes) {
            maps.closedNotes.invalidateSize();
        }
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
 * @param {string} layerKey - Key for storing layer reference (e.g., 'openNotes', 'closedNotes')
 * @param {Object} bbox - Optional bounding box (not used with plugin, but kept for compatibility)
 */
function addWMSLayer(map, layerName, layerKey, bbox = null) {
    if (!map) return;

    // Determine which map this layer belongs to based on the map instance
    let mapKey = null;
    if (map === maps.openNotes) {
        mapKey = 'openNotes';
    } else if (map === maps.closedNotes) {
        mapKey = 'closedNotes';
    } else if (map === maps.boundaries) {
        mapKey = 'boundaries';
    } else {
        console.error('Unknown map instance in addWMSLayer');
        return;
    }

    // Initialize map entry if it doesn't exist
    if (!wmsLayers[mapKey]) {
        wmsLayers[mapKey] = {};
    }

    // Remove existing layer from this map if present
    if (wmsLayers[mapKey][layerKey] && map.hasLayer(wmsLayers[mapKey][layerKey])) {
        map.removeLayer(wmsLayers[mapKey][layerKey]);
        wmsLayers[mapKey][layerKey] = null;
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
                // CRITICAL: Before adding WMS layer, ensure base layer is present
                // This is especially important for satellite
                const baseLayerSelect = document.getElementById('baseLayerSelect');
                const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
                const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
                
                // Ensure base layer is present before adding WMS
                if (!map.hasLayer(currentBaseLayer)) {
                    currentBaseLayer.addTo(map);
                }
                
                wmsLayer.addTo(map);
                
                // CRITICAL: Immediately after adding WMS, verify base layer is still present
                // WMS layer addition can sometimes interfere with base layers
                if (!map.hasLayer(currentBaseLayer)) {
                    // Base layer was removed, re-add it immediately
                    currentBaseLayer.addTo(map);
                }
                
                // Store layer in map-specific structure
                if (!wmsLayers[mapKey]) {
                    wmsLayers[mapKey] = {};
                }
                wmsLayers[mapKey][layerKey] = wmsLayer;

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
    // Always create a new layer instance for each map to ensure complete isolation
    if (!wmsLayers[mapKey][layerKey] || !map.hasLayer(wmsLayers[mapKey][layerKey])) {
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
            attribution: '<a href="https://github.com/OSM-Notes/OSM-Notes-Analytics">OSM Notes Analytics</a>',
            tiled: true,
            updateWhenIdle: false,
            updateWhenZooming: true
            // Don't specify pane - let Leaflet handle layer ordering naturally
        });

        // CRITICAL: Before adding WMS layer, ensure base layer is present
        // This is especially important for satellite
        const baseLayerSelect = document.getElementById('baseLayerSelect');
        const selectedBaseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
        const currentBaseLayer = selectedBaseLayer === 'satellite' ? baseLayers.satellite : baseLayers.osm;
        
        // Ensure base layer is present before adding WMS
        if (!map.hasLayer(currentBaseLayer)) {
            currentBaseLayer.addTo(map);
        }
        
        // Add WMS layer to map - it will appear on top of base layers
        wmsLayer.addTo(map);
        
        // CRITICAL: Immediately after adding WMS, verify base layer is still present
        // WMS layer addition can sometimes interfere with base layers
        // For satellite, this is especially critical
        if (!map.hasLayer(currentBaseLayer)) {
            // Base layer was removed, re-add it immediately and bring to back
            currentBaseLayer.addTo(map);
            // Ensure base layer is behind WMS layer
            if (currentBaseLayer.bringToBack) {
                currentBaseLayer.bringToBack();
            }
            // Force invalidate to ensure tiles load
            map.invalidateSize();
        } else if (currentBaseLayer === baseLayers.satellite) {
            // For satellite, even if present, ensure it's visible and refresh
            if (currentBaseLayer.bringToBack) {
                currentBaseLayer.bringToBack();
            }
            map.invalidateSize();
        }
        
        // Store layer in map-specific structure
        wmsLayers[mapKey][layerKey] = wmsLayer;

        // Ensure open notes layer is always on top
        if (layerKey === 'openNotes') {
            setTimeout(() => {
                if (map.hasLayer(wmsLayer)) {
                    wmsLayer.bringToFront();
                }
            }, 100);
        }

        // Add click handler for popups - only add once per map
        // Check if handler already exists to avoid duplicates
        if (!map._wmsClickHandlerAdded) {
            map.on('click', async (e) => {
                // Determine which layer to query based on active map
                let activeLayerName = null;
                if (map === maps.openNotes && wmsLayers.openNotes && wmsLayers.openNotes.openNotes) {
                    activeLayerName = WMS_LAYERS.openNotes;
                } else if (map === maps.closedNotes && wmsLayers.closedNotes && wmsLayers.closedNotes.closedNotes) {
                    activeLayerName = WMS_LAYERS.closedNotes;
                } else if (map === maps.boundaries) {
                    // For boundaries, check which layers are active
                    if (wmsLayers.boundaries && wmsLayers.boundaries['boundaries-countries']) {
                        activeLayerName = WMS_LAYERS.countries;
                    } else if (wmsLayers.boundaries && wmsLayers.boundaries['boundaries-disputed']) {
                        activeLayerName = WMS_LAYERS.disputedAreas;
                    }
                }
                if (activeLayerName) {
                    await handleMapClick(e, map, activeLayerName);
                }
            });
            map._wmsClickHandlerAdded = true;
        }
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
            // Clear URL parameters when resetting view
            setTimeout(() => {
                removeUrlParam('lat');
                removeUrlParam('lon');
                removeUrlParam('zoom');
                removeUrlParam('tab');
                removeUrlParam('baseLayer');
                removeUrlParam('boundariesCountries');
                removeUrlParam('boundariesDisputed');
            }, 300);
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

    // Only switch base layer on the ACTIVE map
    const activeMapKey = mapNameToKey(currentMap);
    const activeMap = maps[activeMapKey];
    
    if (activeMap && oldLayer && newLayer) {
        try {
            // Preserve current view (center and zoom) before switching layers
            const currentCenter = activeMap.getCenter();
            const currentZoom = activeMap.getZoom();

            // Stop any ongoing animations
            if (activeMap.stop) {
                activeMap.stop();
            }

            // Remove old layer if present
            if (activeMap.hasLayer(oldLayer)) {
                activeMap.removeLayer(oldLayer);
            }

            // Add new layer if not already present
            if (!activeMap.hasLayer(newLayer)) {
                newLayer.addTo(activeMap);
            }

            // Ensure view stays the same after layer switch
            // Use requestAnimationFrame to allow Leaflet to process the layer change
            requestAnimationFrame(() => {
                // Set view without reset to avoid canceling tile requests
                activeMap.setView(currentCenter, currentZoom, {
                    reset: false,
                    animate: false
                });

                // Invalidate size after a small delay to ensure tiles start loading
                setTimeout(() => {
                    activeMap.invalidateSize();

                    // Refresh WMS layers to ensure they align properly and appear on top
                    // Only refresh layers that belong to the active map
                    setTimeout(() => {
                        if (wmsLayers[activeMapKey]) {
                            const layerOrder = [];
                            if (activeMapKey === 'openNotes') {
                                layerOrder.push('openNotes');
                            } else if (activeMapKey === 'closedNotes') {
                                layerOrder.push('closedNotes');
                            } else if (activeMapKey === 'boundaries') {
                                layerOrder.push('boundaries-countries', 'boundaries-disputed');
                            }

                            // Process layers in the correct order
                            layerOrder.forEach(layerKey => {
                                const wmsLayer = wmsLayers[activeMapKey][layerKey];
                                if (wmsLayer && activeMap.hasLayer(wmsLayer)) {
                                    try {
                                        // Force refresh by removing and re-adding
                                        activeMap.removeLayer(wmsLayer);
                                        
                                        setTimeout(() => {
                                            // Re-add layer - it will appear on top of base layer
                                            wmsLayer.addTo(activeMap);
                                            
                                            // If this is the open notes layer, bring it to front
                                            if (layerKey === 'openNotes') {
                                                wmsLayer.bringToFront();
                                            }
                                            
                                            // Force WMS layer to update its tiles
                                            activeMap.invalidateSize();
                                            
                                            // Trigger a small view change to force tile refresh
                                            const center = activeMap.getCenter();
                                            const zoom = activeMap.getZoom();
                                            activeMap.setView([center.lat + 0.000001, center.lng], zoom, {
                                                reset: false,
                                                animate: false
                                            });
                                            
                                            setTimeout(() => {
                                                activeMap.setView(center, zoom, {
                                                    reset: false,
                                                    animate: false
                                                });
                                                activeMap.invalidateSize();
                                            }, 50);
                                        }, 150);
                                    } catch (wmsError) {
                                        console.warn('Error refreshing WMS layer:', wmsError);
                                        // Try to re-add layer even if refresh failed
                                        if (wmsLayer && !activeMap.hasLayer(wmsLayer)) {
                                            wmsLayer.addTo(activeMap);
                                            // Ensure open notes are on top
                                            if (layerKey === 'openNotes') {
                                                wmsLayer.bringToFront();
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }, 100);
                }, 50);
            });
        } catch (error) {
            console.warn('Error switching base layer:', error);
        }
    }

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
    const closedNotesUrl = generateWMSUrl('closedNotes');
    const countriesUrl = generateWMSUrl('countries');
    const disputedAreasUrl = generateWMSUrl('disputedAreas');

    // Update URLs in documentation (showing iD format URLs)
    const openUrlEl = document.getElementById('wmsOpenUrl');
    const closedUrlEl = document.getElementById('wmsClosedUrl');
    const countriesUrlEl = document.getElementById('wmsCountriesUrl');
    const disputedUrlEl = document.getElementById('wmsDisputedUrl');

    if (openUrlEl) openUrlEl.textContent = openNotesUrl;
    if (closedUrlEl) closedUrlEl.textContent = closedNotesUrl;
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

    // Get layer from boundaries map-specific storage
    const wmsLayer = wmsLayers.boundaries && wmsLayers.boundaries[layerKey] ? wmsLayers.boundaries[layerKey] : null;

    if (visible) {
        // Add layer if not already present
        if (!wmsLayer) {
            addWMSLayer(maps.boundaries, wmsLayerName, layerKey);
        } else if (!maps.boundaries.hasLayer(wmsLayer)) {
            // Layer exists but not on map, add it
            wmsLayer.addTo(maps.boundaries);
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
        safeRemoveLayer(maps.boundaries, baseLayers.osm);

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

/**
 * Update URL with current map state (permalink)
 */
function updatePermalink() {
    // Don't update URL during state restoration
    if (isRestoringState) return;
    
    const activeMapKey = mapNameToKey(currentMap);
    const activeMap = maps[activeMapKey];
    
    if (!activeMap) return;
    
    const center = activeMap.getCenter();
    const zoom = activeMap.getZoom();
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    const baseLayer = baseLayerSelect ? baseLayerSelect.value : 'osm';
    
    // Update URL parameters
    setUrlParam('lat', center.lat.toFixed(6));
    setUrlParam('lon', center.lng.toFixed(6));
    setUrlParam('zoom', zoom.toString());
    setUrlParam('tab', currentMap);
    setUrlParam('baseLayer', baseLayer);
    
    // For boundaries map, also save layer visibility
    if (currentMap === 'boundaries') {
        const countriesCheckbox = document.getElementById('boundariesCountriesCheckbox');
        const disputedCheckbox = document.getElementById('boundariesDisputedCheckbox');
        if (countriesCheckbox) {
            setUrlParam('boundariesCountries', countriesCheckbox.checked ? '1' : '0');
        }
        if (disputedCheckbox) {
            setUrlParam('boundariesDisputed', disputedCheckbox.checked ? '1' : '0');
        }
    } else {
        // Remove boundaries-specific params when not on boundaries tab
        removeUrlParam('boundariesCountries');
        removeUrlParam('boundariesDisputed');
    }
}

/**
 * Restore map state from URL parameters
 */
function restoreMapStateFromUrl() {
    isRestoringState = true;
    
    const lat = parseFloat(getUrlParam('lat'));
    const lon = parseFloat(getUrlParam('lon'));
    const zoom = parseFloat(getUrlParam('zoom'));
    const tab = getUrlParam('tab');
    const baseLayer = getUrlParam('baseLayer');
    
    // Restore tab if valid - do this first
    if (tab && ['open-notes', 'closed-notes', 'boundaries'].includes(tab)) {
        if (tab !== currentMap) {
            switchMap(tab);
            // Wait for map switch to complete before restoring view
            setTimeout(() => {
                restoreMapViewAndLayers(lat, lon, zoom, baseLayer);
                // Re-enable URL updates after restoration is complete
                setTimeout(() => {
                    isRestoringState = false;
                }, 1000);
            }, 500);
            return; // Exit early, will restore view after tab switch
        }
    }
    
    // If no tab change needed, restore view immediately
    restoreMapViewAndLayers(lat, lon, zoom, baseLayer);
    // Re-enable URL updates after restoration is complete
    setTimeout(() => {
        isRestoringState = false;
    }, 1000);
}

/**
 * Restore map view and layer settings
 */
function restoreMapViewAndLayers(lat, lon, zoom, baseLayer) {
    const activeMapKey = mapNameToKey(currentMap);
    const activeMap = maps[activeMapKey];
    
    // Restore map view if valid coordinates and zoom
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom) && 
        lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && zoom >= 0 && zoom <= 20) {
        if (activeMap) {
            // Wait a bit for map to be ready
            setTimeout(() => {
                activeMap.setView([lat, lon], zoom, { animate: false });
            }, 300);
        }
    }
    
    // Restore base layer if valid
    if (baseLayer && ['osm', 'satellite'].includes(baseLayer)) {
        const baseLayerSelect = document.getElementById('baseLayerSelect');
        if (baseLayerSelect && baseLayerSelect.value !== baseLayer) {
            // Wait a bit for map to be ready before switching layers
            setTimeout(() => {
                baseLayerSelect.value = baseLayer;
                // Trigger change event to switch layer
                baseLayerSelect.dispatchEvent(new Event('change'));
            }, 400);
        }
    }
    
    // Restore boundaries layer visibility
    if (currentMap === 'boundaries') {
        const countriesParam = getUrlParam('boundariesCountries');
        const disputedParam = getUrlParam('boundariesDisputed');
        
        setTimeout(() => {
            if (countriesParam !== null) {
                const countriesCheckbox = document.getElementById('boundariesCountriesCheckbox');
                if (countriesCheckbox) {
                    countriesCheckbox.checked = countriesParam === '1';
                    countriesCheckbox.dispatchEvent(new Event('change'));
                }
            }
            
            if (disputedParam !== null) {
                const disputedCheckbox = document.getElementById('boundariesDisputedCheckbox');
                if (disputedCheckbox) {
                    disputedCheckbox.checked = disputedParam === '1';
                    disputedCheckbox.dispatchEvent(new Event('change'));
                }
            }
        }, 500);
    }
}

/**
 * Copy permalink to clipboard
 */
async function copyPermalink() {
    updatePermalink();
    const url = window.location.href;
    
    try {
        await navigator.clipboard.writeText(url);
        // Show feedback
        const permalinkBtn = document.getElementById('permalinkBtn');
        if (permalinkBtn) {
            const originalText = permalinkBtn.innerHTML;
            permalinkBtn.innerHTML = '<span aria-hidden="true">✓</span> <span data-i18n="map.controls.copied">Copied!</span>';
            permalinkBtn.disabled = true;
            
            setTimeout(() => {
                permalinkBtn.innerHTML = originalText;
                permalinkBtn.disabled = false;
                // Update i18n text
                i18n.updatePageContent();
            }, 2000);
        }
    } catch (error) {
        console.error('Failed to copy permalink:', error);
        // Fallback: select text in a temporary input
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            const permalinkBtn = document.getElementById('permalinkBtn');
            if (permalinkBtn) {
                const originalText = permalinkBtn.innerHTML;
                permalinkBtn.innerHTML = '<span aria-hidden="true">✓</span> <span data-i18n="map.controls.copied">Copied!</span>';
                permalinkBtn.disabled = true;
                
                setTimeout(() => {
                    permalinkBtn.innerHTML = originalText;
                    permalinkBtn.disabled = false;
                    i18n.updatePageContent();
                }, 2000);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Setup permalink functionality
 */
function setupPermalink() {
    // Setup permalink button
    const permalinkBtn = document.getElementById('permalinkBtn');
    if (permalinkBtn) {
        permalinkBtn.addEventListener('click', copyPermalink);
    }
    
    // Add debounced listeners to update URL when map changes
    let updateTimeout;
    const debouncedUpdatePermalink = () => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updatePermalink, 500); // Wait 500ms after last change
    };
    
    // Listen to map move and zoom events for all maps
    Object.values(maps).forEach(map => {
        if (map) {
            map.on('moveend', debouncedUpdatePermalink);
            map.on('zoomend', debouncedUpdatePermalink);
        }
    });
    
    // Listen to tab changes
    const tabs = document.querySelectorAll('.map-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setTimeout(updatePermalink, 300); // Wait for map switch to complete
        });
    });
    
    // Listen to base layer changes
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    if (baseLayerSelect) {
        baseLayerSelect.addEventListener('change', () => {
            setTimeout(updatePermalink, 300); // Wait for layer switch to complete
        });
    }
    
    // Listen to boundaries layer checkbox changes
    const countriesCheckbox = document.getElementById('boundariesCountriesCheckbox');
    const disputedCheckbox = document.getElementById('boundariesDisputedCheckbox');
    if (countriesCheckbox) {
        countriesCheckbox.addEventListener('change', debouncedUpdatePermalink);
    }
    if (disputedCheckbox) {
        disputedCheckbox.addEventListener('change', debouncedUpdatePermalink);
    }
}
