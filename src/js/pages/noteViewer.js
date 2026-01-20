/**
 * Note Viewer Page
 * Displays detailed information about an OSM note
 */

import { apiClient } from '../api/apiClient.js';
import { API_CONFIG } from '../../config/api-config.js';
import { formatDate } from '../utils/formatter.js';
import { showError, showLoading } from '../components/errorHandler.js';
import { shareComponent } from '../components/share.js';
import { getUserAvatarSync } from '../utils/userAvatar.js';
import { i18n } from '../utils/i18n.js';
import { parseNoteId, validateCoordinates } from '../utils/validation.js';
import { fetchWithRetry } from '../utils/retry.js';
import { prefetchNoteRelatedData, prefetchMLRecommendation, prefetchCountryInfo } from '../utils/prefetch.js';
import { initDarkMode, toggleTheme } from '../components/darkMode.js';
import {
    isAuthenticated,
    getCurrentUser,
    initiateLogin,
    logout,
    commentOnNote,
    closeNote,
    reopenNote,
    hasPermission
} from '../auth/osmAuth.js';
import { translateText, isTranslationAvailable } from '../utils/translator.js';

// Get note ID from URL
const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get('id');

// State
let noteData = null;
let map = null;
let marker = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize dark mode
    initDarkMode();

    // Setup theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Initialize i18n
    await i18n.init();
    i18n.updatePageContent();

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        // Update page content translations
        i18n.updatePageContent();
        // Re-render dynamic content with new translations
        if (noteData) {
            renderNoteInfo();
            renderInteractions();
        }
        // Update search form translations
        updateSearchFormTranslations();
    });

    if (!noteId) {
        // Show search form instead of error
        showNoteSearchForm();
        setupNoteSearchForm();
        return;
    }

    try {
        await loadNote(noteId);
    } catch (error) {
        console.error('Error loading note:', error);
        showError(document.getElementById('noteError'), `Failed to load note: ${error.message}`);
        document.getElementById('noteLoading').style.display = 'none';
    }
});

/**
 * Show the note search form
 */
function showNoteSearchForm() {
    const searchForm = document.getElementById('noteSearchForm');
    const loading = document.getElementById('noteLoading');
    const error = document.getElementById('noteError');

    if (searchForm) {
        searchForm.style.display = 'block';
    }
    if (loading) {
        loading.style.display = 'none';
    }
    if (error) {
        error.style.display = 'none';
    }
    updateSearchFormTranslations();
}

/**
 * Update search form translations
 */
function updateSearchFormTranslations() {
    const input = document.getElementById('noteIdInput');
    if (input) {
        input.placeholder = i18n.t('note.search.placeholder');
    }
}

/**
 * Setup the note search form handler
 */
function setupNoteSearchForm() {
    const form = document.getElementById('searchNoteForm');
    const input = document.getElementById('noteIdInput');
    const errorDiv = document.getElementById('noteIdError');

    if (!form || !input || !errorDiv) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear previous error
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        const inputValue = input.value.trim();

        // Validate note ID
        try {
            const validatedId = parseNoteId(inputValue);
            // Redirect to note page with ID
            window.location.href = `note.html?id=${validatedId}`;
        } catch (error) {
            // Show validation error
            errorDiv.textContent = i18n.t('note.search.invalidId');
            errorDiv.style.display = 'block';
            input.focus();
            input.setAttribute('aria-invalid', 'true');
        }
    });

    // Clear error on input
    input.addEventListener('input', () => {
        if (errorDiv.style.display === 'block') {
            errorDiv.style.display = 'none';
            input.removeAttribute('aria-invalid');
        }
    });
}

/**
 * Load note data from OSM API
 * @param {number|string} noteId - Note ID
 */
async function loadNote(noteId) {
    const loading = document.getElementById('noteLoading');
    const error = document.getElementById('noteError');
    const content = document.getElementById('noteContent');

    try {
        loading.style.display = 'block';
        error.style.display = 'none';
        content.style.display = 'none';

        // Fetch note from OSM API with retry logic
        const response = await fetchWithRetry(
            `https://api.openstreetmap.org/api/0.6/notes/${noteId}.json`,
            {},
            { maxRetries: 3, initialDelay: 1000 }
        );

        const data = await response.json();
        noteData = parseNoteData(data, noteId);

        // Validate note coordinates
        if (!validateCoordinates(noteData.lat, noteData.lon)) {
            throw new Error('Invalid note coordinates');
        }

        // Hide loading, show content
        loading.style.display = 'none';
        content.style.display = 'block';

        // Render all sections
        renderNoteInfo();
        renderMap();
        renderHashtags();
        renderInteractions();
        renderActionButtons();
        setupCommentForm();
        setupShareButton();
        setupXmlLink();

        // Prefetch related data in parallel (non-blocking)
        prefetchNoteRelatedData(noteData);

        // Prefetch country info and ML recommendation (low priority)
        prefetchCountryInfo(noteId, 2);
        if (noteData.status === 'open') {
            prefetchMLRecommendation(noteId, 1);
        }

        // Load country info from Analytics API
        await loadCountryInfo(noteId);

        // Load ML recommendation (if available)
        await loadMLRecommendation(noteId);

    } catch (error) {
        console.error('Error in loadNote:', error);
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = error.message || 'Failed to load note';
        throw error;
    }
}

/**
 * Parse note data from OSM API response
 * @param {Object} data - API response data
 * @param {number|string} noteId - Note ID
 * @returns {Object} Parsed note data
 */
function parseNoteData(data, noteId) {
    // Handle GeoJSON format (current OSM Notes API)
    if (data.type === 'Feature' && data.geometry && data.geometry.coordinates) {
        const [lon, lat] = data.geometry.coordinates;
        const properties = data.properties || {};
        const comments = properties.comments || [];

        // Get note text from first comment (creation comment)
        const firstComment = comments.length > 0 ? comments[0] : null;
        const noteText = firstComment?.text || '';

        return {
            id: parseInt(properties.id || noteId, 10),
            lat: lat,
            lon: lon,
            status: properties.status || 'open',
            dateCreated: properties.date_created || properties.created_at || firstComment?.date,
            dateClosed: properties.date_closed || properties.closed_at,
            comments: comments.map(comment => {
                // Handle both formats: user as object or user/uid directly in comment
                let userData = null;
                if (comment.user && typeof comment.user === 'object') {
                    // User is an object
                    userData = {
                        uid: comment.user.uid || comment.user.id,
                        user: comment.user.user || comment.user.username || 'Anonymous'
                    };
                } else if (comment.uid || comment.user) {
                    // User data is directly in comment (OSM API format)
                    userData = {
                        uid: comment.uid || null,
                        user: comment.user || 'Anonymous'
                    };
                }

                return {
                    date: comment.date,
                    user: userData,
                    text: comment.text || '',
                    action: comment.action || 'commented'
                };
            }),
            text: noteText,
            properties: properties
        };
    }

    // Handle old API format (backup)
    if (data.elements && data.elements.length > 0) {
        const note = data.elements[0];
        const comments = note.comments || [];
        const firstComment = comments.length > 0 ? comments[0] : null;

        return {
            id: parseInt(note.id || noteId, 10),
            lat: parseFloat(note.lat),
            lon: parseFloat(note.lon),
            status: note.status || 'open',
            dateCreated: note.date_created || note.created_at || firstComment?.date,
            dateClosed: note.date_closed || note.closed_at,
            comments: comments.map(comment => {
                // Handle both formats: user as object or user/uid directly in comment
                let userData = null;
                if (comment.user && typeof comment.user === 'object') {
                    // User is an object
                    userData = {
                        uid: comment.user.uid || comment.user.id,
                        user: comment.user.user || comment.user.username || 'Anonymous'
                    };
                } else if (comment.uid || comment.user) {
                    // User data is directly in comment (OSM API format)
                    userData = {
                        uid: comment.uid || null,
                        user: comment.user || 'Anonymous'
                    };
                }

                return {
                    date: comment.date,
                    user: userData,
                    text: comment.text || '',
                    action: comment.action || 'commented'
                };
            }),
            text: firstComment?.text || '',
            properties: note
        };
    }

    throw new Error('Invalid note data format');
}

/**
 * Render basic note information
 */
function renderNoteInfo() {
    if (!noteData) return;

    // Note ID
    document.getElementById('noteIdDisplay').textContent = `${i18n.t('common.note')} #${noteData.id}`;
    
    // Setup navigation links
    setupNoteNavigation();

    // Status badge
    const statusBadge = document.getElementById('noteStatusBadge');
    const statusKey = `note.status.${noteData.status}`;
    statusBadge.textContent = i18n.t(statusKey) || noteData.status;
    statusBadge.className = `status-badge ${noteData.status}`;

    // Dates
    if (noteData.dateCreated) {
        const createdDate = new Date(noteData.dateCreated);
        document.getElementById('noteCreatedDate').textContent = `${i18n.t('note.action.created')}: ${formatDate(createdDate)}`;
    }

    // Created by (first comment user)
    const createdByEl = document.getElementById('noteCreatedBy');
    if (!createdByEl) {
        console.error('noteCreatedBy element not found');
        return;
    }

    if (noteData.comments && noteData.comments.length > 0) {
        const firstComment = noteData.comments[0];

        // Get user info from first comment - only show if user exists and is not Anonymous
        if (firstComment.user && firstComment.user.user && firstComment.user.user !== 'Anonymous') {
            const userName = firstComment.user.user || firstComment.user.username;
            const userId = firstComment.user.uid || firstComment.user.id;

            if (userName && userId) {
                // Clear any existing content
                createdByEl.innerHTML = '';

                // Create text node for "Created by"
                const labelText = document.createTextNode(`${i18n.t('note.createdBy')} `);
                createdByEl.appendChild(labelText);

                // Create link to user profile
                const userLink = document.createElement('a');
                userLink.href = `user.html?id=${userId}`;
                userLink.textContent = userName;
                userLink.style.marginLeft = '0.25rem';
                createdByEl.appendChild(userLink);

                // Show the element
                createdByEl.removeAttribute('style');
                createdByEl.style.setProperty('display', 'inline', 'important');
                createdByEl.style.visibility = 'visible';
                createdByEl.style.opacity = '1';
            } else {
                // Hide if no valid user info
                createdByEl.style.display = 'none';
            }
        } else {
            // Hide if no user info or Anonymous - don't show "Created by Anonymous"
            createdByEl.style.display = 'none';
        }
    } else {
        createdByEl.style.display = 'none';
    }

    if (noteData.dateClosed) {
        const closedDate = new Date(noteData.dateClosed);
        document.getElementById('noteUpdatedDate').textContent = `${i18n.t('note.action.closed')}: ${formatDate(closedDate)}`;
    } else if (noteData.comments.length > 0) {
        const lastComment = noteData.comments[noteData.comments.length - 1];
        if (lastComment.date) {
            const updatedDate = new Date(lastComment.date);
            document.getElementById('noteUpdatedDate').textContent = `Updated: ${formatDate(updatedDate)}`;
        }
    }

    // Comments count
    const commentsText = noteData.comments.length === 1
        ? i18n.t('common.comment')
        : i18n.t('common.comments');
    document.getElementById('noteCommentsCount').textContent = `${noteData.comments.length} ${commentsText}`;

    // Calculate days open
    renderNoteStats();
}

/**
 * Render note statistics (days open, country, etc.)
 */
function renderNoteStats() {
    if (!noteData) return;

    const statsContainer = document.getElementById('noteStats');
    const daysOpenEl = document.getElementById('noteDaysOpen');
    const commentsCountEl = document.getElementById('noteCommentsCountStat');
    const uniqueUsersEl = document.getElementById('noteUniqueUsers');
    const closedByEl = document.getElementById('noteClosedBy');
    const lastActivityEl = document.getElementById('noteLastActivity');
    let hasStats = false;

    // Calculate days open
    if (noteData.dateCreated) {
        const createdDate = new Date(noteData.dateCreated);
        const endDate = noteData.dateClosed ? new Date(noteData.dateClosed) : new Date();
        const diffTime = Math.abs(endDate - createdDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (noteData.dateClosed) {
            daysOpenEl.textContent = `${i18n.t('note.stats.daysOpenClosed')}: ${diffDays} ${diffDays === 1 ? i18n.t('common.day') : i18n.t('common.days')}`;
        } else {
            daysOpenEl.textContent = `${i18n.t('note.stats.daysOpen')}: ${diffDays} ${diffDays === 1 ? i18n.t('common.day') : i18n.t('common.days')}`;
        }
        daysOpenEl.style.display = 'inline';
        hasStats = true;
    }

    // Comments count
    if (noteData.comments && noteData.comments.length > 0) {
        const commentsText = noteData.comments.length === 1
            ? i18n.t('common.comment')
            : i18n.t('common.comments');
        commentsCountEl.textContent = `${i18n.t('note.stats.comments')}: ${noteData.comments.length} ${commentsText}`;
        commentsCountEl.style.display = 'inline';
        hasStats = true;
    }

    // Unique users who commented
    if (noteData.comments && noteData.comments.length > 0) {
        const uniqueUserIds = new Set();
        noteData.comments.forEach(comment => {
            if (comment.user && comment.user.uid) {
                uniqueUserIds.add(comment.user.uid);
            }
        });
        if (uniqueUserIds.size > 0) {
            uniqueUsersEl.textContent = `${i18n.t('note.stats.uniqueUsers')}: ${uniqueUserIds.size}`;
            uniqueUsersEl.style.display = 'inline';
            hasStats = true;
        }
    }

    // Closed by (user who closed the note)
    if (noteData.dateClosed && noteData.comments && noteData.comments.length > 0) {
        // Find the comment that closed the note
        // Try to find by action first, then fallback to last comment if status is closed
        let closedComment = noteData.comments.find(c => c.action === 'closed');

        // If not found by action, check if last comment is the closing one
        if (!closedComment && noteData.status === 'closed') {
            const lastComment = noteData.comments[noteData.comments.length - 1];
            // If last comment has action closed or note is closed and it's the last comment
            if (lastComment && (lastComment.action === 'closed' ||
                (noteData.dateClosed && lastComment.date &&
                 new Date(lastComment.date).getTime() === new Date(noteData.dateClosed).getTime()))) {
                closedComment = lastComment;
            }
        }

        if (closedComment && closedComment.user && closedComment.user.user && closedComment.user.user !== 'Anonymous') {
            const userLink = document.createElement('a');
            userLink.href = `user.html?id=${closedComment.user.uid}`;
            userLink.textContent = closedComment.user.user;
            userLink.style.marginLeft = '0.25rem';
            closedByEl.innerHTML = `${i18n.t('note.stats.closedBy')}: `;
            closedByEl.appendChild(userLink);
            closedByEl.style.display = 'inline';
            hasStats = true;
        }
    }

    // Last activity date
    if (noteData.comments && noteData.comments.length > 0) {
        const lastComment = noteData.comments[noteData.comments.length - 1];
        if (lastComment.date) {
            const lastActivityDate = new Date(lastComment.date);
            lastActivityEl.textContent = `${i18n.t('note.stats.lastActivity')}: ${formatDate(lastActivityDate)}`;
            lastActivityEl.style.display = 'inline';
            hasStats = true;
        }
    }

    // Find related changesets (mentioned in comments or by user who closed)
    renderRelatedChangesets();

    // Render hashtags (they're now in stats section)
    renderHashtags();

    // Country and maritime zone will be set by loadCountryInfo()
    // Show stats container if we have at least one stat
    if (hasStats && statsContainer) {
        statsContainer.style.display = 'flex';
    }
}

/**
 * Find and render related changesets
 * Searches for changeset references in note comments and provides links
 * Only shows for closed/reopened notes or notes with comments
 */
function renderRelatedChangesets() {
    if (!noteData || !noteData.comments) return;

    const container = document.getElementById('noteRelatedChangesets');
    if (!container) return;

    // Only show changeset search for closed/reopened notes or notes with comments (not just the creation comment)
    const isClosedOrReopened = noteData.status === 'closed' || noteData.status === 'reopened';
    const hasMultipleComments = noteData.comments && noteData.comments.length > 1;

    // Don't show for open notes with only the creation comment
    if (!isClosedOrReopened && !hasMultipleComments) {
        container.style.display = 'none';
        return;
    }

    const changesetIds = new Set();

    // Patterns to find changeset references in comments
    const patterns = [
        /changeset[:\s]+(\d+)/gi,
        /cs[:\s]+(\d+)/gi,
        /#(\d{6,})/g,  // # followed by 6+ digits (likely changeset)
        /changeset\/(\d+)/gi,
        /osm\.org\/changeset\/(\d+)/gi
    ];

    // Search all comments for changeset references
    noteData.comments.forEach(comment => {
        if (comment.text) {
            patterns.forEach(pattern => {
                const matches = comment.text.matchAll(pattern);
                for (const match of matches) {
                    const changesetId = parseInt(match[1], 10);
                    if (changesetId && changesetId > 0) {
                        changesetIds.add(changesetId);
                    }
                }
            });
        }
    });

    // If we found changesets, display them
    if (changesetIds.size > 0) {
        container.innerHTML = '';

        const label = document.createElement('span');
        label.textContent = `${i18n.t('note.stats.relatedChangesets')}: `;
        label.style.fontWeight = '600';
        container.appendChild(label);

        const changesetsList = Array.from(changesetIds).sort((a, b) => b - a); // Sort descending

        changesetsList.forEach((changesetId, index) => {
            const link = document.createElement('a');
            link.href = `https://www.openstreetmap.org/changeset/${changesetId}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = `#${changesetId}`;
            link.style.marginLeft = index > 0 ? '0.5rem' : '0.25rem';
            link.style.color = 'var(--primary-color)';
            link.style.textDecoration = 'none';
            link.addEventListener('mouseenter', () => {
                link.style.textDecoration = 'underline';
            });
            link.addEventListener('mouseleave', () => {
                link.style.textDecoration = 'none';
            });
            container.appendChild(link);
        });

        container.style.display = 'inline';
    } else {
        // Show link to search in OSMCha
        container.innerHTML = '';
        const label = document.createElement('span');
        label.textContent = `${i18n.t('note.stats.searchChangesets')}: `;
        label.style.fontWeight = '600';
        container.appendChild(label);

        const osmchaLink = document.createElement('a');
        osmchaLink.href = `https://osmcha.org/?comment=note+${noteData.id}`;
        osmchaLink.target = '_blank';
        osmchaLink.rel = 'noopener noreferrer';
        osmchaLink.textContent = i18n.t('note.stats.searchInOSMCha');
        osmchaLink.style.marginLeft = '0.25rem';
        osmchaLink.style.color = 'var(--primary-color)';
        osmchaLink.style.textDecoration = 'none';
        osmchaLink.addEventListener('mouseenter', () => {
            osmchaLink.style.textDecoration = 'underline';
        });
        osmchaLink.addEventListener('mouseleave', () => {
            osmchaLink.style.textDecoration = 'none';
        });
        container.appendChild(osmchaLink);
        container.style.display = 'inline';
    }
}

/**
 * Render map with note location
 */
function renderMap() {
    if (!noteData || !noteData.lat || !noteData.lon) return;

    const mapContainer = document.getElementById('noteMap');
    if (!mapContainer) return;

    // Initialize main map
    map = L.map('noteMap').setView([noteData.lat, noteData.lon], 15);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Create custom pin icon
    const pinIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: `
            <div style="
                position: relative;
                width: 30px;
                height: 30px;
            ">
                <div style="
                    position: absolute;
                    left: 50%;
                    top: 0;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 20px solid ${noteData.status === 'open' ? '#ff4444' : '#44aa44'};
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                "></div>
                <div style="
                    position: absolute;
                    left: 50%;
                    top: 20px;
                    transform: translateX(-50%);
                    width: 16px;
                    height: 16px;
                    background: ${noteData.status === 'open' ? '#ff4444' : '#44aa44'};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });

    // Add marker with custom icon
    marker = L.marker([noteData.lat, noteData.lon], { icon: pinIcon }).addTo(map);
    const statusText = i18n.t(`note.status.${noteData.status}`) || noteData.status;
    marker.bindPopup(`<b>${i18n.t('common.note')} #${noteData.id}</b><br>${i18n.t('hashtag.filters.status')} ${statusText}`).openPopup();

    // Render small world map for location context
    renderWorldMap();
}

/**
 * Render small world map with low zoom to show global location
 */
function renderWorldMap() {
    if (!noteData || !noteData.lat || !noteData.lon) return;

    const worldMapContainer = document.getElementById('noteWorldMap');
    if (!worldMapContainer) return;

    // Show container first
    worldMapContainer.style.display = 'block';

    // Wait for container to be visible and have dimensions
    setTimeout(() => {
        try {
            // Initialize world map with low zoom (zoom level 4 for continental view)
            const worldMap = L.map('noteWorldMap', {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                touchZoom: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                boxZoom: false,
                keyboard: false
            }).setView([noteData.lat, noteData.lon], 4);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 6,
                minZoom: 2
            }).addTo(worldMap);

            // Add small marker - wait for map to be ready
            worldMap.whenReady(() => {
                // Create small pin icon
                const smallPinIcon = L.divIcon({
                    className: 'custom-pin-icon-small',
                    html: `
                        <div style="
                            position: relative;
                            width: 20px;
                            height: 20px;
                        ">
                            <div style="
                                position: absolute;
                                left: 50%;
                                top: 0;
                                transform: translateX(-50%);
                                width: 0;
                                height: 0;
                                border-left: 5px solid transparent;
                                border-right: 5px solid transparent;
                                border-top: 12px solid ${noteData.status === 'open' ? '#ff4444' : '#44aa44'};
                                filter: drop-shadow(0 1px 3px rgba(0,0,0,0.6));
                            "></div>
                            <div style="
                                position: absolute;
                                left: 50%;
                                top: 12px;
                                transform: translateX(-50%);
                                width: 10px;
                                height: 10px;
                                background: ${noteData.status === 'open' ? '#ff4444' : '#44aa44'};
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.6);
                            "></div>
                        </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 20]
                });

                // Add marker
                const worldMarker = L.marker([noteData.lat, noteData.lon], { icon: smallPinIcon }).addTo(worldMap);

                // Ensure marker is visible by fitting bounds with some padding
                worldMap.fitBounds([[noteData.lat - 10, noteData.lon - 10], [noteData.lat + 10, noteData.lon + 10]], {
                    padding: [20, 20],
                    maxZoom: 4
                });
            });
        } catch (error) {
            // Silently fail - world map is optional
            console.error('Error rendering world map:', error);
        }
    }, 200);
}

/**
 * Load country information from Analytics API
 * @param {number|string} noteId - Note ID
 */
async function loadCountryInfo(noteId) {
    // Try both local and production API
    const apiUrls = [
        import.meta.env.PROD ? null : 'http://localhost:3000',
        'https://notes-api.osm.lat'
    ].filter(Boolean);

    for (const apiBaseUrl of apiUrls) {
        try {
            // Get country information from OSM Notes API (REST API)
            // API endpoint: /api/v1/notes/{note_id}
            // Returns: { data: { id_country: number | null, ... } }
        const noteInfoUrl = `${apiBaseUrl}/api/v1/notes/${noteId}`;

        const response = await fetch(noteInfoUrl, {
                headers: {
                    'User-Agent': 'OSM-Notes-Viewer/1.0 (https://notes.osm.lat)'
                }
            });

            if (!response.ok) {
                continue;
            }

            const apiResponse = await response.json();

            // Extract id_country from API response (wrapped in 'data' property)
            const countryId = apiResponse.data?.id_country;

            if (countryId) {
                try {
                    // Get country details from index
                    const countries = await apiClient.getCountryIndex();
                    const country = countries.find(c => c.country_id === countryId);

                if (country) {
                    const countryLinkContainer = document.getElementById('countryLinkContainer');
                        const countryLink = document.getElementById('countryLink');
                        const countryNameDisplay = country.country_name_en || country.country_name;

                        if (countryLinkContainer && countryLink) {
                            countryLink.href = `country.html?id=${country.country_id}`;
                            countryLink.textContent = countryNameDisplay;
                            countryLinkContainer.style.display = 'flex';
                        }

                        // Also add to stats section
                        const noteCountryEl = document.getElementById('noteCountry');
                        if (noteCountryEl) {
                            const countryLinkStats = document.createElement('a');
                            countryLinkStats.href = `country.html?id=${country.country_id}`;
                            countryLinkStats.textContent = countryNameDisplay;
                            noteCountryEl.innerHTML = `${i18n.t('note.stats.country')}: `;
                            noteCountryEl.appendChild(countryLinkStats);
                            noteCountryEl.style.display = 'inline';

                            // Show stats container if not already visible
                            const statsContainer = document.getElementById('noteStats');
                            if (statsContainer) {
                                statsContainer.style.display = 'flex';
                            }
                        }
                        return; // Success, exit function
                    }
                } catch (error) {
                    console.error('Error finding country in index:', error);
                }
            }
        } catch (error) {
            // CORS or network error - try next URL silently
            // This is expected in development when API is not available
            continue;
        }
    }
}

/**
 * Extract and render hashtags from note text and comments
 */
function renderHashtags() {
    if (!noteData) return;

    const hashtagsContainer = document.getElementById('noteHashtags');
    if (!hashtagsContainer) return;

    const hashtags = new Set();

    // Extract hashtags from note text
    if (noteData.text) {
        const textHashtags = extractHashtags(noteData.text);
        textHashtags.forEach(tag => hashtags.add(tag));
    }

    // Extract hashtags from comments
    noteData.comments.forEach(comment => {
        if (comment.text) {
            const commentHashtags = extractHashtags(comment.text);
            commentHashtags.forEach(tag => hashtags.add(tag));
        }
    });

    if (hashtags.size === 0) {
        hashtagsContainer.style.display = 'none';
        return;
    }

    // Create label and hashtags
    const label = document.createElement('span');
    label.textContent = `${i18n.t('note.hashtags')}: `;
    label.style.fontWeight = '600';
    label.style.marginRight = '0.5rem';

    hashtagsContainer.innerHTML = '';
    hashtagsContainer.appendChild(label);

    Array.from(hashtags).forEach(tag => {
        const tagLink = document.createElement('a');
        tagLink.href = `hashtag.html?tag=${encodeURIComponent(tag)}`;
        tagLink.className = 'hashtag';
        tagLink.textContent = tag;
        tagLink.style.marginRight = '0.5rem';
        hashtagsContainer.appendChild(tagLink);
    });

    hashtagsContainer.style.display = 'inline';
}

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract hashtags from
 * @returns {Array<string>} Array of hashtags
 */
function extractHashtags(text) {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

/**
 * Extract image URLs from text
 * @param {string} text - Text to extract image URLs from
 * @returns {Array<string>} Array of image URLs
 */
function extractImageUrls(text) {
    if (!text) return [];
    
    // Common image URL patterns
    const imageUrlPatterns = [
        // Direct image URLs with common extensions
        /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?/gi,
        // StreetComplete photo URLs
        /https?:\/\/streetcomplete\.app\/p\/[\w\-]+\.(jpg|jpeg|png|gif)/gi,
        // imgur URLs
        /https?:\/\/(i\.)?imgur\.com\/[\w]+\.(jpg|jpeg|png|gif|webp)/gi,
        // flickr URLs
        /https?:\/\/(www\.)?flickr\.com\/photos\/[^\s]+/gi,
        // Generic URLs that might be images (ends with image-like path)
        /https?:\/\/[^\s]+\/(photos?|images?|pics?|p)\/[^\s]+/gi
    ];
    
    const imageUrls = new Set();
    
    imageUrlPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const url = match[0].replace(/[.,;:!?]+$/, ''); // Remove trailing punctuation
            if (url && url.length > 10) { // Basic validation
                imageUrls.add(url);
            }
        }
    });
    
    return Array.from(imageUrls);
}

/**
 * Render interactions timeline
 */
function renderInteractions() {
    if (!noteData) return;

    const interactionsContainer = document.getElementById('noteInteractions');

    if (!noteData.comments || noteData.comments.length === 0) {
        interactionsContainer.innerHTML = `<p>${i18n.t('note.noInteractions')}</p>`;
        return;
    }

    // Create interaction items
    const interactions = noteData.comments.map((comment, index) => {
        const date = comment.date ? new Date(comment.date) : null;
        let actionType = 'commented';
        let actionLabel = i18n.t('note.action.commented');

        // Determine action type
        if (index === 0) {
            actionType = 'created';
            actionLabel = i18n.t('note.action.created');
        } else if (comment.action === 'closed' || (noteData.status === 'closed' && index === noteData.comments.length - 1 && !comment.text)) {
            actionType = 'closed';
            actionLabel = i18n.t('note.action.closed');
        } else if (comment.action === 'reopened') {
            actionType = 'reopened';
            actionLabel = i18n.t('note.action.reopened');
        }

        const commentId = `comment-${index}`;
        const hasText = comment.text && comment.text.trim().length > 0;
        const imageUrls = hasText ? extractImageUrls(comment.text) : [];
        const commentHashtags = hasText ? extractHashtags(comment.text) : [];

        return `
            <div class="interaction-item ${actionType}">
                <div class="interaction-header">
                    <span class="interaction-type">${actionLabel}</span>
                    ${date ? `<span class="interaction-date">${formatDate(date)}</span>` : ''}
                </div>
                ${comment.user ? `
                    <div class="interaction-user">
                        ${getUserAvatarSync(comment.user.uid, comment.user.user) || ''}
                        <a href="user.html?id=${comment.user.uid}" class="interaction-user-link">
                            ${escapeHtml(comment.user.user || 'Anonymous')}
                        </a>
                    </div>
                ` : ''}
                ${hasText ? `
                    <div class="interaction-content-wrapper">
                        <div id="${commentId}" class="interaction-content" data-original-text="${escapeHtml(comment.text)}">${escapeHtml(comment.text)}</div>
                        ${commentHashtags.length > 0 ? `
                            <div class="interaction-hashtags">
                                ${commentHashtags.map(tag => `
                                    <a href="hashtag.html?tag=${encodeURIComponent(tag)}" class="hashtag">${tag}</a>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${imageUrls.length > 0 ? `
                            <div class="interaction-images" id="images-${commentId}">
                                ${imageUrls.map((url, imgIndex) => `
                                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="interaction-image-link">
                                        <img src="${url}" 
                                             alt="Image ${imgIndex + 1}" 
                                             class="interaction-image"
                                             loading="lazy"
                                             onerror="this.style.display='none';">
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                        <button class="translate-btn" data-comment-id="${commentId}" data-comment-index="${index}" aria-label="${i18n.t('note.translate')}">
                            🔤 ${i18n.t('note.translate')}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    interactionsContainer.innerHTML = interactions;

    // Setup translation buttons
    setupTranslationButtons();
}

/**
 * Render action buttons based on note status
 */
function renderActionButtons() {
    if (!noteData) return;

    const commentBtn = document.getElementById('commentBtn');
    const closeBtn = document.getElementById('closeBtn');
    const reopenBtn = document.getElementById('reopenBtn');
    const reportBtn = document.getElementById('reportBtn');

    if (noteData.status === 'open') {
        closeBtn.style.display = 'inline-block';
        reportBtn.style.display = 'inline-block';
        reopenBtn.style.display = 'none';
    } else if (noteData.status === 'closed') {
        reopenBtn.style.display = 'inline-block';
        closeBtn.style.display = 'none';
        reportBtn.style.display = 'none';
    }
}

/**
 * Setup comment form
 */
function setupCommentForm() {
    const commentForm = document.getElementById('commentForm');
    const commentTextarea = document.getElementById('commentText');
    const commentBtn = document.getElementById('commentBtn');
    const closeBtn = document.getElementById('closeBtn');
    const reopenBtn = document.getElementById('reopenBtn');
    const reportBtn = document.getElementById('reportBtn');

    if (!commentForm || !commentTextarea) return;

    // Enable/disable comment button based on input
    commentTextarea.addEventListener('input', () => {
        commentBtn.disabled = !commentTextarea.value.trim();
        showHashtagSuggestions(commentTextarea.value);
    });

    // Form submission
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleComment();
    });

    // Button handlers
    commentBtn.addEventListener('click', () => handleComment());
    closeBtn.addEventListener('click', () => handleClose());
    reopenBtn.addEventListener('click', () => handleReopen());
    reportBtn.addEventListener('click', () => handleReport());

    // Update UI based on authentication status
    updateAuthUI();

    // Check for auth success callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        updateAuthUI();
        // Reload note to show updated data
        if (noteId) {
            loadNote(noteId);
        }
    }
}

/**
 * Update UI based on authentication status
 */
function updateAuthUI() {
    const user = getCurrentUser();
    const authenticated = isAuthenticated();

    // Show/hide login prompt
    const actionButtons = document.querySelectorAll('#commentBtn, #closeBtn, #reopenBtn, #reportBtn');
    const authStatus = document.getElementById('authStatus');

    if (!authenticated) {
        // Add login prompt or disable buttons with tooltip
        actionButtons.forEach(btn => {
            if (btn) {
                btn.setAttribute('title', i18n.t('note.auth.required') || 'Login required');
                btn.style.opacity = '0.6';
            }
        });

        if (authStatus) {
            authStatus.style.display = 'block';
            authStatus.innerHTML = `<p style="color: #666; font-size: 0.9em;">${i18n.t('note.auth.loginPrompt') || 'Log in with OpenStreetMap to comment, close, or reopen notes.'}</p>`;
        }
    } else {
        // Show user info if available
        actionButtons.forEach(btn => {
            if (btn) {
                btn.removeAttribute('title');
                btn.style.opacity = '1';
            }
        });

        if (authStatus && user) {
            authStatus.style.display = 'block';
            authStatus.innerHTML = `<p style="color: #4caf50; font-size: 0.9em;">${i18n.t('note.auth.loggedIn') || 'Logged in as'} ${user.username}</p>`;
        } else if (authStatus) {
            authStatus.style.display = 'none';
        }
    }
}

/**
 * Show hashtag suggestions
 * @param {string} text - Current text in comment field
 */
function showHashtagSuggestions(text) {
    const suggestionsContainer = document.getElementById('hashtagSuggestions');
    const commonHashtags = ['#surveyme', '#invalid'];

    // Check if text already contains these hashtags
    const textLower = text.toLowerCase();
    const availableHashtags = commonHashtags.filter(tag => !textLower.includes(tag));

    if (availableHashtags.length === 0) {
        suggestionsContainer.innerHTML = '';
        return;
    }

    suggestionsContainer.innerHTML = availableHashtags.map(tag =>
        `<span class="hashtag-suggestion" data-hashtag="${tag}">${tag}</span>`
    ).join('');

    // Add click handlers
    suggestionsContainer.querySelectorAll('.hashtag-suggestion').forEach(el => {
        el.addEventListener('click', () => {
            const hashtag = el.dataset.hashtag;
            const textarea = document.getElementById('commentText');
            const currentText = textarea.value.trim();
            textarea.value = currentText ? `${currentText} ${hashtag}` : hashtag;
            textarea.focus();
            showHashtagSuggestions(textarea.value);
        });
    });
}

/**
 * Handle comment submission
 */
async function handleComment() {
    const commentText = document.getElementById('commentText').value.trim();
    if (!commentText) return;

    // Check authentication
    if (!isAuthenticated()) {
        if (confirm(i18n.t('note.auth.loginRequired') || 'You need to log in with OpenStreetMap to comment on notes. Would you like to log in now?')) {
            // Save current URL to return after auth
            sessionStorage.setItem('oauth_return_url', window.location.href);
            initiateLogin();
        }
        return;
    }

    // Check permissions
    if (!hasPermission('write_notes')) {
        alert(i18n.t('note.auth.insufficientPermissions') || 'Your account does not have permission to comment on notes.');
        return;
    }

    try {
        const commentBtn = document.getElementById('commentBtn');
        const originalText = commentBtn.textContent;
        commentBtn.disabled = true;
        commentBtn.textContent = i18n.t('note.comment.submitting') || 'Submitting...';

        await commentOnNote(noteData.id, commentText);

        // Clear comment field
        document.getElementById('commentText').value = '';
        commentBtn.disabled = true;

        // Show success message
        const successMsg = i18n.t('note.comment.success') || 'Comment submitted successfully!';
        alert(successMsg);

        // Reload note to show new comment
        await loadNote(noteData.id);

    } catch (error) {
        console.error('Error commenting on note:', error);

        let errorMessage = i18n.t('note.comment.error') || 'Failed to submit comment.';

        if (error.message.includes('Authentication expired')) {
            errorMessage = i18n.t('note.auth.expired') || 'Your session has expired. Please log in again.';
            logout();
            updateAuthUI();
        } else if (error.message.includes('permission')) {
            errorMessage = i18n.t('note.auth.insufficientPermissions') || 'You do not have permission to perform this action.';
        } else {
            errorMessage += ` ${error.message}`;
        }

        alert(errorMessage);

        const commentBtn = document.getElementById('commentBtn');
        commentBtn.disabled = false;
        commentBtn.textContent = i18n.t('note.comment.button') || 'Comment';
    }
}

/**
 * Handle note closure
 */
async function handleClose() {
    if (!noteData) return;

    // Check authentication
    if (!isAuthenticated()) {
        if (confirm(i18n.t('note.auth.loginRequired') || 'You need to log in with OpenStreetMap to close notes. Would you like to log in now?')) {
            sessionStorage.setItem('oauth_return_url', window.location.href);
            initiateLogin();
        }
        return;
    }

    // Check permissions
    if (!hasPermission('write_notes')) {
        alert(i18n.t('note.auth.insufficientPermissions') || 'Your account does not have permission to close notes.');
        return;
    }

    const commentText = document.getElementById('commentText').value.trim();
    const closeWithComment = commentText.length > 0 &&
        confirm(i18n.t('note.close.confirmWithComment') || `Close note #${noteData.id}${commentText ? ' with your comment' : ''}?`);

    if (!closeWithComment && !confirm(i18n.t('note.close.confirm') || `Are you sure you want to close note #${noteData.id}?`)) {
        return;
    }

    try {
        const closeBtn = document.getElementById('closeBtn');
        const originalText = closeBtn.textContent;
        closeBtn.disabled = true;
        closeBtn.textContent = i18n.t('note.close.submitting') || 'Closing...';

        await closeNote(noteData.id, commentText || '');

        // Clear comment field
        document.getElementById('commentText').value = '';

        // Show success message
        const successMsg = i18n.t('note.close.success') || 'Note closed successfully!';
        alert(successMsg);

        // Reload note to show updated status
        await loadNote(noteData.id);

    } catch (error) {
        console.error('Error closing note:', error);

        let errorMessage = i18n.t('note.close.error') || 'Failed to close note.';

        if (error.message.includes('Authentication expired')) {
            errorMessage = i18n.t('note.auth.expired') || 'Your session has expired. Please log in again.';
            logout();
            updateAuthUI();
        } else if (error.message.includes('permission')) {
            errorMessage = i18n.t('note.auth.insufficientPermissions') || 'You do not have permission to perform this action.';
        } else {
            errorMessage += ` ${error.message}`;
        }

        alert(errorMessage);

        const closeBtn = document.getElementById('closeBtn');
        closeBtn.disabled = false;
        closeBtn.textContent = i18n.t('note.comment.close') || 'Close Note';
    }
}

/**
 * Handle note reopening
 */
async function handleReopen() {
    if (!noteData) return;

    // Check authentication
    if (!isAuthenticated()) {
        if (confirm(i18n.t('note.auth.loginRequired') || 'You need to log in with OpenStreetMap to reopen notes. Would you like to log in now?')) {
            sessionStorage.setItem('oauth_return_url', window.location.href);
            initiateLogin();
        }
        return;
    }

    // Check permissions
    if (!hasPermission('write_notes')) {
        alert(i18n.t('note.auth.insufficientPermissions') || 'Your account does not have permission to reopen notes.');
        return;
    }

    const commentText = document.getElementById('commentText').value.trim();
    const reopenWithComment = commentText.length > 0 &&
        confirm(i18n.t('note.reopen.confirmWithComment') || `Reopen note #${noteData.id}${commentText ? ' with your comment' : ''}?`);

    if (!reopenWithComment && !confirm(i18n.t('note.reopen.confirm') || `Are you sure you want to reopen note #${noteData.id}?`)) {
        return;
    }

    try {
        const reopenBtn = document.getElementById('reopenBtn');
        const originalText = reopenBtn.textContent;
        reopenBtn.disabled = true;
        reopenBtn.textContent = i18n.t('note.reopen.submitting') || 'Reopening...';

        await reopenNote(noteData.id, commentText || '');

        // Clear comment field
        document.getElementById('commentText').value = '';

        // Show success message
        const successMsg = i18n.t('note.reopen.success') || 'Note reopened successfully!';
        alert(successMsg);

        // Reload note to show updated status
        await loadNote(noteData.id);

    } catch (error) {
        console.error('Error reopening note:', error);

        let errorMessage = i18n.t('note.reopen.error') || 'Failed to reopen note.';

        if (error.message.includes('Authentication expired')) {
            errorMessage = i18n.t('note.auth.expired') || 'Your session has expired. Please log in again.';
            logout();
            updateAuthUI();
        } else if (error.message.includes('permission')) {
            errorMessage = i18n.t('note.auth.insufficientPermissions') || 'You do not have permission to perform this action.';
        } else {
            errorMessage += ` ${error.message}`;
        }

        alert(errorMessage);

        const reopenBtn = document.getElementById('reopenBtn');
        reopenBtn.disabled = false;
        reopenBtn.textContent = i18n.t('note.comment.reopen') || 'Reopen Note';
    }
}

/**
 * Handle note reporting
 */
async function handleReport() {
    // Note: Reporting is typically done through OSM's abuse reporting system
    // This could redirect to OSM's report page or use their API if available
    const noteUrl = `https://www.openstreetmap.org/note/${noteData.id}`;
    const reportUrl = `https://www.openstreetmap.org/reports/new?reportable_id=${noteData.id}&reportable_type=Note`;

    if (confirm(i18n.t('note.report.confirm') || `Report note #${noteData.id}? This will open OpenStreetMap's reporting page.`)) {
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Setup share button with social media options
 */
function setupShareButton() {
    const shareBtn = document.getElementById('shareBtn');
    const shareMenuContainer = document.getElementById('shareMenuContainer');
    
    if (!shareBtn) return;
    
    // Create menu container if it doesn't exist
    if (!shareMenuContainer) {
        const container = document.createElement('div');
        container.id = 'shareMenuContainer';
        container.className = 'share-menu-container';
        shareBtn.parentElement.appendChild(container);
    }
    
    // Toggle menu on button click
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('shareMenuContainer');
        const isVisible = menu.style.display === 'block';
        
        if (isVisible) {
            menu.style.display = 'none';
        } else {
            renderShareMenu();
            menu.style.display = 'block';
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('shareMenuContainer');
        const shareBtn = document.getElementById('shareBtn');
        if (menu && shareBtn && !menu.contains(e.target) && !shareBtn.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    
    /**
     * Render share menu with social media buttons
     */
    function renderShareMenu() {
        const menu = document.getElementById('shareMenuContainer');
        if (!menu) return;
        
        const url = window.location.href;
        const title = `OSM Note #${noteData.id}`;
        const text = i18n.t('note.share.text') || `Check out this OpenStreetMap note #${noteData.id}`;
        
        menu.innerHTML = `
            <div class="share-menu">
                <div class="share-menu-header">
                    <h4>${i18n.t('share.title') || 'Share'}</h4>
                </div>
                <div class="share-menu-options">
                    ${shareComponent.shareSupported ? `
                        <button class="share-option" data-action="native" aria-label="${i18n.t('share.native') || 'Share via...'}">
                            <span class="share-option-icon">📱</span>
                            <span class="share-option-text">${i18n.t('share.native') || 'Share via...'}</span>
                        </button>
                    ` : ''}
                    <button class="share-option" data-action="copy" aria-label="${i18n.t('share.copy') || 'Copy link'}">
                        <span class="share-option-icon">📋</span>
                        <span class="share-option-text">${i18n.t('share.copy') || 'Copy link'}</span>
                    </button>
                    <div class="share-divider"></div>
                    <button class="share-option share-option-twitter" data-action="twitter" aria-label="${i18n.t('share.twitter') || 'Twitter'}">
                        <span class="share-option-icon">🐦</span>
                        <span class="share-option-text">${i18n.t('share.twitter') || 'Twitter'}</span>
                    </button>
                    <button class="share-option share-option-facebook" data-action="facebook" aria-label="${i18n.t('share.facebook') || 'Facebook'}">
                        <span class="share-option-icon">📘</span>
                        <span class="share-option-text">${i18n.t('share.facebook') || 'Facebook'}</span>
                    </button>
                    <button class="share-option share-option-linkedin" data-action="linkedin" aria-label="${i18n.t('share.linkedin') || 'LinkedIn'}">
                        <span class="share-option-icon">💼</span>
                        <span class="share-option-text">${i18n.t('share.linkedin') || 'LinkedIn'}</span>
                    </button>
                    <button class="share-option share-option-whatsapp" data-action="whatsapp" aria-label="${i18n.t('share.whatsapp') || 'WhatsApp'}">
                        <span class="share-option-icon">💬</span>
                        <span class="share-option-text">${i18n.t('share.whatsapp') || 'WhatsApp'}</span>
                    </button>
                    <button class="share-option share-option-telegram" data-action="telegram" aria-label="${i18n.t('share.telegram') || 'Telegram'}">
                        <span class="share-option-icon">✈️</span>
                        <span class="share-option-text">${i18n.t('share.telegram') || 'Telegram'}</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        menu.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                
                switch (action) {
                    case 'native':
                        await shareComponent.share({ title, text, url });
                        break;
                    case 'copy':
                        await shareComponent.copyToClipboard(url);
                        break;
                    default:
                        shareComponent.shareToSocial(action, { title, text, url });
                        break;
                }
                
                // Close menu
                menu.style.display = 'none';
            });
        });
    }
}

/**
 * Setup XML link
 */
function setupXmlLink() {
    const xmlLink = document.getElementById('osmXmlLink');
    if (xmlLink && noteData) {
        xmlLink.href = `https://api.openstreetmap.org/api/0.6/notes/${noteData.id}.xml`;
    }
}

/**
 * Load ML recommendation from Analytics API
 * @param {number|string} noteId - Note ID
 */
async function loadMLRecommendation(noteId) {
    const mlSection = document.getElementById('mlRecommendationSection');
    const mlRecommendation = document.getElementById('mlRecommendation');

    if (!mlSection || !mlRecommendation) return;

    try {
        // Only show ML recommendation for open notes
        if (noteData && noteData.status !== 'open') {
            mlSection.style.display = 'none';
            return;
        }

        // Get ML recommendation from Analytics API
        // Endpoint: /api/v1/notes/{noteId}/recommendation
        const apiBaseUrl = import.meta.env.PROD
            ? 'https://notes-api.osm.lat'
            : 'http://localhost:3000';

        const recommendationUrl = `${apiBaseUrl}/api/v1/notes/${noteId}/recommendation`;
        const response = await fetch(recommendationUrl, {
            headers: {
                'User-Agent': 'OSM-Notes-Viewer/1.0 (https://notes.osm.lat)'
            }
        });

        if (!response.ok) {
            // If endpoint doesn't exist or ML is not available, hide section
            if (response.status === 404) {
                mlSection.style.display = 'none';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiResponse = await response.json();
        let recommendation = apiResponse.data || apiResponse;

        // If ML recommends "map" but doesn't provide tags, analyze text to suggest tags
        if (recommendation.action && recommendation.action.toLowerCase() === 'map' && 
            (!recommendation.tags || Object.keys(recommendation.tags || {}).length === 0)) {
            const suggestedTags = analyzeMappingTags(
                [noteData.text, ...(noteData.comments || []).map(c => c.text || '').filter(Boolean)]
                    .join(' ')
                    .toLowerCase(),
                noteData.text
            );
            if (Object.keys(suggestedTags).length > 0) {
                recommendation.tags = suggestedTags;
            }
        }

        // Render recommendation
        renderMLRecommendation(recommendation);
        mlSection.style.display = 'block';

    } catch (error) {
        console.error('Error loading ML recommendation:', error);
        // If API fails, try to generate a basic recommendation from note text
        if (noteData && noteData.status === 'open' && noteData.text) {
            const basicRecommendation = generateBasicRecommendation(noteData);
            if (basicRecommendation) {
                await renderMLRecommendation(basicRecommendation);
                mlSection.style.display = 'block';
                return;
            }
        }
        // Silently fail - ML recommendation is optional
        mlSection.style.display = 'none';
    }
}

/**
 * Generate a basic recommendation from note text when ML API is not available
 * @param {Object} noteData - Note data
 * @returns {Object|null} Basic recommendation or null
 */
function generateBasicRecommendation(noteData) {
    if (!noteData || !noteData.text) return null;
    
    const text = noteData.text.toLowerCase();
    const comments = noteData.comments || [];
    const allText = [noteData.text, ...comments.map(c => c.text || '').filter(Boolean)]
        .join(' ')
        .toLowerCase();
    
    // Keywords that suggest mapping is needed
    const mappingKeywords = {
        'building': ['edificio', 'building', 'construcción', 'casa', 'house', 'casa', 'residencia', 'residential'],
        'amenity': ['restaurante', 'restaurant', 'tienda', 'shop', 'tienda', 'store', 'farmacia', 'pharmacy', 'hospital', 'escuela', 'school', 'colegio'],
        'highway': ['calle', 'street', 'carretera', 'road', 'avenida', 'avenue', 'camino', 'path', 'sendero', 'ruta', 'route'],
        'leisure': ['parque', 'park', 'plaza', 'square', 'plaza', 'deporte', 'sport', 'deportivo'],
        'natural': ['árbol', 'tree', 'río', 'river', 'lago', 'lake', 'montaña', 'mountain'],
        'tourism': ['hotel', 'museo', 'museum', 'atracción', 'attraction', 'turismo', 'tourism']
    };
    
    // Keywords that suggest closing
    const closingKeywords = ['no existe', 'does not exist', 'eliminar', 'delete', 'remover', 'remove', 'incorrecto', 'incorrect', 'inválido', 'invalid', 'error'];
    
    // Keywords that suggest commenting
    const commentingKeywords = ['información', 'information', 'pregunta', 'question', 'duda', 'doubt', 'necesita', 'needs', 'falta', 'missing'];
    
    // Check for closing keywords
    const hasClosingKeywords = closingKeywords.some(keyword => allText.includes(keyword));
    if (hasClosingKeywords) {
        return {
            action: 'close',
            confidence: 0.6,
            reason: i18n.t('note.mlRecommendation.basicReason.close') || 'The note mentions something that does not exist or should be removed.'
        };
    }
    
    // Check for mapping keywords and suggest tags
    const suggestedTags = {};
    let hasMappingIntent = false;
    
    for (const [category, keywords] of Object.entries(mappingKeywords)) {
        const hasKeyword = keywords.some(keyword => allText.includes(keyword));
        if (hasKeyword) {
            hasMappingIntent = true;
            
            // Suggest basic tags based on category
            if (category === 'building') {
                suggestedTags.building = 'yes';
            } else if (category === 'amenity') {
                // Try to detect specific amenity
                if (allText.includes('restaurante') || allText.includes('restaurant')) {
                    suggestedTags.amenity = 'restaurant';
                } else if (allText.includes('tienda') || allText.includes('shop') || allText.includes('store')) {
                    suggestedTags.shop = 'yes';
                } else if (allText.includes('farmacia') || allText.includes('pharmacy')) {
                    suggestedTags.amenity = 'pharmacy';
                } else if (allText.includes('hospital')) {
                    suggestedTags.amenity = 'hospital';
                } else if (allText.includes('escuela') || allText.includes('school') || allText.includes('colegio')) {
                    suggestedTags.amenity = 'school';
                } else {
                    suggestedTags.amenity = 'yes';
                }
            } else if (category === 'highway') {
                if (allText.includes('avenida') || allText.includes('avenue')) {
                    suggestedTags.highway = 'primary';
                } else if (allText.includes('carretera') || allText.includes('road')) {
                    suggestedTags.highway = 'secondary';
                } else if (allText.includes('calle') || allText.includes('street')) {
                    suggestedTags.highway = 'residential';
                } else if (allText.includes('camino') || allText.includes('path') || allText.includes('sendero')) {
                    suggestedTags.highway = 'path';
                } else {
                    suggestedTags.highway = 'residential';
                }
            } else if (category === 'leisure') {
                if (allText.includes('parque') || allText.includes('park')) {
                    suggestedTags.leisure = 'park';
                } else if (allText.includes('plaza') || allText.includes('square')) {
                    suggestedTags.leisure = 'square';
                } else {
                    suggestedTags.leisure = 'yes';
                }
            } else if (category === 'natural') {
                if (allText.includes('árbol') || allText.includes('tree')) {
                    suggestedTags.natural = 'tree';
                } else if (allText.includes('río') || allText.includes('river')) {
                    suggestedTags.waterway = 'river';
                } else if (allText.includes('lago') || allText.includes('lake')) {
                    suggestedTags.natural = 'water';
                    suggestedTags.water = 'lake';
                }
            } else if (category === 'tourism') {
                if (allText.includes('hotel')) {
                    suggestedTags.tourism = 'hotel';
                } else if (allText.includes('museo') || allText.includes('museum')) {
                    suggestedTags.tourism = 'museum';
                } else {
                    suggestedTags.tourism = 'yes';
                }
            }
        }
    }
    
    if (hasMappingIntent && Object.keys(suggestedTags).length > 0) {
        return {
            action: 'map',
            confidence: 0.5,
            tags: suggestedTags,
            reason: i18n.t('note.mlRecommendation.basicReason.map') || 'The note text suggests mapping a new feature. These are suggested tags based on keywords found.'
        };
    }
    
    // Default to comment if no clear intent
    const hasCommentingKeywords = commentingKeywords.some(keyword => allText.includes(keyword));
    if (hasCommentingKeywords) {
        return {
            action: 'comment',
            confidence: 0.4,
            reason: i18n.t('note.mlRecommendation.basicReason.comment') || 'The note seems to need more information or clarification.'
        };
    }
    
    // If we have some text but no clear intent, suggest mapping but without generic tags
    // Let the user determine appropriate tags based on the note text
    if (noteData.text && noteData.text.trim().length > 10) {
        return {
            action: 'map',
            confidence: 0.3,
            tags: {}, // Empty tags - user should determine appropriate tags
            reason: i18n.t('note.mlRecommendation.basicReason.mapGeneric') || 'Consider mapping this feature. Review the note text to determine appropriate tags.'
        };
    }
    
    return null;
}

/**
 * Render ML recommendation
 * @param {Object} recommendation - ML recommendation data
 */
async function renderMLRecommendation(recommendation) {
    const mlRecommendation = document.getElementById('mlRecommendation');
    const josmTagsContainer = document.getElementById('josmTagsContainer');
    const josmTagsInput = document.getElementById('josmTags');

    if (!mlRecommendation) return;

    const action = recommendation.action || recommendation.recommended_action || 'comment';
    const confidence = recommendation.confidence || recommendation.confidence_score || null;
    const tags = recommendation.tags || recommendation.osm_tags || null;
    const reason = recommendation.reason || recommendation.explanation || null;

    // Action labels (using i18n if available, fallback to English)
    const actionKey = `note.mlRecommendation.action.${action.toLowerCase()}`;
    let actionLabel;
    try {
        actionLabel = i18n.t(actionKey);
        if (actionLabel === actionKey) {
            // Translation not found, use fallback
            const fallbackLabels = {
                'close': 'Close Note',
                'comment': 'Add Comment',
                'map': 'Map Feature'
            };
            actionLabel = fallbackLabels[action.toLowerCase()] || action;
        }
    } catch (e) {
        // i18n not available, use fallback
        const fallbackLabels = {
            'close': 'Close Note',
            'comment': 'Add Comment',
            'map': 'Map Feature'
        };
        actionLabel = fallbackLabels[action.toLowerCase()] || action;
    }

    // Build recommendation HTML
    let html = `
        <div class="ml-recommendation action-${action.toLowerCase()}">
            <div class="ml-recommendation-title">
                <span class="ml-icon">🤖</span>
                <strong>ML Recommendation: ${escapeHtml(actionLabel)}</strong>
            </div>
    `;

    if (reason) {
        html += `<div class="ml-recommendation-reason">${escapeHtml(reason)}</div>`;
    }

    if (confidence !== null) {
        const confidencePercent = Math.round(confidence * 100);
        let confidenceLabel = 'Confidence';
        try {
            const translated = i18n.t('note.mlRecommendation.confidence');
            if (translated !== 'note.mlRecommendation.confidence') {
                confidenceLabel = translated;
            }
        } catch (e) {
            // Use default
        }
        html += `
            <div class="ml-recommendation-confidence">
                ${escapeHtml(confidenceLabel)}: ${confidencePercent}%
            </div>
        `;
    }

    html += `</div>`;

    mlRecommendation.innerHTML = html;

    // Handle "map" action - show JOSM tags if available
    // Always show tags section for "map" action, even if tags are empty (user can add their own)
    if (action.toLowerCase() === 'map') {
        if (tags && Object.keys(tags).length > 0) {
            await renderJosmTags(tags);
        } else {
            // Show empty tags container so user can add tags manually
            josmTagsContainer.style.display = 'block';
            const josmTagsInput = document.getElementById('josmTags');
            if (josmTagsInput) {
                josmTagsInput.value = '';
                josmTagsInput.readOnly = false;
                josmTagsInput.placeholder = i18n.t('note.mlRecommendation.tagsPlaceholder') || 'Add OSM tags here (e.g., amenity=restaurant, name=...)';
            }
            // Hide copy button if no tags
            const copyBtn = document.getElementById('copyJosmTagsBtn');
            if (copyBtn) {
                copyBtn.style.display = 'none';
            }
        }
    } else {
        josmTagsContainer.style.display = 'none';
    }
}

/**
 * Render JOSM tags for mapping recommendation
 * @param {Object|Array|string} tags - OSM tags (can be object, array of objects, or string)
 */
async function renderJosmTags(tags) {
    const josmTagsContainer = document.getElementById('josmTagsContainer');
    const josmTagsInput = document.getElementById('josmTags');
    const tagLinksContainer = document.getElementById('tagLinksContainer');

    if (!josmTagsContainer || !josmTagsInput) return;

    let josmFormat = '';
    let displayFormat = '';
    let tagPairs = [];

    // Parse tags based on format
    if (typeof tags === 'string') {
        // If it's already a string, try to parse it
        josmFormat = tags;
        displayFormat = tags;
        // Parse string format to extract key-value pairs
        const pairs = tags.split(/[,\n]/).map(pair => {
            const [key, ...valueParts] = pair.split('=');
            return { key: key.trim(), value: valueParts.join('=').trim() };
        }).filter(p => p.key && p.value);
        tagPairs = pairs;
    } else if (Array.isArray(tags)) {
        // Array of objects: [{key: 'amenity', value: 'restaurant'}, ...]
        tagPairs = tags.map(tag => {
            const key = tag.key || tag.tag || Object.keys(tag)[0];
            const value = tag.value || tag[key] || '';
            return { key, value };
        }).filter(t => t.key && t.value);
        josmFormat = tagPairs.map(t => `${t.key}=${t.value}`).join(',');
        displayFormat = tagPairs.map(t => `${t.key}=${t.value}`).join('\n');
    } else if (typeof tags === 'object') {
        // Object: {amenity: 'restaurant', name: '...'}
        tagPairs = Object.entries(tags)
            .map(([key, value]) => ({ key, value: String(value) }))
            .filter(t => t.key && t.value && t.key !== 'note'); // Filter out invalid tags like 'note'
        josmFormat = tagPairs.map(t => `${t.key}=${t.value}`).join(',');
        displayFormat = tagPairs.map(t => `${t.key}=${t.value}`).join('\n');
    }

    if (josmFormat && tagPairs.length > 0) {
        josmTagsInput.value = displayFormat;
        josmTagsContainer.style.display = 'block';

        // Setup copy button
        setupCopyJosmTagsButton(josmFormat);

        // Render tag links (Wiki and Taginfo) - validate before showing
        await renderTagLinks(tagPairs, tagLinksContainer);
    } else {
        josmTagsContainer.style.display = 'block';
        josmTagsInput.value = '';
        josmTagsInput.readOnly = false;
        josmTagsInput.placeholder = i18n.t('note.mlRecommendation.tagsPlaceholder') || 'Add OSM tags here (e.g., amenity=restaurant, name=...)';
        const copyBtn = document.getElementById('copyJosmTagsBtn');
        if (copyBtn) {
            copyBtn.style.display = 'none';
        }
        if (tagLinksContainer) {
            tagLinksContainer.innerHTML = '';
            tagLinksContainer.style.display = 'none';
        }
    }
}

/**
 * Validate if a Taginfo entry exists for a tag
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 * @returns {Promise<boolean>} True if tag exists in Taginfo
 */
async function validateTaginfoLink(key, value) {
    try {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(value);
        // Taginfo API: https://taginfo.openstreetmap.org/api/4/tag/values?key=key&value=value
        const apiUrl = `https://taginfo.openstreetmap.org/api/4/tag/values?key=${encodedKey}&value=${encodedValue}`;
        
        const response = await fetch(apiUrl, {
            method: 'HEAD', // Use HEAD to check existence without downloading data
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        // If HEAD doesn't work, try GET with minimal data
        if (!response.ok) {
            const getResponse = await fetch(`https://taginfo.openstreetmap.org/api/4/tag/values?key=${encodedKey}&value=${encodedValue}`, {
                signal: AbortSignal.timeout(3000)
            });
            if (getResponse.ok) {
                const data = await getResponse.json();
                // Check if we got valid data (not empty)
                return data && data.data && data.data.length > 0;
            }
            return false;
        }
        
        return true;
    } catch (error) {
        console.warn(`Failed to validate Taginfo link for ${key}=${value}:`, error);
        return false;
    }
}

/**
 * Validate if an OSM Wiki page exists for a tag
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 * @returns {Promise<boolean>} True if wiki page exists
 */
async function validateWikiLink(key, value) {
    try {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(value);
        // Use MediaWiki API to check if page exists
        // https://wiki.openstreetmap.org/api.php?action=query&titles=Tag:key=value&format=json
        const pageTitle = `Tag:${encodedKey}=${encodedValue}`;
        const apiUrl = `https://wiki.openstreetmap.org/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
        
        const timeoutSignal = createTimeoutSignal(3000);
        
        const response = await fetch(apiUrl, {
            signal: timeoutSignal
        });
        
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        if (!data.query || !data.query.pages) {
            return false;
        }
        
        // Check if page exists (not -1 which means missing)
        const pageId = Object.keys(data.query.pages)[0];
        return pageId !== '-1' && !data.query.pages[pageId].missing;
    } catch (error) {
        // Timeout or network error - assume link doesn't exist
        if (error.name !== 'AbortError') {
            console.warn(`Failed to validate Wiki link for ${key}=${value}:`, error);
        }
        return false;
    }
}

/**
 * Render links to OSM Wiki and Taginfo for each suggested tag
 * Only shows links that are validated to exist
 * @param {Array} tagPairs - Array of {key, value} objects
 * @param {HTMLElement|null} container - Container element for links
 */
async function renderTagLinks(tagPairs, container) {
    if (!container) {
        // Create container if it doesn't exist
        const josmTagsContainer = document.getElementById('josmTagsContainer');
        if (!josmTagsContainer) return;
        
        container = document.createElement('div');
        container.id = 'tagLinksContainer';
        container.className = 'tag-links-container';
        josmTagsContainer.appendChild(container);
    }

    if (!tagPairs || tagPairs.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Filter out common tags that don't need documentation links (like 'name', 'note')
    const tagsToShow = tagPairs.filter(t => 
        t.key && 
        t.value && 
        !['name', 'note', 'source', 'created_by'].includes(t.key.toLowerCase())
    );

    if (tagsToShow.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Show loading state
    container.innerHTML = '<div class="tag-links-title">' + 
        (i18n.t('note.mlRecommendation.tagLinks.title') || 'Tag Documentation:') + 
        '</div><div class="tag-links-list"><div class="tag-links-loading">' +
        (i18n.t('note.mlRecommendation.tagLinks.loading') || 'Validating links...') +
        '</div></div>';
    container.style.display = 'block';

    // Validate all tags in parallel
    const validationPromises = tagsToShow.map(async (tag) => {
        const [hasWiki, hasTaginfo] = await Promise.all([
            validateWikiLink(tag.key, tag.value),
            validateTaginfoLink(tag.key, tag.value)
        ]);
        return {
            tag,
            hasWiki,
            hasTaginfo
        };
    });

    const validatedTags = await Promise.all(validationPromises);

    // Filter to only tags with at least one valid link
    const tagsWithLinks = validatedTags.filter(v => v.hasWiki || v.hasTaginfo);

    if (tagsWithLinks.length === 0) {
        container.style.display = 'none';
        return;
    }

    let html = '<div class="tag-links-title">' + 
        (i18n.t('note.mlRecommendation.tagLinks.title') || 'Tag Documentation:') + 
        '</div><div class="tag-links-list">';

    tagsWithLinks.forEach(({ tag, hasWiki, hasTaginfo }) => {
        const key = encodeURIComponent(tag.key);
        const value = encodeURIComponent(tag.value);
        
        html += `
            <div class="tag-link-item">
                <span class="tag-link-label"><strong>${escapeHtml(tag.key)}=${escapeHtml(tag.value)}</strong></span>
                <span class="tag-link-buttons">
        `;
        
        if (hasWiki) {
            const wikiUrl = `https://wiki.openstreetmap.org/wiki/Tag:${key}=${value}`;
            html += `
                    <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" 
                       class="tag-link-btn tag-link-wiki" 
                       aria-label="View ${tag.key}=${tag.value} on OSM Wiki">
                        📖 Wiki
                    </a>
            `;
        }
        
        if (hasTaginfo) {
            const taginfoUrl = `https://taginfo.openstreetmap.org/tags/${key}=${value}`;
            html += `
                    <a href="${taginfoUrl}" target="_blank" rel="noopener noreferrer" 
                       class="tag-link-btn tag-link-taginfo" 
                       aria-label="View ${tag.key}=${tag.value} on Taginfo">
                        📊 Taginfo
                    </a>
            `;
        }
        
        html += `
                </span>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Setup copy button for JOSM tags
 * @param {string} josmFormat - Tags in JOSM format (key1=value1,key2=value2)
 */
function setupCopyJosmTagsButton(josmFormat) {
    const copyBtn = document.getElementById('copyJosmTagsBtn');
    if (!copyBtn) return;

    // Remove existing listeners
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

    newCopyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(josmFormat);

            // Show feedback
            const originalText = newCopyBtn.textContent;
            let copiedText = 'Copied!';
            try {
                const translated = i18n.t('note.mlRecommendation.copied');
                if (translated !== 'note.mlRecommendation.copied') {
                    copiedText = translated;
                }
            } catch (e) {
                // Use default
            }
            newCopyBtn.textContent = '✓ ' + copiedText;
            newCopyBtn.style.backgroundColor = '#4caf50';
            newCopyBtn.style.color = 'white';

            setTimeout(() => {
                newCopyBtn.textContent = originalText;
                newCopyBtn.style.backgroundColor = '';
                newCopyBtn.style.color = '';
            }, 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            // Fallback: select text in textarea
            const josmTagsInput = document.getElementById('josmTags');
            if (josmTagsInput) {
                josmTagsInput.select();
                josmTagsInput.setSelectionRange(0, 99999); // For mobile devices
                try {
                    document.execCommand('copy');
                    alert('Tags copied to clipboard!');
                } catch (err) {
                    alert('Failed to copy. Please select and copy manually.');
                }
            }
        }
    });
}

/**
 * Setup note navigation (previous/next)
 */
function setupNoteNavigation() {
    if (!noteData || !noteId) return;
    
    const currentNoteId = parseInt(noteId, 10);
    if (isNaN(currentNoteId)) return;
    
    const prevNoteLink = document.getElementById('prevNoteLink');
    const nextNoteLink = document.getElementById('nextNoteLink');
    
    // Previous note (id - 1)
    if (currentNoteId > 1) {
        prevNoteLink.href = `note.html?id=${currentNoteId - 1}`;
        prevNoteLink.style.display = 'inline-flex';
    } else {
        prevNoteLink.style.display = 'none';
    }
    
    // Next note (id + 1)
    // We can't know if the next note exists, so we'll always show it
    // If it doesn't exist, the page will show an error which is acceptable
    nextNoteLink.href = `note.html?id=${currentNoteId + 1}`;
    nextNoteLink.style.display = 'inline-flex';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Setup translation buttons for comments
 */
function setupTranslationButtons() {
    const translateButtons = document.querySelectorAll('.translate-btn[data-comment-id]');

    translateButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const commentId = button.getAttribute('data-comment-id');
            const commentIndex = parseInt(button.getAttribute('data-comment-index'), 10);
            const commentElement = document.getElementById(commentId);

            if (!commentElement) return;

            const originalText = commentElement.getAttribute('data-original-text');
            const isTranslated = commentElement.hasAttribute('data-translated');

            // Get images container for this comment
            const imagesContainer = document.getElementById(`images-${commentId}`);
            
            if (isTranslated) {
                // Show original text
                commentElement.textContent = originalText;
                commentElement.removeAttribute('data-translated');
                button.textContent = `🔤 ${i18n.t('note.translate')}`;
                button.setAttribute('aria-label', i18n.t('note.translate'));
                // Images remain visible (they're separate from text)
            } else {
                // Translate text
                button.disabled = true;
                button.textContent = `${i18n.t('note.translating')}...`;

                try {
                    // Extract image URLs before translation
                    const imageUrls = extractImageUrls(originalText);
                    
                    // Translate text (images will remain in the images container)
                    const translatedText = await translateText(originalText);
                    commentElement.textContent = translatedText;
                    commentElement.setAttribute('data-translated', 'true');
                    button.textContent = `🌐 ${i18n.t('note.showOriginal')}`;
                    button.setAttribute('aria-label', i18n.t('note.showOriginal'));
                    // Images container remains unchanged - images stay visible
                } catch (error) {
                    console.error('Translation failed:', error);
                    button.textContent = `🔤 ${i18n.t('note.translate')}`;
                } finally {
                    button.disabled = false;
                }
            }
        });
    });
}
