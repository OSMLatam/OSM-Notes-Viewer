// Explore page functionality with filters and sorting
import { apiClient } from '../api/apiClient.js';
import { formatNumber } from '../utils/formatter.js';
import { showError, showLoading, showEmpty } from '../components/errorHandler.js';
import { analytics } from '../utils/analytics.js';

// State management
let allUsers = [];
let allCountries = [];
let filteredUsers = [];
let filteredCountries = [];

// Filter and sort state
const filters = {
    users: {
        sortBy: 'most_active', // most_active, recent, alphabetical_asc, alphabetical_desc
        limit: 50
    },
    countries: {
        sortBy: 'most_active',
        limit: 50
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupEventListeners();
});

async function loadAllData() {
    await Promise.all([
        loadAllUsers(),
        loadAllCountries()
    ]);
}

async function loadAllUsers() {
    const container = document.getElementById('allUsers');
    showLoading(container, 'Loading users...');

    try {
        allUsers = await apiClient.getUserIndex();
        console.log('Loaded users:', allUsers.length);
        
        filteredUsers = [...allUsers];
        applyFiltersAndDisplay('users');
    } catch (error) {
        console.error('Error loading users:', error);
        showError(container, 'Failed to load users: ' + error.message);
    }
}

async function loadAllCountries() {
    const container = document.getElementById('allCountries');
    showLoading(container, 'Loading countries...');

    try {
        allCountries = await apiClient.getCountryIndex();
        console.log('Loaded countries:', allCountries.length);
        
        filteredCountries = [...allCountries];
        applyFiltersAndDisplay('countries');
    } catch (error) {
        console.error('Error loading countries:', error);
        showError(container, 'Failed to load countries: ' + error.message);
    }
}

function setupEventListeners() {
    // User filters
    const userSortSelect = document.getElementById('userSortSelect');
    const userLimitSelect = document.getElementById('userLimitSelect');
    
    if (userSortSelect) {
        userSortSelect.addEventListener('change', (e) => {
            filters.users.sortBy = e.target.value;
            applyFiltersAndDisplay('users');
            analytics.trackEvent('explore_filter', 'explore', `users_sort_${e.target.value}`);
        });
    }
    
    if (userLimitSelect) {
        userLimitSelect.addEventListener('change', (e) => {
            filters.users.limit = parseInt(e.target.value);
            applyFiltersAndDisplay('users');
            analytics.trackEvent('explore_filter', 'explore', `users_limit_${e.target.value}`);
        });
    }

    // Country filters
    const countrySortSelect = document.getElementById('countrySortSelect');
    const countryLimitSelect = document.getElementById('countryLimitSelect');
    
    if (countrySortSelect) {
        countrySortSelect.addEventListener('change', (e) => {
            filters.countries.sortBy = e.target.value;
            applyFiltersAndDisplay('countries');
            analytics.trackEvent('explore_filter', 'explore', `countries_sort_${e.target.value}`);
        });
    }
    
    if (countryLimitSelect) {
        countryLimitSelect.addEventListener('change', (e) => {
            filters.countries.limit = parseInt(e.target.value);
            applyFiltersAndDisplay('countries');
            analytics.trackEvent('explore_filter', 'explore', `countries_limit_${e.target.value}`);
        });
    }
}

function applyFiltersAndDisplay(type) {
    if (type === 'users') {
        const sorted = sortData(filteredUsers, filters.users.sortBy);
        const limited = sorted.slice(0, filters.users.limit);
        displayUsers(limited);
    } else if (type === 'countries') {
        const sorted = sortData(filteredCountries, filters.countries.sortBy);
        const limited = sorted.slice(0, filters.countries.limit);
        displayCountries(limited);
    }
}

function sortData(data, sortBy) {
    const sorted = [...data];
    
    switch (sortBy) {
        case 'most_active':
            return sorted.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));
        
        case 'recent':
            // Sort by last activity (if available), otherwise by user_id (higher = more recent)
            return sorted.sort((a, b) => {
                const aLast = a.last_activity || a.user_id || 0;
                const bLast = b.last_activity || b.user_id || 0;
                return bLast - aLast;
            });
        
        case 'alphabetical_asc':
            return sorted.sort((a, b) => {
                const aName = a.username || a.country_name_en || a.country_name || '';
                const bName = b.username || b.country_name_en || b.country_name || '';
                return aName.localeCompare(bName);
            });
        
        case 'alphabetical_desc':
            return sorted.sort((a, b) => {
                const aName = a.username || a.country_name_en || a.country_name || '';
                const bName = b.username || b.country_name_en || b.country_name || '';
                return bName.localeCompare(aName);
            });
        
        default:
            return sorted;
    }
}

function displayUsers(users) {
    const container = document.getElementById('allUsers');
    
    if (users.length === 0) {
        showEmpty(container, 'No users found');
        return;
    }

    const html = `
        <div class="filters-container">
            <div class="filter-group">
                <label for="userSortSelect">Sort by:</label>
                <select id="userSortSelect" class="filter-select">
                    <option value="most_active" ${filters.users.sortBy === 'most_active' ? 'selected' : ''}>Most Active</option>
                    <option value="recent" ${filters.users.sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
                    <option value="alphabetical_asc" ${filters.users.sortBy === 'alphabetical_asc' ? 'selected' : ''}>A-Z</option>
                    <option value="alphabetical_desc" ${filters.users.sortBy === 'alphabetical_desc' ? 'selected' : ''}>Z-A</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="userLimitSelect">Show:</label>
                <select id="userLimitSelect" class="filter-select">
                    <option value="25" ${filters.users.limit === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${filters.users.limit === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${filters.users.limit === 100 ? 'selected' : ''}>100</option>
                    <option value="200" ${filters.users.limit === 200 ? 'selected' : ''}>200</option>
                </select>
            </div>
            <div class="filter-info">
                Showing ${users.length} of ${allUsers.length} users
            </div>
        </div>
        <div class="explore-grid">
            ${users.map(user => `
                <div class="explore-item" onclick="window.location.href='user.html?id=${user.user_id}'">
                    <span class="explore-name">${user.username}</span>
                    <span class="explore-value">${formatNumber(user.history_whole_open || 0)} notes</span>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
    
    // Re-attach event listeners
    setupEventListeners();
}

function displayCountries(countries) {
    const container = document.getElementById('allCountries');
    
    if (countries.length === 0) {
        showEmpty(container, 'No countries found');
        return;
    }

    const html = `
        <div class="filters-container">
            <div class="filter-group">
                <label for="countrySortSelect">Sort by:</label>
                <select id="countrySortSelect" class="filter-select">
                    <option value="most_active" ${filters.countries.sortBy === 'most_active' ? 'selected' : ''}>Most Active</option>
                    <option value="recent" ${filters.countries.sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
                    <option value="alphabetical_asc" ${filters.countries.sortBy === 'alphabetical_asc' ? 'selected' : ''}>A-Z</option>
                    <option value="alphabetical_desc" ${filters.countries.sortBy === 'alphabetical_desc' ? 'selected' : ''}>Z-A</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="countryLimitSelect">Show:</label>
                <select id="countryLimitSelect" class="filter-select">
                    <option value="25" ${filters.countries.limit === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${filters.countries.limit === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${filters.countries.limit === 100 ? 'selected' : ''}>100</option>
                    <option value="200" ${filters.countries.limit === 200 ? 'selected' : ''}>200</option>
                </select>
            </div>
            <div class="filter-info">
                Showing ${countries.length} of ${allCountries.length} countries
            </div>
        </div>
        <div class="explore-grid">
            ${countries.map(country => `
                <div class="explore-item" onclick="window.location.href='country.html?id=${country.country_id}'">
                    <span class="explore-name">${country.country_name_en || country.country_name}</span>
                    <span class="explore-value">${formatNumber(country.history_whole_open || 0)} notes</span>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
    
    // Re-attach event listeners
    setupEventListeners();
}

