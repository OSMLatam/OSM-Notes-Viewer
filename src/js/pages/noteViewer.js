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

// Get note ID from URL
const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get('id');

// State
let noteData = null;
let map = null;
let marker = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n
    await i18n.init();

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        // Re-render dynamic content with new translations
        if (noteData) {
            renderNoteInfo();
            renderInteractions();
        }
    });

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
        renderNoteText();
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
    document.getElementById('noteIdDisplay').textContent = `${i18n.t('common.note')} #${noteData.id}`;

    // Status badge
    const statusBadge = document.getElementById('noteStatusBadge');
    const statusKey = `note.status.${noteData.status}`;
    statusBadge.textContent = i18n.t(statusKey) || noteData.status;
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
    const commentsText = noteData.comments.length === 1
        ? i18n.t('common.comment')
        : i18n.t('common.comments');
    document.getElementById('noteCommentsCount').textContent = `${noteData.comments.length} ${commentsText}`;
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
    const statusText = i18n.t(`note.status.${noteData.status}`) || noteData.status;
    marker.bindPopup(`<b>${i18n.t('common.note')} #${noteData.id}</b><br>${i18n.t('hashtag.filters.status')} ${statusText}`).openPopup();
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
    const reportUrl = `https://www.openstreetmap.org/reports/new?item=note&item_id=${noteData.id}`;

    if (confirm(i18n.t('note.report.confirm') || `Report note #${noteData.id}? This will open OpenStreetMap's reporting page.`)) {
        window.open(reportUrl, '_blank');
    }
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
        const recommendation = apiResponse.data || apiResponse;

        // Render recommendation
        renderMLRecommendation(recommendation);
        mlSection.style.display = 'block';

    } catch (error) {
        console.error('Error loading ML recommendation:', error);
        // Silently fail - ML recommendation is optional
        mlSection.style.display = 'none';
    }
}

/**
 * Render ML recommendation
 * @param {Object} recommendation - ML recommendation data
 */
function renderMLRecommendation(recommendation) {
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

    // Handle "map" action - show JOSM tags
    if (action.toLowerCase() === 'map' && tags) {
        renderJosmTags(tags);
    } else {
        josmTagsContainer.style.display = 'none';
    }
}

/**
 * Render JOSM tags for mapping recommendation
 * @param {Object|Array|string} tags - OSM tags (can be object, array of objects, or string)
 */
function renderJosmTags(tags) {
    const josmTagsContainer = document.getElementById('josmTagsContainer');
    const josmTagsInput = document.getElementById('josmTags');

    if (!josmTagsContainer || !josmTagsInput) return;

    let josmFormat = '';
    let displayFormat = '';

    // Parse tags based on format
    if (typeof tags === 'string') {
        // If it's already a string, try to parse it
        josmFormat = tags;
        displayFormat = tags;
    } else if (Array.isArray(tags)) {
        // Array of objects: [{key: 'amenity', value: 'restaurant'}, ...]
        const tagPairs = tags.map(tag => {
            const key = tag.key || tag.tag || Object.keys(tag)[0];
            const value = tag.value || tag[key] || '';
            return { key, value };
        });
        josmFormat = tagPairs.map(t => `${t.key}=${t.value}`).join(',');
        displayFormat = tagPairs.map(t => `${t.key}=${t.value}`).join('\n');
    } else if (typeof tags === 'object') {
        // Object: {amenity: 'restaurant', name: '...'}
        const tagPairs = Object.entries(tags).map(([key, value]) => ({ key, value }));
        josmFormat = tagPairs.map(t => `${t.key}=${t.value}`).join(',');
        displayFormat = tagPairs.map(t => `${t.key}=${t.value}`).join('\n');
    }

    if (josmFormat) {
        josmTagsInput.value = displayFormat;
        josmTagsContainer.style.display = 'block';

        // Setup copy button
        setupCopyJosmTagsButton(josmFormat);
    } else {
        josmTagsContainer.style.display = 'none';
    }
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
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
