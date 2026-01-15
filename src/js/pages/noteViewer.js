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

// Get note ID from URL
const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get('id');

// State
let noteData = null;
let map = null;
let marker = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (!noteId) {
        showError(document.getElementById('noteError'), 'No note ID provided');
        document.getElementById('noteLoading').style.display = 'none';
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

        // Fetch note from OSM API
        const response = await fetch(`https://api.openstreetmap.org/api/0.6/notes/${noteId}.json`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Note not found');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        noteData = parseNoteData(data, noteId);

        // Hide loading, show content
        loading.style.display = 'none';
        content.style.display = 'block';

        // Render all sections
        renderNoteInfo();
        renderMap();
        renderNoteText();
        renderHashtags();
        renderInteractions();
        renderActionButtons();
        setupCommentForm();
        setupShareButton();
        setupXmlLink();

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
            comments: comments.map(comment => ({
                date: comment.date,
                user: comment.user ? {
                    uid: comment.user.uid || comment.user.id,
                    user: comment.user.user || comment.user.username || 'Anonymous'
                } : null,
                text: comment.text || '',
                action: comment.action || 'commented'
            })),
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
            comments: comments.map(comment => ({
                date: comment.date,
                user: comment.user ? {
                    uid: comment.user.uid || comment.user.id,
                    user: comment.user.user || comment.user.username || 'Anonymous'
                } : null,
                text: comment.text || '',
                action: comment.action || 'commented'
            })),
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
    document.getElementById('noteIdDisplay').textContent = `Note #${noteData.id}`;

    // Status badge
    const statusBadge = document.getElementById('noteStatusBadge');
    statusBadge.textContent = noteData.status;
    statusBadge.className = `status-badge ${noteData.status}`;

    // Dates
    if (noteData.dateCreated) {
        const createdDate = new Date(noteData.dateCreated);
        document.getElementById('noteCreatedDate').textContent = `Created: ${formatDate(createdDate)}`;
    }

    if (noteData.dateClosed) {
        const closedDate = new Date(noteData.dateClosed);
        document.getElementById('noteUpdatedDate').textContent = `Closed: ${formatDate(closedDate)}`;
    } else if (noteData.comments.length > 0) {
        const lastComment = noteData.comments[noteData.comments.length - 1];
        if (lastComment.date) {
            const updatedDate = new Date(lastComment.date);
            document.getElementById('noteUpdatedDate').textContent = `Updated: ${formatDate(updatedDate)}`;
        }
    }

    // Comments count
    document.getElementById('noteCommentsCount').textContent = `${noteData.comments.length} comment${noteData.comments.length !== 1 ? 's' : ''}`;
}

/**
 * Render map with note location
 */
function renderMap() {
    if (!noteData || !noteData.lat || !noteData.lon) return;

    const mapContainer = document.getElementById('noteMap');
    if (!mapContainer) return;

    // Initialize map
    map = L.map('noteMap').setView([noteData.lat, noteData.lon], 15);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add marker
    marker = L.marker([noteData.lat, noteData.lon]).addTo(map);
    marker.bindPopup(`<b>Note #${noteData.id}</b><br>Status: ${noteData.status}`).openPopup();
}

/**
 * Load country information from Analytics API
 * @param {number|string} noteId - Note ID
 */
async function loadCountryInfo(noteId) {
    try {
        // Get country information from OSM Notes API (REST API)
        // API endpoint: /api/v1/notes/{note_id}
        // Returns: { data: { id_country: number | null, ... } }
        const apiBaseUrl = import.meta.env.PROD 
            ? 'https://notes-api.osm.lat' 
            : 'http://localhost:3000';
        
        const noteInfoUrl = `${apiBaseUrl}/api/v1/notes/${noteId}`;
        const response = await fetch(noteInfoUrl, {
            headers: {
                'User-Agent': 'OSM-Notes-Viewer/1.0 (https://notes.osm.lat)'
            }
        });
        
        if (!response.ok) {
            // If API endpoint doesn't exist or fails, silently return
            // This is optional information
            return;
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
                    
                    countryLink.href = `country.html?id=${country.country_id}`;
                    countryLink.textContent = countryNameDisplay;
                    countryLinkContainer.style.display = 'flex';
                }
            } catch (error) {
                console.error('Error finding country in index:', error);
            }
        }
    } catch (error) {
        console.error('Error loading country info from Analytics API:', error);
        // Silently fail - country link is optional
    }
}

/**
 * Render note text content
 */
function renderNoteText() {
    if (!noteData) return;

    const noteTextEl = document.getElementById('noteText');
    if (noteData.text) {
        noteTextEl.textContent = noteData.text;
    } else {
        noteTextEl.textContent = 'No content available';
    }
}

/**
 * Extract and render hashtags from note text and comments
 */
function renderHashtags() {
    if (!noteData) return;

    const hashtagsContainer = document.getElementById('noteHashtags');
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

    hashtagsContainer.innerHTML = Array.from(hashtags).map(tag => 
        `<a href="hashtag.html?tag=${encodeURIComponent(tag)}" class="hashtag">${tag}</a>`
    ).join('');
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
 * Render interactions timeline
 */
function renderInteractions() {
    if (!noteData) return;

    const interactionsContainer = document.getElementById('noteInteractions');
    
    if (!noteData.comments || noteData.comments.length === 0) {
        interactionsContainer.innerHTML = '<p>No interactions yet.</p>';
        return;
    }

    // Create interaction items
    const interactions = noteData.comments.map((comment, index) => {
        const date = comment.date ? new Date(comment.date) : null;
        let actionType = 'commented';
        let actionLabel = 'Comment';
        
        // Determine action type
        if (index === 0) {
            actionType = 'created';
            actionLabel = 'Note Created';
        } else if (comment.action === 'closed' || (noteData.status === 'closed' && index === noteData.comments.length - 1 && !comment.text)) {
            actionType = 'closed';
            actionLabel = 'Note Closed';
        } else if (comment.action === 'reopened') {
            actionType = 'reopened';
            actionLabel = 'Note Reopened';
        }
        
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
                ${comment.text ? `<div class="interaction-content">${escapeHtml(comment.text)}</div>` : ''}
            </div>
        `;
    }).join('');

    interactionsContainer.innerHTML = interactions;
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
    const commentTextarea = document.getElementById('commentText');
    const commentBtn = document.getElementById('commentBtn');
    const closeBtn = document.getElementById('closeBtn');
    const reopenBtn = document.getElementById('reopenBtn');
    const reportBtn = document.getElementById('reportBtn');

    // Enable/disable comment button based on input
    commentTextarea.addEventListener('input', () => {
        commentBtn.disabled = !commentTextarea.value.trim();
    });

    // Hashtag suggestions
    commentTextarea.addEventListener('input', () => {
        showHashtagSuggestions(commentTextarea.value);
    });

    // Button handlers (will require OAuth for actual submission)
    commentBtn.addEventListener('click', () => handleComment());
    closeBtn.addEventListener('click', () => handleClose());
    reopenBtn.addEventListener('click', () => handleReopen());
    reportBtn.addEventListener('click', () => handleReport());
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

    // TODO: Implement OAuth and actual API call
    alert('Comment functionality requires OAuth authentication. This will be implemented in a future update.');
}

/**
 * Handle note closure
 */
async function handleClose() {
    // TODO: Implement OAuth and actual API call
    alert('Close note functionality requires OAuth authentication. This will be implemented in a future update.');
}

/**
 * Handle note reopening
 */
async function handleReopen() {
    // TODO: Implement OAuth and actual API call
    alert('Reopen note functionality requires OAuth authentication. This will be implemented in a future update.');
}

/**
 * Handle note reporting
 */
async function handleReport() {
    // TODO: Implement reporting functionality
    alert('Report functionality will be implemented in a future update.');
}

/**
 * Setup share button
 */
function setupShareButton() {
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const url = window.location.href;
            shareComponent.share({
                title: `OSM Note #${noteData.id}`,
                text: `Check out this OpenStreetMap note`,
                url: url
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
    try {
        // TODO: Implement ML recommendation API call
        // This will call the Analytics API endpoint for ML recommendations
        // For now, we'll leave it empty
        const mlSection = document.getElementById('mlRecommendationSection');
        mlSection.style.display = 'none';
    } catch (error) {
        console.error('Error loading ML recommendation:', error);
    }
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
