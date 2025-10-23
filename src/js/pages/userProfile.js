// User Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';

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
        renderActivityHeatmap(user.last_year_activity);

        // Hashtags
        renderHashtags(user.hashtags);

        // Countries
        await renderCountries(user.countries_open_notes);

        // Working hours
        renderWorkingHours(user.working_hours_of_week_opening, user.working_hours_of_week_commenting, user.working_hours_of_week_closing);

        // Activity history
        renderActivityHistory(user);

        // First actions
        renderFirstActions(user);

    } catch (error) {
        loading.style.display = 'none';
        throw error;
    }
}

function renderActivityHeatmap(activityString) {
    const container = document.getElementById('activityHeatmap');

    if (!activityString || activityString.length === 0) {
        container.innerHTML = '<p>No activity data available</p>';
        return;
    }

    // Simple text representation for now
    // TODO: Implement proper GitHub-style heatmap with SVG
    container.innerHTML = `
        <div class="activity-preview">
            <p>Activity heatmap visualization coming soon...</p>
            <p class="text-light">Last year activity: ${activityString.length} days tracked</p>
        </div>
    `;
}

function renderHashtags(hashtags) {
    const container = document.getElementById('hashtagsContainer');

    if (!hashtags || hashtags.length === 0) {
        container.innerHTML = '<p>No hashtags found</p>';
        return;
    }

    const html = hashtags.map(item => `
        <div class="hashtag-item">
            <span class="hashtag-name">${item.hashtag}</span>
            <span class="hashtag-count">${formatNumber(item.quantity)}</span>
        </div>
    `).join('');

    container.innerHTML = html;
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

        const html = countries.map(item => {
            const countryId = countryMap.get(item.country) || '';
            return `
                <div class="country-item" onclick="window.location.href='country.html?id=${countryId}'">
                    <span class="country-rank">#${item.rank}</span>
                    <span class="country-name">${item.country}</span>
                    <span class="country-count">${formatNumber(item.quantity)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading country index:', error);
        container.innerHTML = '<p>Error loading country data</p>';
    }
}

function renderWorkingHours(openingHours, commentingHours, closingHours) {
    const container = document.getElementById('workingHoursContainer');

    if (!openingHours || openingHours.length === 0) {
        container.innerHTML = '<p>No working hours data available</p>';
        return;
    }

    let html = '<div class="working-hours-section">';

    if (openingHours && openingHours.length > 0) {
        html += '<h4>Opening Notes</h4>';
        html += '<p class="text-light">' + openingHours.length + ' time slots with activity</p>';
    }

    if (commentingHours && commentingHours.length > 0) {
        html += '<h4>Commenting</h4>';
        html += '<p class="text-light">' + commentingHours.length + ' time slots with activity</p>';
    }

    if (closingHours && closingHours.length > 0) {
        html += '<h4>Closing Notes</h4>';
        html += '<p class="text-light">' + closingHours.length + ' time slots with activity</p>';
    }

    html += '</div>';
    html += '<p class="text-light">Working hours heatmap visualization coming soon...</p>';

    container.innerHTML = html;
}

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

function showError(message) {
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');
    const errorDiv = document.getElementById('profileError');

    loading.style.display = 'none';
    content.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.textContent = message;
}


