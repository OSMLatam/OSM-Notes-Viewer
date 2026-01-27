// User Profile Page
import { apiClient } from '../api/apiClient.js';
import { formatNumber, formatDate } from '../utils/formatter.js';
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
import { createBarChart } from '../components/chart.js';
import { shareComponent } from '../components/share.js';
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
import { getUserAvatarSync, loadOSMAvatarInBackground } from '../utils/userAvatar.js';
import { createSimpleNoteCard, createNoteCardWithMap } from '../utils/noteMap.js';

// Helper function to format username with special styling
function formatUsernameWithStyle(username) {
  if (username === 'NeisBot') {
    return `<span class="bot-username" title="Automated bot account">🤖 ${username}</span>`;
  }
  return username;
}

// Get user ID or username from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');
let username = urlParams.get('username');
// Decode username in case it has special characters
if (username) {
  username = decodeURIComponent(username);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Try to load by username first if provided
    if (username) {
      console.log('Loading user by username:', username);
      await loadUserProfileByUsername(username);
    } else if (userId) {
      console.log('Loading user by ID:', userId);
      await loadUserProfile(userId);
    } else {
      showError('No user ID or username provided');
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    showError(`Failed to load user profile: ${error.message}`);
  }
});

async function loadUserProfileByUsername(username) {
  const loading = document.getElementById('profileLoading');

  try {
    // Fetch user index to find user_id by username
    const userIndex = await apiClient.getUserIndex();

    // Try exact match first
    let user = userIndex.find((u) => u.username === username);

    // If not found, try case-insensitive match
    if (!user) {
      user = userIndex.find((u) => u.username.toLowerCase() === username.toLowerCase());
    }

    // If still not found, try with trimmed whitespace
    if (!user) {
      user = userIndex.find((u) => u.username.trim() === username.trim());
    }

    if (!user) {
      console.error('User not found:', username);
      console.log(
        'Available users (first 10):',
        userIndex.slice(0, 10).map((u) => u.username)
      );
      throw new Error(`User "${username}" not found`);
    }

    console.log('Found user:', user.username, 'ID:', user.user_id);

    // Load profile using user_id
    await loadUserProfile(user.user_id);

    // Update URL to only use username (not ID)
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('id'); // Remove ID from URL
    newUrl.searchParams.set('username', username);
    window.history.replaceState({}, '', newUrl);
  } catch (error) {
    console.error('Error in loadUserProfileByUsername:', error);
    loading.style.display = 'none';
    throw error;
  }
}

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
    document.getElementById('username').innerHTML = formatUsernameWithStyle(
      user.username || 'Unknown User'
    );
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
    document.getElementById('notesClosed').textContent = formatNumber(
      user.history_whole_closed || 0
    );
    document.getElementById('notesClosedWithComment').textContent = formatNumber(
      user.history_whole_closed_with_comment || 0
    );
    document.getElementById('notesCommented').textContent = formatNumber(
      user.history_whole_commented || 0
    );
    document.getElementById('notesReopened').textContent = formatNumber(
      user.history_whole_reopened || 0
    );

    // Resolution Metrics
    renderResolutionMetrics(user);

    // Application Statistics
    renderApplicationStats(user);

    // Content Quality Metrics
    renderContentQualityMetrics(user);

    // User Behavior Metrics
    renderUserBehaviorMetrics(user);

    // Resolution Trends
    renderResolutionTrends(user);

    // Activity heatmap
    renderUserActivityHeatmap(user.last_year_activity);

    // Hashtags
    renderHashtags(
      user.hashtags,
      user.hashtags_opening,
      user.hashtags_resolution,
      user.hashtags_comments,
      user.favorite_opening_hashtag,
      user.favorite_resolution_hashtag,
      user.opening_hashtag_count,
      user.resolution_hashtag_count
    );

    // Countries
    await renderCountryRanking(
      user.countries_open_notes,
      'countriesOpenContainer',
      'No open country data available'
    );
    await renderCountryRanking(
      user.countries_solving_notes,
      'countriesSolvingContainer',
      'No solving country data available'
    );

    // Country Rankings by Year
    renderCountryRankingsByYear(user);

    // Working hours
    renderWorkingHoursSection(
      user.working_hours_of_week_opening,
      user.working_hours_of_week_commenting,
      user.working_hours_of_week_closing,
      document.getElementById('workingHoursContainer'),
      'user'
    );

    // Activity history
    renderActivityHistory(user);

    // Yearly history breakdown
    renderYearlyHistory(user);

    // First actions
    renderFirstActions(user);

    // Peak days
    renderPeakActivityDays(user);

    // Setup share button
    setupShareButton(user);

    // Load recent notes in sidebars
    await loadRecentNotes(user);
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

function renderUserActivityHeatmap(activityString) {
  const container = document.getElementById('activityHeatmap');

  if (!activityString || activityString.length === 0) {
    container.innerHTML = '<p>No activity data available</p>';
    return;
  }

  // Use the actual heatmap component
  renderActivityHeatmap(activityString, container);
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
    const chartData = hashtags.map((item) => ({
      label: item.hashtag,
      value: item.quantity,
    }));
    const chartContainer = document.createElement('div');
    createBarChart(chartData, chartContainer);
    html += chartContainer.innerHTML;
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

async function renderCountryRanking(countries, containerId, emptyMessage) {
  const container = document.getElementById(containerId);

  if (!container) return;

  if (!countries || countries.length === 0) {
    container.innerHTML = `<p class="text-light">${emptyMessage}</p>`;
    return;
  }

  try {
    const chartData = countries
      .map((item) => ({
        label: item.country,
        value: item.quantity,
      }))
      .slice(0, 10);

    createBarChart(chartData, container);
  } catch (error) {
    console.error('Error rendering country ranking:', error);
    container.innerHTML = '<p class="text-light">Error loading country data</p>';
  }
}

function renderCountryRankingsByYear(user) {
  const section = document.getElementById('countryRankingsByYearSection');
  const yearSelector = document.getElementById('yearSelector');
  const container = document.getElementById('countriesOpenByYearContainer');

  if (!section || !yearSelector || !container) return;

  // Find available years from ranking_countries_opening_{YEAR} fields
  const availableYears = [];
  for (let year = 2013; year <= 2025; year++) {
    const fieldName = `ranking_countries_opening_${year}`;
    if (user[fieldName] && Array.isArray(user[fieldName]) && user[fieldName].length > 0) {
      availableYears.push(year);
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

  // Function to render ranking for selected year
  const renderYearRanking = async (year) => {
    if (!year) {
      container.innerHTML = '<p class="text-light">Select a year to view rankings</p>';
      return;
    }

    const fieldName = `ranking_countries_opening_${year}`;
    const ranking = user[fieldName];

    if (!ranking || ranking.length === 0) {
      container.innerHTML = `<p class="text-light">No data available for ${year}</p>`;
      return;
    }

    try {
      const chartData = ranking
        .map((item) => ({
          label: item.country || item.name || 'Unknown',
          value: item.quantity || item.count || 0,
        }))
        .slice(0, 10);

      container.innerHTML = '';
      createBarChart(chartData, container);
    } catch (error) {
      console.error(`Error rendering ranking for year ${year}:`, error);
      container.innerHTML = '<p class="text-light">Error loading ranking data</p>';
    }
  };

  // Event listener for year selector
  yearSelector.addEventListener('change', (e) => {
    renderYearRanking(e.target.value);
  });

  // Set default to most recent year
  if (availableYears.length > 0) {
    yearSelector.value = availableYears[0];
    renderYearRanking(availableYears[0]);
  }
}

function renderPeakActivityDays(user) {
  renderActivityDayList(user.dates_most_open, 'topOpeningDays', 'No opening peak days available');
  renderActivityDayList(user.dates_most_closed, 'topClosingDays', 'No closing peak days available');
}

function renderActivityDayList(items, containerId, emptyMessage) {
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

// This function is now replaced by renderWorkingHoursSection from workingHoursHeatmap.js

function renderYearlyHistory(user) {
  const section = document.getElementById('yearlyHistorySection');
  const container = document.getElementById('yearlyHistoryContainer');

  if (!section || !container) return;

  // Find available years from history_{YEAR}_open fields
  const availableYears = [];
  for (let year = 2013; year <= 2025; year++) {
    const openField = `history_${year}_open`;
    if (user[openField] !== undefined && user[openField] !== null) {
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
      const open = user[`history_${year}_open`] || 0;
      const closed = user[`history_${year}_closed`] || 0;
      const closedWithComment = user[`history_${year}_closed_with_comment`] || 0;
      const commented = user[`history_${year}_commented`] || 0;
      const reopened = user[`history_${year}_reopened`] || 0;

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

function renderActivityHistory(user) {
  const container = document.getElementById('activityHistoryContainer');

  let html = '<div class="activity-history-grid">';

  // Year
  html += '<div class="history-item">';
  html += '<strong>This Year:</strong> ';
  html += 'Opened: ' + formatNumber(user.history_year_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(user.history_year_closed || 0);
  if (user.history_year_closed_with_comment) {
    html += ' (' + formatNumber(user.history_year_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(user.history_year_commented || 0);
  if (user.history_year_reopened) {
    html += ', Reopened: ' + formatNumber(user.history_year_reopened || 0);
  }
  html += '</div>';

  // Month
  html += '<div class="history-item">';
  html += '<strong>This Month:</strong> ';
  html += 'Opened: ' + formatNumber(user.history_month_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(user.history_month_closed || 0);
  if (user.history_month_closed_with_comment) {
    html += ' (' + formatNumber(user.history_month_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(user.history_month_commented || 0);
  if (user.history_month_reopened) {
    html += ', Reopened: ' + formatNumber(user.history_month_reopened || 0);
  }
  html += '</div>';

  // Day
  html += '<div class="history-item">';
  html += '<strong>Today:</strong> ';
  html += 'Opened: ' + formatNumber(user.history_day_open || 0) + ', ';
  html += 'Closed: ' + formatNumber(user.history_day_closed || 0);
  if (user.history_day_closed_with_comment) {
    html += ' (' + formatNumber(user.history_day_closed_with_comment || 0) + ' with comment)';
  }
  html += ', Commented: ' + formatNumber(user.history_day_commented || 0);
  if (user.history_day_reopened) {
    html += ', Reopened: ' + formatNumber(user.history_day_reopened || 0);
  }
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;
}

function renderContentQualityMetrics(user) {
  const section = document.getElementById('contentQualitySection');
  if (!section) return;

  // Hide section if no content quality data available
  if (
    !user.avg_comment_length &&
    !user.comments_with_url_count &&
    !user.comments_with_url_pct &&
    !user.comments_with_mention_count &&
    !user.comments_with_mention_pct &&
    !user.avg_comments_per_note
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

  if (avgLengthEl) avgLengthEl.textContent = formatChars(user.avg_comment_length);
  if (urlCountEl) urlCountEl.textContent = formatNumber(user.comments_with_url_count || 0);
  if (urlPctEl) urlPctEl.textContent = formatPercent(user.comments_with_url_pct);
  if (mentionCountEl)
    mentionCountEl.textContent = formatNumber(user.comments_with_mention_count || 0);
  if (mentionPctEl) mentionPctEl.textContent = formatPercent(user.comments_with_mention_pct);
  if (avgCommentsEl) avgCommentsEl.textContent = formatNum(user.avg_comments_per_note);
}

function renderApplicationStats(user) {
  const section = document.getElementById('applicationStatsSection');
  const container = document.getElementById('applicationStatsContainer');
  if (!section || !container) return;

  // Hide section if no application data available
  if (
    !user.applications_used ||
    (user.applications_used.length === 0 &&
      !user.most_used_application_id &&
      !user.mobile_apps_count &&
      !user.desktop_apps_count)
  ) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let html =
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">';

  // Summary stats
  if (user.mobile_apps_count !== undefined || user.desktop_apps_count !== undefined) {
    html +=
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">Device Types</h4>';
    html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    if (user.mobile_apps_count !== undefined) {
      html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-light);">📱 Mobile Apps:</span>
                <strong style="color: var(--primary-color);">${formatNumber(user.mobile_apps_count)}</strong>
            </div>`;
    }
    if (user.desktop_apps_count !== undefined) {
      html += `<div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-light);">💻 Desktop/Web Apps:</span>
                <strong style="color: var(--primary-color);">${formatNumber(user.desktop_apps_count)}</strong>
            </div>`;
    }
    html += '</div></div>';
  }

  // Most used application
  if (user.most_used_application_id) {
    // Try to find the application name from applications_used
    let mostUsedAppName = `App #${user.most_used_application_id}`;
    if (user.applications_used && user.applications_used.length > 0) {
      const mostUsed = user.applications_used.find(
        (app) => app.application_id === user.most_used_application_id
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
  if (user.applications_used && user.applications_used.length > 0) {
    html +=
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color); grid-column: 1 / -1;">';
    html +=
      '<h4 style="margin: 0 0 0.75rem 0; color: var(--text-color); font-size: 0.95rem;">All Applications</h4>';
    html +=
      '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem;">';
    user.applications_used.slice(0, 10).forEach((app) => {
      html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-color); border-radius: calc(var(--radius) / 2);">
                <span style="color: var(--text-color); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${app.application_name || `App #${app.application_id}`}</span>
                <span style="color: var(--text-light); font-size: 0.85rem; margin-left: 0.5rem; flex-shrink: 0;">${formatNumber(app.usage_count || 0)}</span>
            </div>`;
    });
    if (user.applications_used.length > 10) {
      html += `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); font-size: 0.85rem; margin-top: 0.5rem;">
                +${user.applications_used.length - 10} more applications
            </div>`;
    }
    html += '</div></div>';
  }

  html += '</div>';

  // Application Usage Trends
  if (
    user.application_usage_trends &&
    Array.isArray(user.application_usage_trends) &&
    user.application_usage_trends.length > 0
  ) {
    html +=
      '<div style="margin-top: 2rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 0.95rem;">Application Usage Trends</h4>';

    const trendData = user.application_usage_trends.map((item) => ({
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
    user.version_adoption_rates &&
    (Array.isArray(user.version_adoption_rates) || typeof user.version_adoption_rates === 'object')
  ) {
    html +=
      '<div style="margin-top: 2rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 0.95rem;">Version Adoption Rates</h4>';

    let adoptionData = [];
    if (Array.isArray(user.version_adoption_rates)) {
      adoptionData = user.version_adoption_rates.map((item) => ({
        label: item.version || item.version_name || 'Unknown',
        value: item.adoption_rate || item.usage_count || 0,
      }));
    } else {
      // If it's an object, convert to array
      adoptionData = Object.entries(user.version_adoption_rates).map(([version, rate]) => ({
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

function renderResolutionMetrics(user) {
  const section = document.getElementById('resolutionMetricsSection');
  if (!section) return;

  // Hide section if no resolution data available
  if (
    !user.avg_days_to_resolution &&
    !user.median_days_to_resolution &&
    !user.resolution_rate &&
    !user.notes_resolved_count &&
    !user.notes_still_open_count &&
    !user.notes_opened_but_not_closed_by_user
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
  const openedButNotClosedEl = document.getElementById('notesOpenedButNotClosed');

  if (avgDaysEl) avgDaysEl.textContent = formatDays(user.avg_days_to_resolution);
  if (medianDaysEl) medianDaysEl.textContent = formatDays(user.median_days_to_resolution);
  if (rateEl) rateEl.textContent = formatPercent(user.resolution_rate);
  if (resolvedEl) resolvedEl.textContent = formatNumber(user.notes_resolved_count || 0);
  if (stillOpenEl) stillOpenEl.textContent = formatNumber(user.notes_still_open_count || 0);
  if (openedButNotClosedEl)
    openedButNotClosedEl.textContent = formatNumber(user.notes_opened_but_not_closed_by_user || 0);
}

function renderUserBehaviorMetrics(user) {
  const section = document.getElementById('userBehaviorSection');
  if (!section) return;

  // Hide section if no behavior data available
  if (!user.user_response_time && !user.collaboration_patterns) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Format time (could be in hours, days, etc.)
  const formatResponseTime = (time) => {
    if (time === null || time === undefined) return '-';
    if (time < 24) {
      return time.toFixed(1) + ' hours';
    } else if (time < 168) {
      return (time / 24).toFixed(1) + ' days';
    } else {
      return (time / 168).toFixed(1) + ' weeks';
    }
  };

  // Update response time
  const responseTimeEl = document.getElementById('userResponseTime');
  if (responseTimeEl && user.user_response_time !== undefined) {
    responseTimeEl.textContent = formatResponseTime(user.user_response_time);
  }

  // Collaboration patterns visualization
  const collaborationContainer = document.getElementById('collaborationPatternsContainer');
  if (collaborationContainer && user.collaboration_patterns) {
    let html =
      '<div style="padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border-color);">';
    html +=
      '<h4 style="margin: 0 0 1rem 0; color: var(--text-color); font-size: 0.95rem;">Collaboration Patterns</h4>';

    if (Array.isArray(user.collaboration_patterns)) {
      // If it's an array of patterns
      html +=
        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem;">';
      user.collaboration_patterns.slice(0, 10).forEach((pattern) => {
        html += `<div style="padding: 0.75rem; background: var(--bg-color); border-radius: calc(var(--radius) / 2);">
                    <div style="color: var(--text-color); font-size: 0.9rem; font-weight: 500;">${pattern.partner || pattern.user || 'Unknown'}</div>
                    <div style="color: var(--text-light); font-size: 0.85rem;">${formatNumber(pattern.count || pattern.collaborations || 0)} collaborations</div>
                </div>`;
      });
      html += '</div>';
    } else if (typeof user.collaboration_patterns === 'object') {
      // If it's an object with pattern data
      html += '<div style="color: var(--text-light);">';
      html += '<p>Collaboration data available. Visualization coming soon.</p>';
      html += '</div>';
    }

    html += '</div>';
    collaborationContainer.innerHTML = html;
  } else if (collaborationContainer) {
    collaborationContainer.style.display = 'none';
  }
}

function renderResolutionTrends(user) {
  const section = document.getElementById('resolutionTrendsSection');
  if (!section) return;

  // Check if we have resolution trend data
  const hasYearData =
    user.resolution_by_year &&
    Array.isArray(user.resolution_by_year) &&
    user.resolution_by_year.length > 0;
  const hasMonthData =
    user.resolution_by_month &&
    Array.isArray(user.resolution_by_month) &&
    user.resolution_by_month.length > 0;

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

    const chartData = user.resolution_by_year.map((item) => ({
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

    const chartData = user.resolution_by_month.slice(-12).map((item) => ({
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
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      user.first_open_note_id +
      '" target="_blank">Note #' +
      user.first_open_note_id +
      '</a>';
    html += '</div>';
  }

  if (user.first_closed_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note closed:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      user.first_closed_note_id +
      '" target="_blank">Note #' +
      user.first_closed_note_id +
      '</a>';
    html += '</div>';
  }

  if (user.first_commented_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note commented:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      user.first_commented_note_id +
      '" target="_blank">Note #' +
      user.first_commented_note_id +
      '</a>';
    html += '</div>';
  }

  if (user.first_reopened_note_id) {
    html += '<div class="action-item">';
    html += '<strong>First note reopened:</strong> ';
    html +=
      '<a href="https://www.openstreetmap.org/note/' +
      user.first_reopened_note_id +
      '" target="_blank">Note #' +
      user.first_reopened_note_id +
      '</a>';
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

    // Load OSM avatar in background
    loadOSMAvatarInBackground(user, avatarImg);
  }
}

async function loadRecentNotes(user) {
  // Load recent open notes
  const openNotesContainer = document.getElementById('recentOpenNotesContainer');
  if (openNotesContainer) {
    const noteIds = [];

    // Collect note IDs from user data
    if (user.lastest_open_note_id) noteIds.push(user.lastest_open_note_id);
    if (user.lastest_commented_note_id) noteIds.push(user.lastest_commented_note_id);

    if (noteIds.length > 0) {
      openNotesContainer.innerHTML = '';
      // Create cards with maps
      for (const noteId of noteIds) {
        const card = await createNoteCardWithMap(noteId, 'open');
        if (card) {
          openNotesContainer.appendChild(card);
        }
      }
    } else {
      openNotesContainer.innerHTML =
        '<p style="text-align: center; color: var(--text-light); font-size: 0.9rem;">No recent open notes</p>';
    }
  }

  // Load recent closed notes
  const closedNotesContainer = document.getElementById('recentClosedNotesContainer');
  if (closedNotesContainer) {
    const noteIds = [];

    // Collect note IDs from user data
    if (user.lastest_closed_note_id) noteIds.push(user.lastest_closed_note_id);
    if (user.lastest_reopened_note_id) noteIds.push(user.lastest_reopened_note_id);

    if (noteIds.length > 0) {
      closedNotesContainer.innerHTML = '';
      // Create cards with maps
      for (const noteId of noteIds) {
        const card = await createNoteCardWithMap(noteId, 'closed');
        if (card) {
          closedNotesContainer.appendChild(card);
        }
      }
    } else {
      closedNotesContainer.innerHTML =
        '<p style="text-align: center; color: var(--text-light); font-size: 0.9rem;">No recent closed notes</p>';
    }
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
