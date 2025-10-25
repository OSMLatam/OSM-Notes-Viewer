// Main application script
import { apiClient } from './api/apiClient.js';
import { formatNumber, formatDate } from './utils/formatter.js';
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
import { getUserAvatarSync } from './utils/userAvatar.js';

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

    renderItem(item, index) {
        if (currentSearchType === 'users') {
            const avatarUrl = getUserAvatarSync(item, 40);
            const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(item.username)}`;
            const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(item.username)}`;
            return `
                <div class="search-result-item">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${item.username}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
                        <strong>${this.highlightMatch(item.username, this.input.value)}</strong>
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
                switchTab(e.target.dataset.tab);
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
                searchInput.placeholder = currentSearchType === 'users'
                    ? i18n.t('home.search.placeholderUsers')
                    : i18n.t('home.search.placeholderCountries');
            }
        });
        window.hasLanguageListener = true;
    }
}

function switchTab(tab) {
    currentSearchType = tab;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update placeholder
    if (searchInput) {
        searchInput.placeholder = tab === 'users'
            ? i18n.t('home.search.placeholderUsers')
            : i18n.t('home.search.placeholderCountries');

        // Clear input and hide results when switching tabs
        searchInput.value = '';
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
        window.location.href = `pages/country.html?id=${item.country_id}`;
    }
}

async function performSearch() {
    const query = searchInput?.value.trim();
    if (!query) return;

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
            loadTopCountries()
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

    // Show loading spinner
    [totalUsersEl, totalCountriesEl, lastUpdateEl, totalNotesEl].forEach(el => {
        el.innerHTML = '<div class="loading-spinner-small"></div>';
    });

    try {
        console.log('📥 Fetching metadata...');
        const metadata = await apiClient.getMetadata();
        console.log('✅ Metadata received:', metadata);

        totalUsersEl.textContent = formatNumber(metadata.total_users);
        totalCountriesEl.textContent = formatNumber(metadata.total_countries);
        lastUpdateEl.textContent = formatDate(metadata.export_date);

        // Calculate total notes by summing all user notes
        console.log('📥 Fetching user index to calculate total notes...');
        const users = await apiClient.getUserIndex();
        const totalNotes = users.reduce((sum, user) => sum + (user.history_whole_open || 0), 0);
        totalNotesEl.textContent = formatNumber(totalNotes);
    } catch (error) {
        console.error('Error loading global stats:', error);
        // Show error on individual stat cards
        totalUsersEl.textContent = '?';
        totalCountriesEl.textContent = '?';
        lastUpdateEl.textContent = '?';
        totalNotesEl.textContent = '?';
    }
}

async function loadTopUsers(page = 1, sortBy = 'open') {
    const container = document.getElementById('topUsers');
    currentUserPage = page;

    // Show skeleton loader
    container.innerHTML = createLeaderboardSkeletons(ITEMS_PER_PAGE);

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

        // Calculate pagination
        const pagination = getPaginationInfo(sortedUsers.length, ITEMS_PER_PAGE, page);
        const topUsers = sortedUsers.slice(pagination.startIndex, pagination.endIndex);

        const html = topUsers.map((user, index) => {
            const globalRank = pagination.startIndex + index + 1;
            const avatarUrl = getUserAvatarSync(user, 40);
            const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(user.username)}`;
            const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(user.username)}`;
            const userProfileUrl = `pages/user.html?username=${encodeURIComponent(user.username)}`;
            return `
                <div class="leaderboard-item" onclick="window.location.href='${userProfileUrl}'" style="cursor: pointer;">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    ${avatarUrl ? `<img src="${avatarUrl}" alt="${user.username}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-right: 0.5rem;">` : ''}
                    <span class="leaderboard-name">${user.username}</span>
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

        // Add pagination if needed
        const paginationContainer = document.getElementById('topUsersPagination');
        if (paginationContainer) {
            renderPagination(paginationContainer, page, pagination.totalPages, (pageNum) => loadTopUsers(pageNum, sortBy), 'users');
        }
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopUsers(page);
        });
    }
}

async function loadTopCountries(page = 1, sortBy = 'open') {
    const container = document.getElementById('topCountries');
    currentCountryPage = page;

    // Show skeleton loader
    container.innerHTML = createLeaderboardSkeletons(ITEMS_PER_PAGE);

    try {
        const countries = await apiClient.getCountryIndex();

        // Sort by selected criteria
        let sortedCountries;
        if (sortBy === 'closed') {
            sortedCountries = countries.sort((a, b) => (b.history_whole_closed || 0) - (a.history_whole_closed || 0));
        } else {
            sortedCountries = countries.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));
        }

        // Calculate pagination
        const pagination = getPaginationInfo(sortedCountries.length, ITEMS_PER_PAGE, page);
        const topCountries = sortedCountries.slice(pagination.startIndex, pagination.endIndex);

        const html = topCountries.map((country, index) => {
            const globalRank = pagination.startIndex + index + 1;
            const countryName = country.country_name_en || country.country_name;
            const countryFlag = getCountryFlagFromObject(country);
            return `
                <a href="pages/country.html?id=${country.country_id}" class="leaderboard-item">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    <span class="leaderboard-name">${countryFlag ? `${countryFlag} ${countryName}` : countryName}</span>
                    <span class="leaderboard-value">${sortBy === 'closed' ? formatNumber(country.history_whole_closed || 0) : formatNumber(country.history_whole_open || 0)}</span>
                </a>
            `;
        }).join('');

        container.innerHTML = html;

        // Add pagination if needed
        const paginationContainer = document.getElementById('topCountriesPagination');
        if (paginationContainer) {
            renderPagination(paginationContainer, page, pagination.totalPages, (pageNum) => loadTopCountries(pageNum, sortBy), 'countries');
        }
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopCountries(page);
        });
    }
}
