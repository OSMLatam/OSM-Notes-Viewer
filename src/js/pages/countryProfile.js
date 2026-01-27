// Country Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';
import { shareComponent } from '../components/share.js';
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
import { getCountryFlagFromObject } from '../utils/countryFlags.js';
import { getUserAvatarSync, loadOSMAvatarInBackground } from '../utils/userAvatar.js';
import { createBarChart } from '../components/chart.js';

// Helper function to format username with special styling
function formatUsernameWithStyle(username) {
  if (username === 'NeisBot') {
    return `<span class="bot-username" title="Automated bot account">🤖 ${username}</span>`;
  }
  return username;
}

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
  const country = countries.find(
    (c) =>
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
    document.getElementById('notesOpened').textContent = formatNumber(
      country.history_whole_open || 0
    );
    document.getElementById('notesClosed').textContent = formatNumber(
      country.history_whole_closed || 0
    );
    document.getElementById('notesClosedWithComment').textContent = formatNumber(
      country.history_whole_closed_with_comment || 0
    );
    document.getElementById('notesCommented').textContent = formatNumber(
      country.history_whole_commented || 0
    );
    document.getElementById('notesReopened').textContent = formatNumber(
      country.history_whole_reopened || 0
    );

    // Community Health Metrics
    renderCommunityHealthMetrics(country);

    // Resolution Metrics
    renderResolutionMetrics(country);

    // Application Statistics
    renderApplicationStats(country);

    // Content Quality Metrics
    renderContentQualityMetrics(country);

    // Resolution Trends
    renderResolutionTrends(country);

    // Activity heatmap
    renderCountryActivityHeatmap(country.last_year_activity, country.dates_most_open);

    // Hashtags
    renderHashtags(
      country.hashtags,
      country.hashtags_opening,
      country.hashtags_resolution,
      country.hashtags_comments,
      country.favorite_opening_hashtag,
      country.favorite_resolution_hashtag,
      country.opening_hashtag_count,
      country.resolution_hashtag_count
    );

    // Users
    await setupUsersSection(country);

    // User Rankings by Year
    renderUserRankingsByYear(country);

    // Working hours
    renderWorkingHoursSection(
      country.working_hours_of_week_opening,
      country.working_hours_of_week_commenting,
      country.working_hours_of_week_closing,
      document.getElementById('workingHoursContainer'),
      'country'
    );

    // Activity history
    renderActivityHistory(country);

    // Yearly history breakdown
    renderYearlyHistory(country);

    // First actions
    renderFirstActions(country);

    // Peak days
    renderCountryPeakActivityDays(country);

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
        url: window.location.href,
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
                ${activityByYear
                  .map(
                    (yearData) => `
                    <div style="min-width: 180px; flex-shrink: 0;">
                        <h4 style="margin-bottom: 0.75rem; text-align: center; font-size: 1rem; color: var(--text-color);">${yearData.year}</h4>
                        <div style="background: var(--card-bg); padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--border-color); height: 100%;">
                            ${renderYearActivityHeatmap(yearData.dates)}
                        </div>
                    </div>
                `
                  )
                  .join('')}
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

  dates.forEach((item) => {
    const year = new Date(item.date).getFullYear();
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(item);
  });

  return Object.keys(byYear)
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      dates: byYear[year],
    }));
}

function renderYearActivityHeatmap(dates) {
  // Create a simple visualization for the year
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const months = Array(12).fill(0);
  let totalNotes = 0;

  dates.forEach((item) => {
    const date = new Date(item.date);
    const month = date.getMonth();
    months[month] += item.quantity;
    totalNotes += item.quantity;
  });

  const maxActivity = Math.max(...months, 1);

  return `
        <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; margin-bottom: 0.5rem;">
            ${months
              .map((count, index) => {
                const intensity = count > 0 ? count / maxActivity : 0;
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
                             title="${monthNames[index]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}: ${count} notes">
                        </div>
                        <div style="font-size: 0.7rem; margin-top: 2px; color: var(--text-light); font-weight: 500;">
                            ${monthNames[index]}
                        </div>
                    </div>
                `;
              })
              .join('')}
        </div>
        <div style="text-align: center; font-size: 0.8rem; color: var(--text-color); font-weight: 500;">
            ${totalNotes} total notes
        </div>
    `;
}

function renderHashtags(
  hashtags,
  hashtagsOpening,
  hashtagsResolution,
  hashtagsComments,
  favoriteOpeningHashtag,
  favoriteResolutionHashtag,
  openingHashtagCount,
  resolutionHashtagCount
) {
  const container = document.getElementById('hashtagsContainer');

  let html = '';

  // Favorite hashtags section
  if (favoriteOpeningHashtag || favoriteResolutionHashtag) {
    html +=
      '<div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">Favorite Hashtags</h4>';
    html += '<div style="display: flex; gap: 1rem; flex-wrap: wrap;">';
    if (favoriteOpeningHashtag) {
      html += `<div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: var(--text-light);">📝 Opening:</span>
                <strong style="color: var(--primary-color);">#${favoriteOpeningHashtag}</strong>
                ${openingHashtagCount ? `<span style="color: var(--text-light); font-size: 0.85rem;">(${formatNumber(openingHashtagCount)} uses)</span>` : ''}
            </div>`;
    }
    if (favoriteResolutionHashtag) {
      html += `<div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: var(--text-light);">✅ Resolution:</span>
                <strong style="color: var(--primary-color);">#${favoriteResolutionHashtag}</strong>
                ${resolutionHashtagCount ? `<span style="color: var(--text-light); font-size: 0.85rem;">(${formatNumber(resolutionHashtagCount)} uses)</span>` : ''}
            </div>`;
    }
    html += '</div></div>';
  }

  // All hashtags (general)
  if (hashtags && hashtags.length > 0) {
    html += '<div style="margin-bottom: 1.5rem;">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">All Hashtags</h4>';
    html += hashtags
      .map(
        (item) => `
            <div class="hashtag-item">
                <span class="hashtag-name">${item.hashtag}</span>
                <span class="hashtag-count">${formatNumber(item.quantity)}</span>
            </div>
        `
      )
      .join('');
    html += '</div>';
  }

  // Hashtags by category
  const hasCategoryHashtags =
    (hashtagsOpening && hashtagsOpening.length > 0) ||
    (hashtagsResolution && hashtagsResolution.length > 0) ||
    (hashtagsComments && hashtagsComments.length > 0);

  if (hasCategoryHashtags) {
    html +=
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">';

    if (hashtagsOpening && hashtagsOpening.length > 0) {
      html +=
        '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
      html +=
        '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.9rem;">📝 Opening Hashtags</h4>';
      html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
      hashtagsOpening.slice(0, 5).forEach((item) => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--primary-color);">#${item.hashtag}</span>
                    <span style="color: var(--text-light); font-size: 0.85rem;">${formatNumber(item.quantity)}</span>
                </div>`;
      });
      html += '</div></div>';
    }

    if (hashtagsResolution && hashtagsResolution.length > 0) {
      html +=
        '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
      html +=
        '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.9rem;">✅ Resolution Hashtags</h4>';
      html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
      hashtagsResolution.slice(0, 5).forEach((item) => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--primary-color);">#${item.hashtag}</span>
                    <span style="color: var(--text-light); font-size: 0.85rem;">${formatNumber(item.quantity)}</span>
                </div>`;
      });
      html += '</div></div>';
    }

    if (hashtagsComments && hashtagsComments.length > 0) {
      html +=
        '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
      html +=
        '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.9rem;">💬 Comment Hashtags</h4>';
      html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
      hashtagsComments.slice(0, 5).forEach((item) => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--primary-color);">#${item.hashtag}</span>
                    <span style="color: var(--text-light); font-size: 0.85rem;">${formatNumber(item.quantity)}</span>
                </div>`;
      });
      html += '</div></div>';
    }

    html += '</div>';
  }

  if (!html) {
    container.innerHTML = '<p>No hashtags found</p>';
    return;
  }

  container.innerHTML = html;
}

async function setupUsersSection(country) {
  // Store country data for re-rendering
  window.countryUserData = {
    open: country.users_open_notes || [],
    solving: country.users_solving_notes || [],
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
    const userMap = new Map(userIndex.map((u) => [u.username, u.user_id]));

    const html = users
      .map((item, index) => {
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
                            <span class="country-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatUsernameWithStyle(item.username)}</span>
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
      })
      .join('');

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

function renderYearlyHistory(country) {
  const section = document.getElementById('yearlyHistorySection');
  const container = document.getElementById('yearlyHistoryContainer');

  if (!section || !container) return;

  // Find available years from history_{YEAR}_open fields
  const availableYears = [];
  for (let year = 2013; year <= 2025; year++) {
    const openField = `history_${year}_open`;
    if (country[openField] !== undefined && country[openField] !== null) {
      availableYears.push(year);
    }
  }

  // Hide section if no year data available
  if (availableYears.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Create table with yearly data
  let html =
    '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
  html +=
    '<thead><tr style="background: var(--card-bg); border-bottom: 2px solid var(--border-color);">';
  html += '<th style="padding: 0.75rem; text-align: left; color: var(--text-color);">Year</th>';
  html += '<th style="padding: 0.75rem; text-align: right; color: var(--text-color);">Opened</th>';
  html += '<th style="padding: 0.75rem; text-align: right; color: var(--text-color);">Closed</th>';
  html +=
    '<th style="padding: 0.75rem; text-align: right; color: var(--text-color);">Closed w/ Comment</th>';
  html +=
    '<th style="padding: 0.75rem; text-align: right; color: var(--text-color);">Commented</th>';
  html +=
    '<th style="padding: 0.75rem; text-align: right; color: var(--text-color);">Reopened</th>';
  html += '</tr></thead><tbody>';

  availableYears
    .sort((a, b) => b - a)
    .forEach((year) => {
      const open = country[`history_${year}_open`] || 0;
      const closed = country[`history_${year}_closed`] || 0;
      const closedWithComment = country[`history_${year}_closed_with_comment`] || 0;
      const commented = country[`history_${year}_commented`] || 0;
      const reopened = country[`history_${year}_reopened`] || 0;

      html += `<tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem; color: var(--text-color); font-weight: 500;">${year}</td>
            <td style="padding: 0.75rem; text-align: right; color: var(--text-color);">${formatNumber(open)}</td>
            <td style="padding: 0.75rem; text-align: right; color: var(--text-color);">${formatNumber(closed)}</td>
            <td style="padding: 0.75rem; text-align: right; color: var(--text-color);">${formatNumber(closedWithComment)}</td>
            <td style="padding: 0.75rem; text-align: right; color: var(--text-color);">${formatNumber(commented)}</td>
            <td style="padding: 0.75rem; text-align: right; color: var(--text-color);">${formatNumber(reopened)}</td>
        </tr>`;
    });

  html += '</tbody></table></div>';

  container.innerHTML = html;
}

function renderActivityHistory(country) {
  const container = document.getElementById('activityHistoryContainer');

  let html = '<div class="activity-history-grid">';

  // Year
  html += '<div class="history-item">';
  html += '<strong>This Year:</strong> ';
  html += 'Opened: ' + formatNumber(country.history_year_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(country.history_year_closed || 0);
  if (country.history_year_closed_with_comment) {
    html += ' (' + formatNumber(country.history_year_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(country.history_year_commented || 0);
  if (country.history_year_reopened) {
    html += ', Reopened: ' + formatNumber(country.history_year_reopened || 0);
  }
  html += '</div>';

  // Month
  html += '<div class="history-item">';
  html += '<strong>This Month:</strong> ';
  html += 'Opened: ' + formatNumber(country.history_month_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(country.history_month_closed || 0);
  if (country.history_month_closed_with_comment) {
    html += ' (' + formatNumber(country.history_month_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(country.history_month_commented || 0);
  if (country.history_month_reopened) {
    html += ', Reopened: ' + formatNumber(country.history_month_reopened || 0);
  }
  html += '</div>';

  // Day
  html += '<div class="history-item">';
  html += '<strong>Today:</strong> ';
  html += 'Opened: ' + formatNumber(country.history_day_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(country.history_day_closed || 0);
  if (country.history_day_closed_with_comment) {
    html += ' (' + formatNumber(country.history_day_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(country.history_day_commented || 0);
  if (country.history_day_reopened) {
    html += ', Reopened: ' + formatNumber(country.history_day_reopened || 0);
  }
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;
}

function renderCommunityHealthMetrics(country) {
  const section = document.getElementById('communityHealthSection');
  if (!section) return;

  // Hide section if no health data available
  if (!country.notes_health_score && !country.new_vs_resolved_ratio) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Format score (round to 2 decimals)
  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    return score.toFixed(2);
  };

  // Format ratio (round to 2 decimals)
  const formatRatio = (ratio) => {
    if (ratio === null || ratio === undefined) return '-';
    return ratio.toFixed(2);
  };

  // Update values
  const healthScoreEl = document.getElementById('notesHealthScore');
  const ratioEl = document.getElementById('newVsResolvedRatio');

  if (healthScoreEl) healthScoreEl.textContent = formatScore(country.notes_health_score);
  if (ratioEl) ratioEl.textContent = formatRatio(country.new_vs_resolved_ratio);
}

function renderContentQualityMetrics(country) {
  const section = document.getElementById('contentQualitySection');
  if (!section) return;

  // Hide section if no content quality data available
  if (
    !country.avg_comment_length &&
    !country.comments_with_url_count &&
    !country.comments_with_url_pct &&
    !country.comments_with_mention_count &&
    !country.comments_with_mention_pct &&
    !country.avg_comments_per_note
  ) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Format characters
  const formatChars = (value) => {
    if (value === null || value === undefined) return '-';
    return formatNumber(Math.round(value)) + ' chars';
  };

  // Format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1) + '%';
  };

  // Format number
  const formatNum = (value) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1);
  };

  // Update values
  const avgLengthEl = document.getElementById('avgCommentLength');
  const urlCountEl = document.getElementById('commentsWithUrl');
  const urlPctEl = document.getElementById('commentsWithUrlPct');
  const mentionCountEl = document.getElementById('commentsWithMention');
  const mentionPctEl = document.getElementById('commentsWithMentionPct');
  const avgCommentsEl = document.getElementById('avgCommentsPerNote');

  if (avgLengthEl) avgLengthEl.textContent = formatChars(country.avg_comment_length);
  if (urlCountEl) urlCountEl.textContent = formatNumber(country.comments_with_url_count || 0);
  if (urlPctEl) urlPctEl.textContent = formatPercent(country.comments_with_url_pct);
  if (mentionCountEl)
    mentionCountEl.textContent = formatNumber(country.comments_with_mention_count || 0);
  if (mentionPctEl) mentionPctEl.textContent = formatPercent(country.comments_with_mention_pct);
  if (avgCommentsEl) avgCommentsEl.textContent = formatNum(country.avg_comments_per_note);
}

function renderApplicationStats(country) {
  const section = document.getElementById('applicationStatsSection');
  const container = document.getElementById('applicationStatsContainer');
  if (!section || !container) return;

  // Hide section if no application data available
  if (
    !country.applications_used ||
    (country.applications_used.length === 0 &&
      !country.most_used_application_id &&
      !country.mobile_apps_count &&
      !country.desktop_apps_count)
  ) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let html =
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">';

  // Summary stats
  if (country.mobile_apps_count !== undefined || country.desktop_apps_count !== undefined) {
    html +=
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">Device Types</h4>';
    html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    if (country.mobile_apps_count !== undefined) {
      html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-light);">📱 Mobile Apps:</span>
                <strong style="color: var(--primary-color);">${formatNumber(country.mobile_apps_count)}</strong>
            </div>`;
    }
    if (country.desktop_apps_count !== undefined) {
      html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-light);">💻 Desktop/Web Apps:</span>
                <strong style="color: var(--primary-color);">${formatNumber(country.desktop_apps_count)}</strong>
            </div>`;
    }
    html += '</div></div>';
  }

  // Most used application
  if (country.most_used_application_id) {
    // Try to find the application name from applications_used
    let mostUsedAppName = `App #${country.most_used_application_id}`;
    if (country.applications_used && country.applications_used.length > 0) {
      const mostUsed = country.applications_used.find(
        (app) => app.application_id === country.most_used_application_id
      );
      if (mostUsed && mostUsed.application_name) {
        mostUsedAppName = mostUsed.application_name;
      }
    }

    html +=
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">Most Used</h4>';
    html += `<div style="color: var(--primary-color); font-weight: 500;">${mostUsedAppName}</div>`;
    html += '</div>';
  }

  // Applications list
  if (country.applications_used && country.applications_used.length > 0) {
    html +=
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color); grid-column: 1 / -1;">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">All Applications</h4>';
    html +=
      '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem;">';
    country.applications_used.slice(0, 10).forEach((app) => {
      html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-color); border-radius: calc(var(--radius) / 2);">
                <span style="color: var(--text-color); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${app.application_name || `App #${app.application_id}`}</span>
                <span style="color: var(--text-light); font-size: 0.85rem; margin-left: 0.5rem; flex-shrink: 0;">${formatNumber(app.usage_count || 0)}</span>
            </div>`;
    });
    if (country.applications_used.length > 10) {
      html += `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); font-size: 0.85rem; margin-top: 0.5rem;">
                +${country.applications_used.length - 10} more applications
            </div>`;
    }
    html += '</div></div>';
  }

  html += '</div>';

  // Application Usage Trends
  if (
    country.application_usage_trends &&
    Array.isArray(country.application_usage_trends) &&
    country.application_usage_trends.length > 0
  ) {
    html +=
      '<div style="margin-top: 2rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 0.95rem;">Application Usage Trends</h4>';

    const trendData = country.application_usage_trends.map((item) => ({
      label: item.period || item.month || item.year || 'Unknown',
      value: item.usage_count || item.count || 0,
    }));

    const trendContainer = document.createElement('div');
    createBarChart(trendData.slice(-12), trendContainer);
    html += trendContainer.innerHTML;
    html += '</div>';
  }

  // Version Adoption Rates
  if (
    country.version_adoption_rates &&
    (Array.isArray(country.version_adoption_rates) ||
      typeof country.version_adoption_rates === 'object')
  ) {
    html +=
      '<div style="margin-top: 2rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 0.95rem;">Version Adoption Rates</h4>';

    let adoptionData = [];
    if (Array.isArray(country.version_adoption_rates)) {
      adoptionData = country.version_adoption_rates.map((item) => ({
        label: item.version || item.version_name || 'Unknown',
        value: item.adoption_rate || item.usage_count || 0,
      }));
    } else {
      // If it's an object, convert to array
      adoptionData = Object.entries(country.version_adoption_rates).map(([version, rate]) => ({
        label: version,
        value: typeof rate === 'number' ? rate : 0,
      }));
    }

    const adoptionContainer = document.createElement('div');
    createBarChart(adoptionData.slice(0, 10), adoptionContainer);
    html += adoptionContainer.innerHTML;
    html += '</div>';
  }

  container.innerHTML = html;
}

function renderResolutionTrends(country) {
  const section = document.getElementById('resolutionTrendsSection');
  if (!section) return;

  // Check if we have resolution trend data
  const hasYearData =
    country.resolution_by_year &&
    Array.isArray(country.resolution_by_year) &&
    country.resolution_by_year.length > 0;
  const hasMonthData =
    country.resolution_by_month &&
    Array.isArray(country.resolution_by_month) &&
    country.resolution_by_month.length > 0;

  if (!hasYearData && !hasMonthData) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let html = '';

  // Resolution by Year
  if (hasYearData) {
    html += '<div style="margin-bottom: 2rem;">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 1rem;">Resolution Trends by Year</h4>';

    const chartData = country.resolution_by_year.map((item) => ({
      label: item.year || item.period || 'Unknown',
      value: item.avg_days_to_resolution || item.resolution_rate || 0,
    }));

    const chartContainer = document.createElement('div');
    createBarChart(chartData, chartContainer);
    html += chartContainer.innerHTML;
    html += '</div>';
  }

  // Resolution by Month
  if (hasMonthData) {
    html += '<div>';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 1rem;">Resolution Trends by Month</h4>';

    const chartData = country.resolution_by_month.slice(-12).map((item) => ({
      label: item.month || item.period || 'Unknown',
      value: item.avg_days_to_resolution || item.resolution_rate || 0,
    }));

    const chartContainer = document.createElement('div');
    createBarChart(chartData, chartContainer);
    html += chartContainer.innerHTML;
    html += '</div>';
  }

  const container = document.getElementById('resolutionTrendsContainer');
  if (container) {
    container.innerHTML = html;
  }
}

function renderResolutionMetrics(country) {
  const section = document.getElementById('resolutionMetricsSection');
  if (!section) return;

  // Hide section if no resolution data available
  if (
    !country.avg_days_to_resolution &&
    !country.median_days_to_resolution &&
    !country.resolution_rate &&
    !country.notes_resolved_count &&
    !country.notes_still_open_count
  ) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Format days (round to 1 decimal)
  const formatDays = (days) => {
    if (days === null || days === undefined) return '-';
    return days.toFixed(1) + ' days';
  };

  // Format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1) + '%';
  };

  // Update values
  const avgDaysEl = document.getElementById('avgDaysToResolution');
  const medianDaysEl = document.getElementById('medianDaysToResolution');
  const rateEl = document.getElementById('resolutionRate');
  const resolvedEl = document.getElementById('notesResolvedCount');
  const stillOpenEl = document.getElementById('notesStillOpenCount');

  if (avgDaysEl) avgDaysEl.textContent = formatDays(country.avg_days_to_resolution);
  if (medianDaysEl) medianDaysEl.textContent = formatDays(country.median_days_to_resolution);
  if (rateEl) rateEl.textContent = formatPercent(country.resolution_rate);
  if (resolvedEl) resolvedEl.textContent = formatNumber(country.notes_resolved_count || 0);
  if (stillOpenEl) stillOpenEl.textContent = formatNumber(country.notes_still_open_count || 0);
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
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      country.first_open_note_id +
      '" target="_blank">Note #' +
      country.first_open_note_id +
      '</a>';
    html += '</div>';
  }

  if (country.first_closed_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note closed:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      country.first_closed_note_id +
      '" target="_blank">Note #' +
      country.first_closed_note_id +
      '</a>';
    html += '</div>';
  }

  if (country.first_commented_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note commented:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      country.first_commented_note_id +
      '" target="_blank">Note #' +
      country.first_commented_note_id +
      '</a>';
    html += '</div>';
  }

  if (country.first_reopened_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note reopened:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      country.first_reopened_note_id +
      '" target="_blank">Note #' +
      country.first_reopened_note_id +
      '</a>';
    html += '</div>';
  }

  html += '</div>';

  container.innerHTML = html;
}

function renderUserRankingsByYear(country) {
  const section = document.getElementById('userRankingsByYearSection');
  const yearSelector = document.getElementById('countryYearSelector');
  const openContainer = document.getElementById('usersOpenByYearContainer');
  const closedContainer = document.getElementById('usersClosedByYearContainer');

  if (!section || !yearSelector || !openContainer || !closedContainer) return;

  // Find available years from ranking_users_opening_{YEAR} or ranking_users_closing_{YEAR} fields
  const availableYears = [];
  for (let year = 2013; year <= 2025; year++) {
    const openingField = `ranking_users_opening_${year}`;
    const closingField = `ranking_users_closing_${year}`;
    if (
      (country[openingField] &&
        Array.isArray(country[openingField]) &&
        country[openingField].length > 0) ||
      (country[closingField] &&
        Array.isArray(country[closingField]) &&
        country[closingField].length > 0)
    ) {
      if (!availableYears.includes(year)) {
        availableYears.push(year);
      }
    }
  }

  // Hide section if no year data available
  if (availableYears.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Populate year selector
  availableYears
    .sort((a, b) => b - a)
    .forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelector.appendChild(option);
    });

  // Function to render rankings for selected year
  const renderYearRankings = async (year) => {
    if (!year) {
      openContainer.innerHTML = '<p class="text-light">Select a year to view rankings</p>';
      closedContainer.innerHTML = '<p class="text-light">Select a year to view rankings</p>';
      return;
    }

    const openingField = `ranking_users_opening_${year}`;
    const closingField = `ranking_users_closing_${year}`;
    const openingRanking = country[openingField];
    const closingRanking = country[closingField];

    // Render opening ranking
    if (openingRanking && openingRanking.length > 0) {
      try {
        const userIndex = await apiClient.getUserIndex();
        const userMap = new Map(userIndex.map((u) => [u.username, u.user_id]));

        const html = openingRanking
          .slice(0, 10)
          .map((item, index) => {
            const userId = userMap.get(item.username) || '';
            const userObj = { username: item.username, user_id: userId };
            const avatarUrl = getUserAvatarSync(userObj, 40);
            const userProfileUrl = `user.html?username=${encodeURIComponent(item.username)}`;

            return `
                        <div class="country-item" style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                                <span class="country-rank" style="flex-shrink: 0;">#${index + 1}</span>
                                ${avatarUrl ? `<img src="${avatarUrl}" alt="${item.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
                                <a href="${userProfileUrl}" style="text-decoration: none; color: inherit;">
                                    <span class="country-name">${formatUsernameWithStyle(item.username)}</span>
                                </a>
                            </div>
                            <span style="font-size: 0.85rem; color: var(--text-light);">${formatNumber(item.quantity || 0)}</span>
                        </div>
                    `;
          })
          .join('');

        openContainer.innerHTML = html;
      } catch (error) {
        console.error(`Error rendering opening ranking for year ${year}:`, error);
        openContainer.innerHTML = '<p class="text-light">Error loading ranking data</p>';
      }
    } else {
      openContainer.innerHTML = `<p class="text-light">No opening data for ${year}</p>`;
    }

    // Render closing ranking
    if (closingRanking && closingRanking.length > 0) {
      try {
        const userIndex = await apiClient.getUserIndex();
        const userMap = new Map(userIndex.map((u) => [u.username, u.user_id]));

        const html = closingRanking
          .slice(0, 10)
          .map((item, index) => {
            const userId = userMap.get(item.username) || '';
            const userObj = { username: item.username, user_id: userId };
            const avatarUrl = getUserAvatarSync(userObj, 40);
            const userProfileUrl = `user.html?username=${encodeURIComponent(item.username)}`;

            return `
                        <div class="country-item" style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                                <span class="country-rank" style="flex-shrink: 0;">#${index + 1}</span>
                                ${avatarUrl ? `<img src="${avatarUrl}" alt="${item.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
                                <a href="${userProfileUrl}" style="text-decoration: none; color: inherit;">
                                    <span class="country-name">${formatUsernameWithStyle(item.username)}</span>
                                </a>
                            </div>
                            <span style="font-size: 0.85rem; color: var(--text-light);">${formatNumber(item.quantity || 0)}</span>
                        </div>
                    `;
          })
          .join('');

        closedContainer.innerHTML = html;
      } catch (error) {
        console.error(`Error rendering closing ranking for year ${year}:`, error);
        closedContainer.innerHTML = '<p class="text-light">Error loading ranking data</p>';
      }
    } else {
      closedContainer.innerHTML = `<p class="text-light">No closing data for ${year}</p>`;
    }
  };

  // Event listener for year selector
  yearSelector.addEventListener('change', (e) => {
    renderYearRankings(e.target.value);
  });

  // Set default to most recent year
  if (availableYears.length > 0) {
    yearSelector.value = availableYears[0];
    renderYearRankings(availableYears[0]);
  }
}

function renderCountryPeakActivityDays(country) {
  renderCountryDayList(
    country.dates_most_open,
    'countryTopOpeningDays',
    'No opening peak days available'
  );
  renderCountryDayList(
    country.dates_most_closed,
    'countryTopClosingDays',
    'No closing peak days available'
  );
}

function renderCountryDayList(items, containerId, emptyMessage) {
  const container = document.getElementById(containerId);

  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<p class="text-light">${emptyMessage}</p>`;
    return;
  }

  const limitedItems = items.slice(0, 10);
  const html = limitedItems
    .map((item) => {
      const formattedDate = item.date ? formatDate(item.date) : 'Unknown date';
      const quantity = formatNumber(item.quantity || 0);
      return `
            <div class="country-item" style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                <span class="country-name" style="flex: 1;">${formattedDate}</span>
                <span style="font-size: 0.85rem; color: var(--text-light);">${quantity} notes</span>
            </div>
        `;
    })
    .join('');

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
