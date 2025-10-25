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
            return `
                <div class="search-result-item">
                    <strong>${this.highlightMatch(item.username, this.input.value)}</strong>
                    <span class="text-light">ID: ${item.user_id}</span>
                </div>
            `;
        } else {
            return `
                <div class="search-result-item">
                    <strong>${this.highlightMatch(item.country_name_en || item.country_name, this.input.value)}</strong>
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

// Pagination state
let currentUserPage = 1;
let currentCountryPage = 1;
const ITEMS_PER_PAGE = 10;

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
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Setup autocomplete search
    if (searchInput && searchResults) {
        searchComponent = new UserSearchComponent(searchInput, searchResults, handleSearchSelect);
    }

    // Search button
    searchBtn?.addEventListener('click', performSearch);

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
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
            ? i18n.t('home.search.placeholder')
            : i18n.t('home.search.placeholder');
    }

    // Update search component data
    updateSearchData();

    // Clear results
    if (searchResults) {
        searchResults.innerHTML = '';
    }
}

async function updateSearchData() {
    if (!searchComponent) return;

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
    }
}

function handleSearchSelect(item) {
    // Track profile navigation
    if (currentSearchType === 'users') {
        analytics.trackProfileView('user', item.user_id);
        window.location.href = `pages/user.html?id=${item.user_id}`;
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
    ).slice(0, 10);

    displaySearchResults(results, 'user');
}

async function searchCountries(query) {
    const index = await apiClient.getCountryIndex();

    const results = index.filter(country =>
        country.country_name?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_name_en?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_name_es?.toLowerCase().includes(query.toLowerCase()) ||
        country.country_id.toString() === query
    ).slice(0, 10);

    displaySearchResults(results, 'country');
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

        // Total ${i18n.t('common.notes')} would come from summing user data if available
        totalNotesEl.textContent = '~';
    } catch (error) {
        console.error('Error loading global stats:', error);
        // Show error on individual stat cards
        totalUsersEl.textContent = '?';
        totalCountriesEl.textContent = '?';
        lastUpdateEl.textContent = '?';
        totalNotesEl.textContent = '?';
    }
}

async function loadTopUsers(page = 1) {
    const container = document.getElementById('topUsers');
    currentUserPage = page;

    // Show skeleton loader
    container.innerHTML = createLeaderboardSkeletons(ITEMS_PER_PAGE);

    try {
        console.log('📥 Fetching user index...');
        const users = await apiClient.getUserIndex();
        console.log(`✅ Received ${users.length} users`);

        // Sort by ${i18n.t('common.notes')} opened
        const sortedUsers = users.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));

        // Calculate pagination
        const pagination = getPaginationInfo(sortedUsers.length, ITEMS_PER_PAGE, page);
        const topUsers = sortedUsers.slice(pagination.startIndex, pagination.endIndex);

        const html = topUsers.map((user, index) => {
            const globalRank = pagination.startIndex + index + 1;
            return `
                <div class="leaderboard-item" onclick="window.location.href='pages/user.html?id=${user.user_id}'">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    <span class="leaderboard-name">${user.username}</span>
                    <span class="leaderboard-value">${formatNumber(user.history_whole_open || 0)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Add pagination if needed
        const paginationContainer = document.getElementById('topUsersPagination');
        if (paginationContainer) {
            renderPagination(paginationContainer, page, pagination.totalPages, loadTopUsers, 'users');
        }
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopUsers(page);
        });
    }
}

async function loadTopCountries(page = 1) {
    const container = document.getElementById('topCountries');
    currentCountryPage = page;

    // Show skeleton loader
    container.innerHTML = createLeaderboardSkeletons(ITEMS_PER_PAGE);

    try {
        const countries = await apiClient.getCountryIndex();

        // Sort by ${i18n.t('common.notes')} opened
        const sortedCountries = countries.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));

        // Calculate pagination
        const pagination = getPaginationInfo(sortedCountries.length, ITEMS_PER_PAGE, page);
        const topCountries = sortedCountries.slice(pagination.startIndex, pagination.endIndex);

        const html = topCountries.map((country, index) => {
            const globalRank = pagination.startIndex + index + 1;
            return `
                <div class="leaderboard-item" onclick="window.location.href='pages/country.html?id=${country.country_id}'">
                    <span class="leaderboard-rank">#${globalRank}</span>
                    <span class="leaderboard-name">${country.country_name_en || country.country_name}</span>
                    <span class="leaderboard-value">${formatNumber(country.history_whole_open || 0)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Add pagination if needed
        const paginationContainer = document.getElementById('topCountriesPagination');
        if (paginationContainer) {
            renderPagination(paginationContainer, page, pagination.totalPages, loadTopCountries, 'countries');
        }
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopCountries(page);
        });
    }
}
