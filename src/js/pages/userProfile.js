// User Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
import { createBarChart } from '../components/chart.js';
import { shareComponent } from '../components/share.js';
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
import { getUserAvatarSync } from '../utils/userAvatar.js';

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (!userId) {
        showError('No user ID provided');
        return;
    }

    try {
        await loadUserProfile(userId);
    } catch (error) {
        showError(`Failed to load user profile: ${error.message}`);
    }
});

async function loadUserProfile(userId) {
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');
    const errorDiv = document.getElementById('profileError');

    try {
        const user = await apiClient.getUser(userId);

        // Hide loading, show content
        loading.style.display = 'none';
        content.style.display = 'block';

        // Populate profile
        document.getElementById('username').textContent = user.username || 'Unknown User';
        document.getElementById('userId').textContent = user.user_id;

        // Load user avatar
        loadUserAvatar(user);

        // Add link to OSM profile
        const osmProfileLinkEl = document.getElementById('osmProfileLink');
        const osmProfileLinkAnchor = document.getElementById('osmProfileLinkAnchor');
        if (osmProfileLinkEl && osmProfileLinkAnchor && user.username) {
            osmProfileLinkAnchor.href = `https://www.openstreetmap.org/user/${encodeURIComponent(user.username)}`;
            osmProfileLinkEl.style.display = 'block';
        }

        // Add link to HDYC profile
        const hdycProfileLinkEl = document.getElementById('hdycProfileLink');
        const hdycProfileLinkAnchor = document.getElementById('hdycProfileLinkAnchor');
        if (hdycProfileLinkEl && hdycProfileLinkAnchor && user.username) {
            hdycProfileLinkAnchor.href = `https://hdyc.neis-one.org/?${encodeURIComponent(user.username)}`;
            hdycProfileLinkEl.style.display = 'block';
        }

        // Contributor type
        const contributorTypeEl = document.getElementById('contributorType');
        if (user.contributor_type_name) {
            contributorTypeEl.style.display = 'block';
            contributorTypeEl.textContent = 'Contributor Type: ' + user.contributor_type_name;
        } else {
            contributorTypeEl.style.display = 'none';
        }

        // Statistics
        document.getElementById('notesOpened').textContent = formatNumber(user.history_whole_open || 0);
        document.getElementById('notesClosed').textContent = formatNumber(user.history_whole_closed || 0);
        document.getElementById('notesCommented').textContent = formatNumber(user.history_whole_commented || 0);
        document.getElementById('notesReopened').textContent = formatNumber(user.history_whole_reopened || 0);

        // Activity heatmap
        renderUserActivityHeatmap(user.last_year_activity);

        // Hashtags
        renderHashtags(user.hashtags);

        // Countries
        await renderCountries(user.countries_open_notes);

        // Working hours
        renderWorkingHoursSection(user.working_hours_of_week_opening, user.working_hours_of_week_commenting, user.working_hours_of_week_closing, document.getElementById('workingHoursContainer'), 'user');

        // Activity history
        renderActivityHistory(user);

        // First actions
        renderFirstActions(user);

        // Setup share button
        setupShareButton(user);

    } catch (error) {
        loading.style.display = 'none';
        throw error;
    }
}

function setupShareButton(user) {
    const shareBtn = document.getElementById('shareBtn');
    const shareMenu = document.getElementById('shareMenu');

    if (!shareBtn || !shareMenu) return;

    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = shareMenu.style.display !== 'none';

        if (isVisible) {
            shareMenu.style.display = 'none';
        } else {
            shareMenu.style.display = 'block';
            shareComponent.renderShareMenu(shareMenu, {
                title: `${user.username} - OSM Notes Profile`,
                text: `Check out ${user.username}'s contributions to OpenStreetMap notes`,
                url: window.location.href
            });
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
            shareMenu.style.display = 'none';
        }
    });
}

function renderUserActivityHeatmap(activityString) {
    const container = document.getElementById('activityHeatmap');

    if (!activityString || activityString.length === 0) {
        container.innerHTML = '<p>No activity data available</p>';
        return;
    }

    // Use the actual heatmap component
    renderActivityHeatmap(activityString, container);
}

function renderHashtags(hashtags) {
    const container = document.getElementById('hashtagsContainer');

    if (!hashtags || hashtags.length === 0) {
        container.innerHTML = '<p>No hashtags found</p>';
        return;
    }

    // Use bar chart component for better visualization
    const chartData = hashtags.map(item => ({
        label: item.hashtag,
        value: item.quantity
    }));

    createBarChart(chartData, container);
}

async function renderCountries(countries) {
    const container = document.getElementById('countriesContainer');

    if (!countries || countries.length === 0) {
        container.innerHTML = '<p>No country data available</p>';
        return;
    }

    try {
        // Get country index to map country names to country IDs
        const countryIndex = await apiClient.getCountryIndex();
        const countryMap = new Map();

        // Map by different name fields
        countryIndex.forEach(c => {
            if (c.country_name) countryMap.set(c.country_name, c.country_id);
            if (c.country_name_en) countryMap.set(c.country_name_en, c.country_id);
            if (c.country_name_es) countryMap.set(c.country_name_es, c.country_id);
        });

        // Use bar chart for better visualization
        const chartData = countries.map(item => ({
            label: item.country,
            value: item.quantity
        }));

        createBarChart(chartData, container);
    } catch (error) {
        console.error('Error loading country index:', error);
        container.innerHTML = '<p>Error loading country data</p>';
    }
}

// This function is now replaced by renderWorkingHoursSection from workingHoursHeatmap.js

function renderActivityHistory(user) {
    const container = document.getElementById('activityHistoryContainer');

    let html = '<div class="activity-history-grid">';

    // Year
    html += '<div class="history-item">';
    html += '<strong>This Year:</strong> ';
    html += 'Opened: ' + formatNumber(user.history_year_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(user.history_year_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(user.history_year_commented || 0);
    html += '</div>';

    // Month
    html += '<div class="history-item">';
    html += '<strong>This Month:</strong> ';
    html += 'Opened: ' + formatNumber(user.history_month_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(user.history_month_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(user.history_month_commented || 0);
    html += '</div>';

    // Day
    html += '<div class="history-item">';
    html += '<strong>Today:</strong> ';
    html += 'Opened: ' + formatNumber(user.history_day_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(user.history_day_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(user.history_day_commented || 0);
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
}

function renderFirstActions(user) {
    const container = document.getElementById('firstActionsContainer');

    let html = '<div class="first-actions-grid">';

    if (user.date_starting_creating_notes) {
        html += '<div class="action-item">';
        html += '<strong>Started creating notes:</strong> ';
        html += formatDate(user.date_starting_creating_notes);
        html += '</div>';
    }

    if (user.date_starting_solving_notes) {
        html += '<div class="action-item">';
        html += '<strong>Started solving notes:</strong> ';
        html += formatDate(user.date_starting_solving_notes);
        html += '</div>';
    }

    if (user.first_open_note_id) {
        html += '<div class="action-item">';
        html += '<strong>First note opened:</strong> ';
        html += '<a href="https://www.openstreetmap.org/note/' + user.first_open_note_id + '" target="_blank">Note #' + user.first_open_note_id + '</a>';
        html += '</div>';
    }

    if (user.first_closed_note_id) {
        html += '<div class="action-item">';
        html += '<strong>First note closed:</strong> ';
        html += '<a href="https://www.openstreetmap.org/note/' + user.first_closed_note_id + '" target="_blank">Note #' + user.first_closed_note_id + '</a>';
        html += '</div>';
    }

    html += '</div>';

    container.innerHTML = html;
}

function loadUserAvatar(user) {
    const avatarContainer = document.getElementById('userAvatar');
    const avatarImg = document.getElementById('userAvatarImg');

    if (!avatarContainer || !avatarImg) return;

    // Get avatar URL (synchronous for now - uses generated avatar)
    const avatarUrl = getUserAvatarSync(user, 160);

    if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
        avatarContainer.style.display = 'block';

        // Handle image load error
        avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
            avatarContainer.style.display = 'none';
        };
    }
}

function showError(message) {
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');
    const errorDiv = document.getElementById('profileError');

    loading.style.display = 'none';
    content.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = message;
}


