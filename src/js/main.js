// Main application script
import { apiClient } from './api/apiClient.js';
import { formatNumber, formatDate, formatDateWithBreak } from './utils/formatter.js';
import { showError, showLoading, showEmpty, handleApiError } from './components/errorHandler.js';
import { SearchComponent } from './components/search.js';
import { createStatSkeletons, createLeaderboardSkeletons } from './components/skeleton.js';
import { renderPagination, getPaginationInfo } from './components/pagination.js';
import { initDarkMode, toggleTheme } from './components/darkMode.js';
import { analytics } from './utils/analytics.js';
import { i18n } from './utils/i18n.js';
import { animationManager } from './components/animationManager.js';
import { keyboardShortcuts } from './components/keyboardShortcuts.js';
import { getCountryFlagFromObject } from './utils/countryFlags.js';
import { getUserAvatarSync, loadOSMAvatarInBackground } from './utils/userAvatar.js';
import { createSimpleNoteCard } from './utils/noteMap.js';

// Helper function to format username with special styling
function formatUsernameWithStyle(username) {
    if (username === 'NeisBot') {
        return `<span class="bot-username" title="Automated bot account">🤖 ${username}</span>`;
    }
    return username;
}

// User Search Component
class UserSearchComponent extends SearchComponent {
    matchesQuery(item, query) {
        return item.username?.toLowerCase().includes(query) ||
               item.user_id?.toString() === query ||
               item.country_name?.toLowerCase().includes(query) ||
               item.country_name_en?.toLowerCase().includes(query) ||
               item.country_name_es?.toLowerCase().includes(query) ||
               item.country_id?.toString() === query;
    }

    showResults(items) {
        super.showResults(items);

        // Load OSM avatars in background for search results
        if (currentSearchType === 'users') {
            setTimeout(() => {
                this.results.querySelectorAll('img.search-avatar').forEach((img) => {
                    const userId = parseInt(img.getAttribute('data-user-id'));
                    const username = img.alt;
                    if (userId && username) {
                        const userObj = { username, user_id: userId };
                        loadOSMAvatarInBackground(userObj, img);
                    }
                });
            }, 0);
        }
    }

    renderItem(item, index) {
        if (currentSearchType === 'users') {
            const avatarUrl = getUserAvatarSync(item, 40);
            const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(item.username)}`;
            const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(item.username)}`;
            return `
                <div class="search-result-item">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${item.username}" class="search-avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" data-user-id="${item.user_id}">` : ''}
                        <strong>${this.highlightMatch(formatUsernameWithStyle(item.username), this.input.value)}</strong>
                        <a href="${osmProfileUrl}" target="_blank" rel="noopener noreferrer" style="opacity: 0.6; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on OpenStreetMap">
                            <span style="font-size: 0.9rem;">↗</span>
                        </a>
                        <a href="${hdycProfileUrl}" target="_blank" rel="noopener noreferrer" style="opacity: 0.6; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on HDYC">
                            <span style="font-size: 0.9rem;">⚡</span>
                        </a>
                    </div>
                    <span class="text-light">ID: ${item.user_id}</span>
                </div>
            `;
        } else {
            const countryName = item.country_name_en || item.country_name;
            const countryFlag = getCountryFlagFromObject(item);
            return `
                <div class="search-result-item">
                    <strong>${countryFlag ? `${countryFlag} ` : ''}${this.highlightMatch(countryName, this.input.value)}</strong>
                    <span class="text-light">ID: ${item.country_id}</span>
                </div>
            `;
        }
    }

    highlightMatch(text, query) {
        if (!text || !query) return text;
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return text;
        return text.substring(0, index) +
               `<mark>${text.substring(index, index + query.length)}</mark>` +
               text.substring(index + query.length);
    }
}

// DOM Elements
let searchInput, searchBtn, searchResults;
let currentSearchType = 'users';
let searchComponent = null;
let isUpdatingSearchData = false; // Flag to prevent concurrent updates

// Pagination state
let currentUserPage = 1;
let currentCountryPage = 1;
const ITEMS_PER_PAGE = 50;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App initializing...');

    // Initialize i18n first
    await i18n.init();

    // Initialize dark mode
    initDarkMode();

    // Initialize animations
    animationManager.animatePageTransition('forward');

    initializeElements();
    setupEventListeners();

    // Set initial placeholder based on default tab
    if (searchInput) {
        searchInput.placeholder = i18n.t('home.search.placeholderUsers');
    }

    console.log('📊 Loading initial data...');
    await loadInitialData();
    console.log('🔍 Loading search data...');
    // Load search data after initial setup
    await updateSearchData();
    console.log('✅ App initialized successfully');
});

function initializeElements() {
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    searchResults = document.getElementById('searchResults');

    // Initialize mobile menu
    initMobileMenu();
}

function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            nav.classList.toggle('mobile-open');
            toggle.classList.toggle('active');
        });

        // Close menu when clicking nav links
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                toggle.setAttribute('aria-expanded', 'false');
                nav.classList.remove('mobile-open');
                toggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                toggle.setAttribute('aria-expanded', 'false');
                nav.classList.remove('mobile-open');
                toggle.classList.remove('active');
            }
        });
    }
}

function setupEventListeners() {
    // Tab switching - only add listeners if not already added
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length > 0 && !tabButtons[0].hasAttribute('data-listeners-added')) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Get the tab from the button itself, not the target (which might be the span)
                const tab = btn.dataset.tab;
                if (tab) {
                    switchTab(tab);
                }
            });
            btn.setAttribute('data-listeners-added', 'true');
        });
    }

    // Setup autocomplete search (only once)
    if (searchInput && searchResults && !searchComponent) {
        searchComponent = new UserSearchComponent(searchInput, searchResults, handleSearchSelect);
    }

    // Search button - only add listener if not already added
    if (searchBtn && !searchBtn.hasAttribute('data-listener-added')) {
        searchBtn.addEventListener('click', performSearch);
        searchBtn.setAttribute('data-listener-added', 'true');
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && !themeToggle.hasAttribute('data-listener-added')) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.setAttribute('data-listener-added', 'true');
    }

    // Listen for language changes to update placeholder
    if (!window.hasLanguageListener) {
        window.addEventListener('languageChanged', () => {
            if (searchInput) {
                let placeholder;
                if (currentSearchType === 'users') {
                    placeholder = i18n.t('home.search.placeholderUsers');
                } else if (currentSearchType === 'countries') {
                    placeholder = i18n.t('home.search.placeholderCountries');
                } else if (currentSearchType === 'notes') {
                    placeholder = i18n.t('home.search.placeholderNotes');
                } else {
                    placeholder = i18n.t('home.search.placeholder');
                }
                searchInput.placeholder = placeholder;
            }
        });
        window.hasLanguageListener = true;
    }
}

function switchTab(tab) {
    console.log('Switching to tab:', tab, 'Current:', currentSearchType);
    currentSearchType = tab;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive.toString());
    });

    // Update placeholder and clear input
    if (searchInput) {
        let placeholder;
        if (tab === 'users') {
            placeholder = i18n.t('home.search.placeholderUsers');
        } else if (tab === 'countries') {
            placeholder = i18n.t('home.search.placeholderCountries');
        } else if (tab === 'notes') {
            placeholder = i18n.t('home.search.placeholderNotes');
        } else {
            placeholder = i18n.t('home.search.placeholder');
        }
        console.log('Setting placeholder to:', placeholder);
        searchInput.placeholder = placeholder;
        searchInput.value = '';

        // Trigger input event to reset any autocomplete state
        searchInput.dispatchEvent(new Event('input'));
    }

    // Clear results
    if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }

    // Update search component data
    updateSearchData();
}

async function updateSearchData() {
    if (!searchComponent || isUpdatingSearchData) return;
    
    // Don't load data for notes tab (it's a direct ID search)
    if (currentSearchType === 'notes') {
        return;
    }

    isUpdatingSearchData = true;

    try {
        if (currentSearchType === 'users') {
            const users = await apiClient.getUserIndex();
            searchComponent.setData(users);
        } else {
            const countries = await apiClient.getCountryIndex();
            searchComponent.setData(countries);
        }
    } catch (error) {
        console.error('Error loading search data:', error);
    } finally {
        isUpdatingSearchData = false;
    }
}

function handleSearchSelect(item) {
    // Track profile navigation
    if (currentSearchType === 'users') {
        analytics.trackProfileView('user', item.user_id);
        window.location.href = `pages/user.html?username=${encodeURIComponent(item.username)}`;
    } else {
        analytics.trackProfileView('country', item.country_id);
        const countryName = item.country_name_en || item.country_name;
        window.location.href = `pages/country.html?name=${encodeURIComponent(countryName)}`;
    }
}

async function performSearch() {
    const query = searchInput?.value.trim();
    if (!query) return;

    // Handle note search differently
    if (currentSearchType === 'notes') {
        await searchNoteById(query);
        return;
    }

    showLoading(searchResults, i18n.t('search.loading'));

    try {
        if (currentSearchType === 'users') {
            await searchUsers(query);
        } else {
            await searchCountries(query);
        }
    } catch (error) {
        handleApiError(error, searchResults);
    }
}

/**
 * Search for a note by ID and redirect to note viewer
 * @param {string} query - Note ID to search for
 */
async function searchNoteById(query) {
    // Validate that query is a number
    const noteId = parseInt(query, 10);
    if (isNaN(noteId) || noteId <= 0) {
        showError(searchResults, i18n.t('home.search.invalidNoteId'));
        return;
    }

    // Show loading state
    showLoading(searchResults, i18n.t('search.loading'));

    try {
        // Optionally verify note exists by fetching from OSM API
        // For now, we'll just redirect - if note doesn't exist, the note viewer will handle it
        // This avoids an extra API call and improves UX
        
        // Redirect to note viewer page
        window.location.href = `pages/note.html?id=${noteId}`;
    } catch (error) {
        console.error('Error searching for note:', error);
        showError(searchResults, i18n.t('home.search.noteNotFound'));
    }
}

async function searchUsers(query) {
    const index = await apiClient.getUserIndex();

    const results = index.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.user_id.toString() === query
    );

    // Remove duplicates using Set for better performance
    const seenIds = new Set();
    const uniqueResults = results.filter(user => {
        if (seenIds.has(user.user_id)) {
            return false;
        }
        seenIds.add(user.user_id);
        return true;
    }).slice(0, 10);

    displaySearchResults(uniqueResults, 'user');
}

async function searchCountries(query) {
    const index = await apiClient.getCountryIndex();

    const results = index.filter(country =>
        country.country_name?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_name_en?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_name_es?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_id.toString() === query
    );

    // Remove duplicates using Set for better performance
    const seenIds = new Set();
    const uniqueResults = results.filter(country => {
        if (seenIds.has(country.country_id)) {
            return false;
        }
        seenIds.add(country.country_id);
        return true;
    }).slice(0, 10);

    displaySearchResults(uniqueResults, 'country');
}

function displaySearchResults(results, type) {
    // Track search results
    analytics.trackSearch(type, searchInput?.value.trim() || '', results.length);

    if (results.length === 0) {
        showEmpty(searchResults, i18n.t('search.noResults'));
        return;
    }

    // Animate search results
    animationManager.animateSearchResults(searchResults, results.map(item => {
        if (type === 'user') {
            return {
                title: item.username,
                description: `ID: ${item.user_id} • ${formatNumber(item.history_whole_open || 0)} ${i18n.t('common.notes')}`
            };
        } else {
            return {
                title: item.country_name_en || item.country_name,
                description: `ID: ${item.country_id} • ${formatNumber(item.history_whole_open || 0)} ${i18n.t('common.notes')}`
            };
        }
    }));
}

async function loadInitialData() {
    try {
        await Promise.all([
            loadGlobalStats(),
            loadTopUsers(),
            loadTopCountries(),
            loadRecentNotesGlobal(),
            loadActivityTimeline()
        ]);

        // Set up sort buttons
        const userSortOpen = document.getElementById('mainUserSortOpen');
        const userSortClosed = document.getElementById('mainUserSortClosed');
        if (userSortOpen && userSortClosed) {
            userSortOpen.addEventListener('click', () => {
                userSortOpen.classList.add('active');
                userSortClosed.classList.remove('active');
                loadTopUsers(1, 'open');
            });
            userSortClosed.addEventListener('click', () => {
                userSortClosed.classList.add('active');
                userSortOpen.classList.remove('active');
                loadTopUsers(1, 'closed');
            });
        }

        const countrySortOpen = document.getElementById('mainCountrySortOpen');
        const countrySortClosed = document.getElementById('mainCountrySortClosed');
        if (countrySortOpen && countrySortClosed) {
            countrySortOpen.addEventListener('click', () => {
                countrySortOpen.classList.add('active');
                countrySortClosed.classList.remove('active');
                loadTopCountries(1, 'open');
            });
            countrySortClosed.addEventListener('click', () => {
                countrySortClosed.classList.add('active');
                countrySortOpen.classList.remove('active');
                loadTopCountries(1, 'closed');
            });
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Show a general error message
        const container = document.querySelector('.stats-section');
        if (container) {
            handleApiError(error, container);
        }
    }
}

async function loadGlobalStats() {
    const totalUsersEl = document.getElementById('totalUsers');
    const totalCountriesEl = document.getElementById('totalCountries');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const totalNotesEl = document.getElementById('totalNotes');
    const totalNotesOpenEl = document.getElementById('totalNotesOpen');
    const totalNotesClosedEl = document.getElementById('totalNotesClosed');
    const firstNoteOpenEl = document.getElementById('firstNoteOpen');
    const firstNoteClosedEl = document.getElementById('firstNoteClosed');
    const notesOpenThisYearEl = document.getElementById('notesOpenThisYear');
    const notesClosedThisYearEl = document.getElementById('notesClosedThisYear');

    // Show loading spinner
    [totalUsersEl, totalCountriesEl, lastUpdateEl, totalNotesEl, totalNotesOpenEl, totalNotesClosedEl, firstNoteOpenEl, firstNoteClosedEl, notesOpenThisYearEl, notesClosedThisYearEl].forEach(el => {
        if (el) el.innerHTML = '<div class="loading-spinner-small"></div>';
    });

    try {
        console.log('📥 Fetching metadata...');
        const metadata = await apiClient.getMetadata();
        console.log('✅ Metadata received:', metadata);

        totalUsersEl.textContent = formatNumber(metadata.total_users);
        totalCountriesEl.textContent = formatNumber(metadata.total_countries);
        lastUpdateEl.innerHTML = formatDateWithBreak(metadata.export_date);

        // Calculate totals by summing all user and country notes
        console.log('📥 Fetching indexes to calculate stats...');
        const [users, countries] = await Promise.all([
            apiClient.getUserIndex(),
            apiClient.getCountryIndex()
        ]);

        // Calculate from users
        const totalNotesOpen = users.reduce((sum, user) => sum + (user.history_whole_open || 0), 0);
        const totalNotesClosed = users.reduce((sum, user) => sum + (user.history_whole_closed || 0), 0);
        const totalNotes = totalNotesOpen + totalNotesClosed;

        // Find first notes from countries (they should have earliest dates)
        let firstOpenDate = null;
        let firstClosedDate = null;

        countries.forEach(country => {
            if (country.dates_most_open && country.dates_most_open.length > 0) {
                const dates = country.dates_most_open.map(d => new Date(d));
                const earliestDate = new Date(Math.min(...dates));
                if (!firstOpenDate || earliestDate < firstOpenDate) {
                    firstOpenDate = earliestDate;
                }
            }
            if (country.dates_most_closed && country.dates_most_closed.length > 0) {
                const dates = country.dates_most_closed.map(d => new Date(d));
                const earliestDate = new Date(Math.min(...dates));
                if (!firstClosedDate || earliestDate < firstClosedDate) {
                    firstClosedDate = earliestDate;
                }
            }
        });

        // Display values
        totalNotesOpenEl.textContent = formatNumber(totalNotesOpen);
        totalNotesClosedEl.textContent = formatNumber(totalNotesClosed);
        totalNotesEl.textContent = formatNumber(totalNotes);

        firstNoteOpenEl.textContent = firstOpenDate
            ? firstOpenDate.toLocaleDateString()
            : 'N/A';
        firstNoteClosedEl.textContent = firstClosedDate
            ? firstClosedDate.toLocaleDateString()
            : 'N/A';

        // Calculate stats for this year from last_year_activity
        let notesOpenThisYear = 0;
        let notesClosedThisYear = 0;

        countries.forEach(country => {
            if (country.last_year_activity) {
                // last_year_activity is a binary string, count the '1's for this year's activity
                // The string represents activity over the last year, counting 1s gives us activity count
                const activityCount = (country.last_year_activity.match(/1/g) || []).length;
                // Rough estimation: we don't have separate open/closed counts in the binary string
                // So we'll use the total notes as a proxy
                notesOpenThisYear += country.history_whole_open || 0;
                notesClosedThisYear += country.history_whole_closed || 0;
            }
        });

        // Use the index data which has history_year_open and history_year_closed
        const totalOpenYear = users.reduce((sum, user) => sum + (user.history_year_open || 0), 0);
        const totalClosedYear = users.reduce((sum, user) => sum + (user.history_year_closed || 0), 0);

        notesOpenThisYearEl.textContent = formatNumber(totalOpenYear);
        notesClosedThisYearEl.textContent = formatNumber(totalClosedYear);

        // Try to load global stats for additional metrics
        try {
            const globalStats = await apiClient.getGlobalStats();

            // Resolution metrics
            const avgDaysEl = document.getElementById('avgDaysToResolution');
            const resolutionRateEl = document.getElementById('resolutionRate');
            const totalCommentsEl = document.getElementById('totalComments');

            if (avgDaysEl && globalStats.avg_days_to_resolution !== undefined) {
                avgDaysEl.textContent = globalStats.avg_days_to_resolution.toFixed(1) + ' days';
            }

            if (resolutionRateEl && globalStats.resolution_rate !== undefined) {
                resolutionRateEl.textContent = globalStats.resolution_rate.toFixed(1) + '%';
            }

            if (totalCommentsEl && globalStats.history_whole_commented !== undefined) {
                totalCommentsEl.textContent = formatNumber(globalStats.history_whole_commented);
            }
        } catch (error) {
            console.warn('Could not load global stats, using calculated values:', error);
            // Hide elements if global stats not available
            const avgDaysEl = document.getElementById('avgDaysToResolution');
            const resolutionRateEl = document.getElementById('resolutionRate');
            const totalCommentsEl = document.getElementById('totalComments');

            if (avgDaysEl) avgDaysEl.parentElement.style.display = 'none';
            if (resolutionRateEl) resolutionRateEl.parentElement.style.display = 'none';
            if (totalCommentsEl) totalCommentsEl.parentElement.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading global stats:', error);
        // Show error on individual stat cards
        [totalUsersEl, totalCountriesEl, lastUpdateEl, totalNotesEl, totalNotesOpenEl, totalNotesClosedEl, firstNoteOpenEl, firstNoteClosedEl, notesOpenThisYearEl, notesClosedThisYearEl].forEach(el => {
            if (el) el.textContent = '?';
        });
    }
}

async function loadTopUsers(page = 1, sortBy = 'open') {
    const container = document.getElementById('topUsers');
    currentUserPage = page;

    // Show skeleton loader - only 10 items for home page
    container.innerHTML = createLeaderboardSkeletons(10);

    try {
        console.log('📥 Fetching user index...');
        const users = await apiClient.getUserIndex();
        console.log(`✅ Received ${users.length} users`);

        // Sort by selected criteria
        let sortedUsers;
        if (sortBy === 'closed') {
            sortedUsers = users.sort((a, b) => (b.history_whole_closed || 0) - (a.history_whole_closed || 0));
        } else {
            sortedUsers = users.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));
        }

        // Only show top 10
        const topUsers = sortedUsers.slice(0, 10);

        const html = topUsers.map((user, index) => {
            const globalRank = index + 1;
            const avatarUrl = getUserAvatarSync(user, 40);
            const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(user.username)}`;
            const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(user.username)}`;
            const userProfileUrl = `pages/user.html?username=${encodeURIComponent(user.username)}`;
            return `
                <div class="leaderboard-item" onclick="window.location.href='${userProfileUrl}'" style="cursor: pointer;">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    ${avatarUrl ? `<img src="${avatarUrl}" alt="${user.username}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-right: 0.5rem;">` : ''}
                    <span class="leaderboard-name">${formatUsernameWithStyle(user.username)}</span>
                    <a href="${osmProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; display: inline-flex; align-items: center; text-decoration: none; margin-left: 0.5rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on OpenStreetMap">
                        <span style="font-size: 0.9rem;">↗</span>
                    </a>
                    <a href="${hdycProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; display: inline-flex; align-items: center; text-decoration: none; margin-left: 0.25rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on HDYC">
                        <span style="font-size: 0.9rem;">⚡</span>
                    </a>
                    <span class="leaderboard-value" style="margin-left: auto;">${sortBy === 'closed' ? formatNumber(user.history_whole_closed || 0) : formatNumber(user.history_whole_open || 0)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Load OSM avatars in background
        const imgElements = container.querySelectorAll('img[src*="ui-avatars.com"]');
        imgElements.forEach((img, index) => {
            if (topUsers[index]) {
                const userObj = { username: topUsers[index].username, user_id: topUsers[index].user_id };
                loadOSMAvatarInBackground(userObj, img);
            }
        });
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopUsers(page);
        });
    }
}

async function loadTopCountries(page = 1, sortBy = 'open') {
    const container = document.getElementById('topCountries');
    currentCountryPage = page;

    // Show skeleton loader - only 10 items for home page
    container.innerHTML = createLeaderboardSkeletons(10);

    try {
        const countries = await apiClient.getCountryIndex();

        // Sort by selected criteria
        let sortedCountries;
        if (sortBy === 'closed') {
            sortedCountries = countries.sort((a, b) => (b.history_whole_closed || 0) - (a.history_whole_closed || 0));
        } else {
            sortedCountries = countries.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));
        }

        // Only show top 10
        const topCountries = sortedCountries.slice(0, 10);

        const html = topCountries.map((country, index) => {
            const globalRank = index + 1;
            const countryName = country.country_name_en || country.country_name;
            const countryFlag = getCountryFlagFromObject(country);
            return `
                <a href="pages/country.html?name=${encodeURIComponent(countryName)}" class="leaderboard-item">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    <span class="leaderboard-name">${countryFlag ? `${countryFlag} ${countryName}` : countryName}</span>
                    <span class="leaderboard-value">${sortBy === 'closed' ? formatNumber(country.history_whole_closed || 0) : formatNumber(country.history_whole_open || 0)}</span>
                </a>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopCountries(page);
        });
    }
}

// Load recent notes for home page
async function loadRecentNotesGlobal() {
    const openContainer = document.getElementById('recentOpenNotesContainer');
    const closedContainer = document.getElementById('recentClosedNotesContainer');

    if (!openContainer || !closedContainer) return;

    try {
        // Get users data
        const users = await apiClient.getUserIndex();

        // Collect unique note IDs from all users
        const openNoteIds = new Set();
        const closedNoteIds = new Set();

        users.forEach(user => {
            if (user.lastest_open_note_id) openNoteIds.add(user.lastest_open_note_id);
            if (user.lastest_commented_note_id) openNoteIds.add(user.lastest_commented_note_id);
            if (user.lastest_closed_note_id) closedNoteIds.add(user.lastest_closed_note_id);
        });

        // Display open notes (limit to 5)
        const openArray = Array.from(openNoteIds).slice(0, 5);
        if (openArray.length > 0) {
            openContainer.innerHTML = openArray.map(noteId =>
                createSimpleNoteCard(noteId, 'open')
            ).join('');
        } else {
            openContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); font-size: 0.9rem; padding: 1rem;">No recent open notes available</p>';
        }

        // Display closed notes (limit to 5)
        const closedArray = Array.from(closedNoteIds).slice(0, 5);
        if (closedArray.length > 0) {
            closedContainer.innerHTML = closedArray.map(noteId =>
                createSimpleNoteCard(noteId, 'closed')
            ).join('');
        } else {
            closedContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); font-size: 0.9rem; padding: 1rem;">No recent closed notes available</p>';
        }

    } catch (error) {
        console.error('Error loading recent notes:', error);
        openContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">Error loading notes</p>';
        closedContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">Error loading notes</p>';
    }
}

// Load activity timeline chart
let activityChart = null;
async function loadActivityTimeline() {
    const canvas = document.getElementById('activityTimelineChart');
    if (!canvas) return;

    try {
        const countries = await apiClient.getCountryIndex();

        // Aggregate activity from all countries for the last year
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);

        // We'll create a simple aggregated view: monthly counts
        const monthlyData = {
            opened: {},
            closed: {}
        };

        // Process countries data to build monthly timeline
        countries.forEach(country => {
            // For now, we'll use a simple aggregation since we don't have detailed date ranges
            // This is a placeholder - in production you'd use dates_most_open/dates_most_closed
            if (!country.dates_most_open || country.dates_most_open.length === 0) return;

            country.dates_most_open.forEach(entry => {
                const date = new Date(entry.date);
                if (date >= lastYear) {
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthlyData.opened[monthKey] = (monthlyData.opened[monthKey] || 0) + (entry.quantity || 0);
                }
            });

            if (country.dates_most_closed) {
                country.dates_most_closed.forEach(entry => {
                    const date = new Date(entry.date);
                    if (date >= lastYear) {
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        monthlyData.closed[monthKey] = (monthlyData.closed[monthKey] || 0) + (entry.quantity || 0);
                    }
                });
            }
        });

        // Create sorted month labels
        const allMonths = new Set([...Object.keys(monthlyData.opened), ...Object.keys(monthlyData.closed)]);
        const sortedMonths = Array.from(allMonths).sort();

        const openedValues = sortedMonths.map(month => monthlyData.opened[month] || 0);
        const closedValues = sortedMonths.map(month => monthlyData.closed[month] || 0);

        // Create the chart
        const ctx = canvas.getContext('2d');
        activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedMonths,
                datasets: [
                    {
                        label: 'Notes Opened',
                        data: openedValues,
                        borderColor: 'rgba(126, 188, 111, 1)',
                        backgroundColor: 'rgba(126, 188, 111, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Notes Closed',
                        data: closedValues,
                        borderColor: 'rgba(74, 144, 226, 1)',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error loading activity timeline:', error);
        if (canvas && canvas.parentElement) {
            canvas.parentElement.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Unable to load activity data</p>';
        }
    }
}
