// Main application script
import { apiClient } from './api/apiClient.js';
import { formatNumber, formatDate } from './utils/formatter.js';

// DOM Elements
let searchInput, searchBtn, searchResults;
let currentSearchType = 'users';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    loadInitialData();
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

    // Search
    searchBtn?.addEventListener('click', performSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
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

    // Clear results
    if (searchResults) {
        searchResults.innerHTML = '';
    }
}

async function performSearch() {
    const query = searchInput?.value.trim();
    if (!query) return;

    searchResults.innerHTML = '<p class="loading">Searching...</p>';

    try {
        if (currentSearchType === 'users') {
            await searchUsers(query);
        } else {
            await searchCountries(query);
        }
    } catch (error) {
        searchResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
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
        searchResults.innerHTML = '<p>No results found</p>';
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
    }
}

async function loadGlobalStats() {
    try {
        const metadata = await apiClient.getMetadata();

        document.getElementById('totalUsers').textContent = formatNumber(metadata.total_users);
        document.getElementById('totalCountries').textContent = formatNumber(metadata.total_countries);
        document.getElementById('lastUpdate').textContent = formatDate(metadata.export_date);

        // Total notes would come from summing user data if available
        document.getElementById('totalNotes').textContent = '~';
    } catch (error) {
        console.error('Error loading global stats:', error);
    }
}

async function loadTopUsers() {
    const container = document.getElementById('topUsers');

    try {
        const users = await apiClient.getUserIndex();

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
        container.innerHTML = '<p class="error">Failed to load top users</p>';
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
        container.innerHTML = '<p class="error">Failed to load top countries</p>';
    }
}
