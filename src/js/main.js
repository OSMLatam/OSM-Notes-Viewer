// Main application script
import { apiClient } from './api/apiClient.js';
import { formatNumber, formatDate } from './utils/formatter.js';
import { showError, showLoading, showEmpty, handleApiError } from './components/errorHandler.js';
import { SearchComponent } from './components/search.js';

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

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App initializing...');
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
            ? 'Search by username or user ID...'
            : 'Search by country name or ID...';
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
    if (currentSearchType === 'users') {
        window.location.href = `pages/user.html?id=${item.user_id}`;
    } else {
        window.location.href = `pages/country.html?id=${item.country_id}`;
    }
}

async function performSearch() {
    const query = searchInput?.value.trim();
    if (!query) return;

    showLoading(searchResults, 'Searching...');

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
    if (results.length === 0) {
        showEmpty(searchResults, 'No results found');
        return;
    }

    const html = results.map(item => {
        if (type === 'user') {
            return `
                <div class="leaderboard-item" onclick="window.location.href='pages/user.html?id=${item.user_id}'">
                    <span class="leaderboard-name">${item.username}</span>
                    <span class="leaderboard-value">${formatNumber(item.history_whole_open || 0)} notes</span>
                </div>
            `;
        } else {
            return `
                <div class="leaderboard-item" onclick="window.location.href='pages/country.html?id=${item.country_id}'">
                    <span class="leaderboard-name">${item.country_name_en || item.country_name}</span>
                    <span class="leaderboard-value">${formatNumber(item.history_whole_open || 0)} notes</span>
                </div>
            `;
        }
    }).join('');

    searchResults.innerHTML = html;
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

    try {
        console.log('📥 Fetching metadata...');
        const metadata = await apiClient.getMetadata();
        console.log('✅ Metadata received:', metadata);

        totalUsersEl.textContent = formatNumber(metadata.total_users);
        totalCountriesEl.textContent = formatNumber(metadata.total_countries);
        lastUpdateEl.textContent = formatDate(metadata.export_date);

        // Total notes would come from summing user data if available
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

async function loadTopUsers() {
    const container = document.getElementById('topUsers');

    try {
        console.log('📥 Fetching user index...');
        const users = await apiClient.getUserIndex();
        console.log(`✅ Received ${users.length} users`);

        // Sort by notes opened
        const topUsers = users
            .sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0))
            .slice(0, 10);

        const html = topUsers.map((user, index) => `
            <div class="leaderboard-item" onclick="window.location.href='pages/user.html?id=${user.user_id}'">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${user.username}</span>
                <span class="leaderboard-value">${formatNumber(user.history_whole_open || 0)}</span>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopUsers();
        });
    }
}

async function loadTopCountries() {
    const container = document.getElementById('topCountries');

    try {
        const countries = await apiClient.getCountryIndex();

        // Sort by notes opened
        const topCountries = countries
            .sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0))
            .slice(0, 10);

        const html = topCountries.map((country, index) => `
            <div class="leaderboard-item" onclick="window.location.href='pages/country.html?id=${country.country_id}'">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${country.country_name_en || country.country_name}</span>
                <span class="leaderboard-value">${formatNumber(country.history_whole_open || 0)}</span>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (error) {
        handleApiError(error, container, () => {
            loadTopCountries();
        });
    }
}
