// Country Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';

// Get country ID from URL
const urlParams = new URLSearchParams(window.location.search);
const countryId = urlParams.get('id');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (!countryId) {
        showError('No country ID provided');
        return;
    }

    try {
        await loadCountryProfile(countryId);
    } catch (error) {
        showError(`Failed to load country profile: ${error.message}`);
    }
});

async function loadCountryProfile(countryId) {
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');

    try {
        const country = await apiClient.getCountry(countryId);

        // Hide loading, show content
        loading.style.display = 'none';
        content.style.display = 'block';

        // Populate profile
        document.getElementById('countryName').textContent =
            country.country_name_en || country.country_name || 'Unknown Country';
        document.getElementById('countryId').textContent = country.country_id;

        // Statistics
        document.getElementById('notesOpened').textContent = formatNumber(country.history_whole_open || 0);
        document.getElementById('notesClosed').textContent = formatNumber(country.history_whole_closed || 0);
        document.getElementById('notesCommented').textContent = formatNumber(country.history_whole_commented || 0);
        document.getElementById('notesReopened').textContent = formatNumber(country.history_whole_reopened || 0);

        // Activity heatmap
        renderActivityHeatmap(country.last_year_activity);

        // Hashtags
        renderHashtags(country.hashtags);

        // Users
        await renderUsers(country.users_open_notes);

        // Working hours
        renderWorkingHours(country.working_hours_of_week_opening, country.working_hours_of_week_commenting, country.working_hours_of_week_closing);

        // Activity history
        renderActivityHistory(country);

        // First actions
        renderFirstActions(country);

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

async function renderUsers(users) {
    const container = document.getElementById('usersContainer');

    if (!users || users.length === 0) {
        container.innerHTML = '<p>No user data available</p>';
        return;
    }

    try {
        // Get user index to map usernames to user IDs
        const userIndex = await apiClient.getUserIndex();
        const userMap = new Map(userIndex.map(u => [u.username, u.user_id]));

        const html = users.map(item => {
            const userId = userMap.get(item.username) || '';
            return `
                <div class="country-item" onclick="window.location.href='user.html?id=${userId}'">
                    <span class="country-rank">#${item.rank}</span>
                    <span class="country-name">${item.username}</span>
                    <span class="country-count">${formatNumber(item.quantity)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading user index:', error);
        container.innerHTML = '<p>Error loading user data</p>';
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

function renderActivityHistory(country) {
    const container = document.getElementById('activityHistoryContainer');

    let html = '<div class="activity-history-grid">';

    // Year
    html += '<div class="history-item">';
    html += '<strong>This Year:</strong> ';
    html += 'Opened: ' + formatNumber(country.history_year_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(country.history_year_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(country.history_year_commented || 0);
    html += '</div>';

    // Month
    html += '<div class="history-item">';
    html += '<strong>This Month:</strong> ';
    html += 'Opened: ' + formatNumber(country.history_month_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(country.history_month_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(country.history_month_commented || 0);
    html += '</div>';

    // Day
    html += '<div class="history-item">';
    html += '<strong>Today:</strong> ';
    html += 'Opened: ' + formatNumber(country.history_day_open || 0) + ', ';
    html += 'Closed: ' + formatNumber(country.history_day_closed || 0) + ', ';
    html += 'Commented: ' + formatNumber(country.history_day_commented || 0);
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
}

function renderFirstActions(country) {
    const container = document.getElementById('firstActionsContainer');

    let html = '<div class="first-actions-grid">';

    if (country.date_starting_creating_notes) {
        html += '<div class="action-item">';
        html += '<strong>Started creating notes:</strong> ';
        html += formatDate(country.date_starting_creating_notes);
        html += '</div>';
    }

    if (country.date_starting_solving_notes) {
        html += '<div class="action-item">';
        html += '<strong>Started solving notes:</strong> ';
        html += formatDate(country.date_starting_solving_notes);
        html += '</div>';
    }

    if (country.first_open_note_id) {
        html += '<div class="action-item">';
        html += '<strong>First note opened:</strong> ';
        html += '<a href="https://www.openstreetmap.org/note/' + country.first_open_note_id + '" target="_blank">Note #' + country.first_open_note_id + '</a>';
        html += '</div>';
    }

    if (country.first_closed_note_id) {
        html += '<div class="action-item">';
        html += '<strong>First note closed:</strong> ';
        html += '<a href="https://www.openstreetmap.org/note/' + country.first_closed_note_id + '" target="_blank">Note #' + country.first_closed_note_id + '</a>';
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


