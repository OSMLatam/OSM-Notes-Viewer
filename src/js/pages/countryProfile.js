// Country Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';
import { shareComponent } from '../components/share.js';
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
import { getCountryFlagFromObject } from '../utils/countryFlags.js';
import { getUserAvatarSync, loadOSMAvatarInBackground } from '../utils/userAvatar.js';

// Get country name from URL
const urlParams = new URLSearchParams(window.location.search);
const countryNameParam = urlParams.get('name');
const countryIdParam = urlParams.get('id'); // Support both name and id for backward compatibility

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        let countryId = countryIdParam;

        // If using name parameter, lookup the country_id from the index
        if (countryNameParam && !countryId) {
            countryId = await findCountryIdByName(countryNameParam);
        }

        if (!countryId) {
            showError('No country name or ID provided');
            return;
        }

        await loadCountryProfile(countryId);
    } catch (error) {
        showError(`Failed to load country profile: ${error.message}`);
    }
});

async function findCountryIdByName(countryName) {
    const countries = await apiClient.getCountryIndex();
    const country = countries.find(c =>
        c.country_name_en === countryName ||
        c.country_name === countryName ||
        c.country_name_es === countryName
    );

    if (!country) {
        throw new Error(`Country not found: ${countryName}`);
    }

    return country.country_id;
}

function updateOGMetaTags(country) {
    const countryName = country.country_name_en || country.country_name || 'Unknown Country';
    const totalNotes = (country.history_whole_open || 0) + (country.history_whole_closed || 0);
    const description = `OpenStreetMap Notes activity in ${countryName}: ${totalNotes.toLocaleString()} notes`;

    // Update Open Graph meta tags
    const ogTitle = document.getElementById('ogTitle');
    const ogDescription = document.getElementById('ogDescription');
    const ogUrl = document.getElementById('ogUrl');

    if (ogTitle) ogTitle.setAttribute('content', `${countryName} - OSM Notes Profile`);
    if (ogDescription) ogDescription.setAttribute('content', description);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);

    // Also update page title
    document.title = `${countryName} - OSM Notes Profile`;
}

async function loadCountryProfile(countryId) {
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');

    try {
        const country = await apiClient.getCountry(countryId);

        // Hide loading, show content
        loading.style.display = 'none';
        content.style.display = 'block';

        // Populate profile
        const countryName = country.country_name_en || country.country_name || 'Unknown Country';
        const countryFlag = getCountryFlagFromObject(country);
        document.getElementById('countryName').innerHTML = countryFlag
            ? `${countryFlag} ${countryName}`
            : countryName;
        document.getElementById('countryId').textContent = country.country_id;

        // Update Open Graph meta tags
        updateOGMetaTags(country);

        // Statistics
        document.getElementById('notesOpened').textContent = formatNumber(country.history_whole_open || 0);
        document.getElementById('notesClosed').textContent = formatNumber(country.history_whole_closed || 0);
        document.getElementById('notesCommented').textContent = formatNumber(country.history_whole_commented || 0);
        document.getElementById('notesReopened').textContent = formatNumber(country.history_whole_reopened || 0);

        // Activity heatmap
        renderCountryActivityHeatmap(country.last_year_activity, country.dates_most_open);

        // Hashtags
        renderHashtags(country.hashtags);

        // Users
        await setupUsersSection(country);

        // Working hours
        renderWorkingHoursSection(country.working_hours_of_week_opening, country.working_hours_of_week_commenting, country.working_hours_of_week_closing, document.getElementById('workingHoursContainer'), 'country');

        // Activity history
        renderActivityHistory(country);

        // First actions
        renderFirstActions(country);

        // Setup share button
        setupShareButton(country);

    } catch (error) {
        loading.style.display = 'none';
        throw error;
    }
}

function setupShareButton(country) {
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
                title: `${country.country_name_en || country.country_name} - OSM Notes Profile`,
                text: `Check out OpenStreetMap notes activity in ${country.country_name_en || country.country_name}`,
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

function renderCountryActivityHeatmap(activityString, datesMostOpen = null) {
    const container = document.getElementById('activityHeatmap');

    // Container for all activity visualizations
    container.innerHTML = '';

    // First, add historical years if available
    if (datesMostOpen && datesMostOpen.length > 0) {
        const activityByYear = groupDatesByYear(datesMostOpen);

        const historicalSection = document.createElement('div');
        historicalSection.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--text-color); font-size: 1.1rem;">Historical Activity</h3>
            <div style="display: flex; gap: 1.5rem; min-width: fit-content; padding-bottom: 1rem;">
                ${activityByYear.map(yearData => `
                    <div style="min-width: 180px; flex-shrink: 0;">
                        <h4 style="margin-bottom: 0.75rem; text-align: center; font-size: 1rem; color: var(--text-color);">${yearData.year}</h4>
                        <div style="background: var(--card-bg); padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--border-color); height: 100%;">
                            ${renderYearActivityHeatmap(yearData.dates)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <p class="text-light" style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem;">
                Scroll horizontally to see more years →
            </p>
        `;
        container.appendChild(historicalSection);

        // Add spacing
        const spacing = document.createElement('div');
        spacing.style.height = '2rem';
        container.appendChild(spacing);
    }

    // Add last year's daily heatmap
    if (activityString && activityString.length > 0) {
        const lastYearSection = document.createElement('div');
        lastYearSection.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--text-color); font-size: 1.1rem;">Last Year Activity (by day)</h3>
        `;
        container.appendChild(lastYearSection);

        // Use the actual heatmap component
        const heatmapContainer = document.createElement('div');
        container.appendChild(heatmapContainer);
        renderActivityHeatmap(activityString, heatmapContainer);

        // Add subtitle to clarify it shows all activity
        const subtitle = document.createElement('p');
        subtitle.className = 'text-light';
        subtitle.style.fontSize = '0.875rem';
        subtitle.style.marginTop = '0.5rem';
        subtitle.style.textAlign = 'center';
        subtitle.textContent = 'Shows all note activity by day (open, close, comment, reopen)';
        container.appendChild(subtitle);
    } else if (!datesMostOpen || datesMostOpen.length === 0) {
        container.innerHTML = '<p class="text-light">No activity data available</p>';
    }
}

function groupDatesByYear(dates) {
    const byYear = {};

    dates.forEach(item => {
        const year = new Date(item.date).getFullYear();
        if (!byYear[year]) {
            byYear[year] = [];
        }
        byYear[year].push(item);
    });

    return Object.keys(byYear).sort((a, b) => b - a).map(year => ({
        year,
        dates: byYear[year]
    }));
}

function renderYearActivityHeatmap(dates) {
    // Create a simple visualization for the year
    const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const months = Array(12).fill(0);
    let totalNotes = 0;

    dates.forEach(item => {
        const date = new Date(item.date);
        const month = date.getMonth();
        months[month] += item.quantity;
        totalNotes += item.quantity;
    });

    const maxActivity = Math.max(...months, 1);

    return `
        <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; margin-bottom: 0.5rem;">
            ${months.map((count, index) => {
                const intensity = count > 0 ? (count / maxActivity) : 0;
                const height = count > 0 ? Math.max(intensity * 60, 8) : 8;
                const opacity = count > 0 ? Math.max(0.4, intensity) : 0.15;
                return `
                    <div style="text-align: center;">
                        <div style="background: var(--primary-color);
                                    opacity: ${opacity};
                                    width: 100%;
                                    height: ${height}px;
                                    border-radius: 3px;
                                    transition: opacity 0.2s;"
                             title="${monthNames[index]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][index]}: ${count} notes">
                        </div>
                        <div style="font-size: 0.7rem; margin-top: 2px; color: var(--text-light); font-weight: 500;">
                            ${monthNames[index]}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="text-align: center; font-size: 0.8rem; color: var(--text-color); font-weight: 500;">
            ${totalNotes} total notes
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

async function setupUsersSection(country) {
    // Store country data for re-rendering
    window.countryUserData = {
        open: country.users_open_notes || [],
        solving: country.users_solving_notes || []
    };

    // Render both lists
    await renderUsersList(window.countryUserData.open, 'usersContainerOpen', true);
    await renderUsersList(window.countryUserData.solving, 'usersContainerClosed', false);
}

async function renderUsersList(users, containerId, showOpened) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">No data available</p>';
        return;
    }

    try {
        // Get user index to map usernames to user IDs
        const userIndex = await apiClient.getUserIndex();
        const userMap = new Map(userIndex.map(u => [u.username, u.user_id]));

        const html = users.map((item, index) => {
            const userId = userMap.get(item.username) || '';
            const userObj = { username: item.username, user_id: userId };
            const avatarUrl = getUserAvatarSync(userObj, 40);
            const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(item.username)}`;
            const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(item.username)}`;
            const userProfileUrl = `user.html?username=${encodeURIComponent(item.username)}`;

            return `
                <div class="country-item" style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                        <span class="country-rank" style="flex-shrink: 0;">#${index + 1}</span>
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${item.username}" data-user-id="${userId}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
                        <a href="${userProfileUrl}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
                            <span class="country-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.username}</span>
                        </a>
                        <a href="${osmProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; flex-shrink: 0;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on OpenStreetMap">
                            <span style="font-size: 0.9rem;">↗</span>
                        </a>
                        <a href="${hdycProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; flex-shrink: 0;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on HDYC">
                            <span style="font-size: 0.9rem;">⚡</span>
                        </a>
                    </div>
                    <span style="font-size: 0.85rem; color: var(--text-light); white-space: nowrap; flex-shrink: 0;">
                        ${formatNumber(item.quantity)} ${showOpened ? '📝' : '✅'}
                    </span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Load OSM avatars in background
        const imgElements = container.querySelectorAll('img');
        users.forEach((item, index) => {
            const userId = userMap.get(item.username) || '';
            const userObj = { username: item.username, user_id: userId };
            if (imgElements[index] && userId) {
                loadOSMAvatarInBackground(userObj, imgElements[index]);
            }
        });
    } catch (error) {
        console.error('Error loading user index:', error);
        container.innerHTML = '<p style="color: var(--text-light);">Error loading user data</p>';
    }
}

// This function is now replaced by renderWorkingHoursSection from workingHoursHeatmap.js

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


