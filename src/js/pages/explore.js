// Explore page functionality with filters and sorting
import { apiClient } from '../api/apiClient.js';
import { formatNumber } from '../utils/formatter.js';
import { showError, showLoading, showEmpty } from '../components/errorHandler.js';
import { analytics } from '../utils/analytics.js';
import { getCountryFlagFromObject } from '../utils/countryFlags.js';
import { getUserAvatarSync } from '../utils/userAvatar.js';

// Import pagination function from main.js
function createPagination(page, totalPages, onPageChange, type) {
    if (totalPages <= 1) return '';

    let html = '<div class="pagination" style="display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0;">';

    if (page > 1) {
        html += `<button onclick="applyFiltersAndDisplay('${type}', ${page - 1})" class="pagination-btn" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer;">← Previous</button>`;
    }

    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        if (i === page) {
            html += `<span style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border-radius: 4px;">${i}</span>`;
        } else {
            html += `<button onclick="applyFiltersAndDisplay('${type}', ${i})" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">${i}</button>`;
        }
    }

    if (page < totalPages) {
        html += `<button onclick="applyFiltersAndDisplay('${type}', ${page + 1})" class="pagination-btn" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer;">Next →</button>`;
    }

    html += '</div>';
    return html;
}

// State management
let allUsers = [];
let allCountries = [];
let filteredUsers = [];
let filteredCountries = [];

// Pagination state
let currentUsersPage = 1;
let currentCountriesPage = 1;
const USERS_PER_PAGE = 20;
const COUNTRIES_PER_PAGE = 50;
const MAX_USERS_PAGES = 10; // Show up to 200 users (20 per page)
const MAX_COUNTRIES_PAGES = 20; // Show up to 1000 countries (50 per page)

// Filter and sort state
const filters = {
    users: {
        sortBy: 'most_active', // most_active, recent, alphabetical_asc, alphabetical_desc
        limit: MAX_USERS_PAGES
    },
    countries: {
        sortBy: 'most_active',
        limit: MAX_COUNTRIES_PAGES
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

function applyFiltersAndDisplay(type, page = 1) {
    if (type === 'users') {
        currentUsersPage = page;
        const sorted = sortData(filteredUsers, filters.users.sortBy);
        const totalPages = Math.min(MAX_USERS_PAGES, Math.ceil(sorted.length / USERS_PER_PAGE));
        const startIndex = (page - 1) * USERS_PER_PAGE;
        const endIndex = startIndex + USERS_PER_PAGE;
        const limited = sorted.slice(startIndex, endIndex);
        displayUsers(limited, page, totalPages);
    } else if (type === 'countries') {
        currentCountriesPage = page;
        const sorted = sortData(filteredCountries, filters.countries.sortBy);
        const totalPages = Math.min(MAX_COUNTRIES_PAGES, Math.ceil(sorted.length / COUNTRIES_PER_PAGE));
        const startIndex = (page - 1) * COUNTRIES_PER_PAGE;
        const endIndex = startIndex + COUNTRIES_PER_PAGE;
        const limited = sorted.slice(startIndex, endIndex);
        displayCountries(limited, page, totalPages);
    }
}

function sortData(data, sortBy) {
    const sorted = [...data];

    switch (sortBy) {
        case 'most_active':
            // Sort by closed notes (most active = most notes closed)
            return sorted.sort((a, b) => (b.history_whole_closed || 0) - (a.history_whole_closed || 0));

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

function displayUsers(users, page = 1, totalPages = 1) {
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
            <div class="filter-info">
                Showing ${users.length} of ${allUsers.length} users - Page ${page} of ${totalPages}
            </div>
        </div>
        ${createPagination(page, totalPages, (p) => applyFiltersAndDisplay('users', p), 'users')}
        <div class="explore-grid">
            ${users.map(user => {
                const avatarUrl = getUserAvatarSync(user, 40);
                const osmProfileUrl = `https://www.openstreetmap.org/user/${encodeURIComponent(user.username)}`;
                const hdycProfileUrl = `https://hdyc.neis-one.org/?${encodeURIComponent(user.username)}`;
                const userProfileUrl = `user.html?username=${encodeURIComponent(user.username)}`;
                return `
                <div class="explore-item" onclick="window.location.href='${userProfileUrl}'">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${user.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : ''}
                        <span class="explore-name">${user.username}</span>
                        <a href="${osmProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; text-decoration: none;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on OpenStreetMap">
                            <span style="font-size: 0.9rem;">↗</span>
                        </a>
                        <a href="${hdycProfileUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="opacity: 0.6; transition: opacity 0.2s; text-decoration: none;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="View on HDYC">
                            <span style="font-size: 0.9rem;">⚡</span>
                        </a>
                    </div>
                    <span class="explore-value">${formatNumber(user.history_whole_closed || 0)} notes closed</span>
                </div>
            `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Re-attach event listeners
    setupEventListeners();
}

function displayCountries(countries, page = 1, totalPages = 1) {
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
            <div class="filter-info">
                Showing ${countries.length} of ${allCountries.length} countries - Page ${page} of ${totalPages}
            </div>
        </div>
        ${createPagination(page, totalPages, (p) => applyFiltersAndDisplay('countries', p), 'countries')}
        <div class="explore-grid">
            ${countries.map(country => {
                const countryName = country.country_name_en || country.country_name;
                const countryFlag = getCountryFlagFromObject(country);
                return `
                <div class="explore-item" onclick="window.location.href='country.html?id=${country.country_id}'">
                    <span class="explore-name">${countryFlag ? `${countryFlag} ` : ''}${countryName}</span>
                    <span class="explore-value">${formatNumber(country.history_whole_closed || 0)} notes closed</span>
                </div>
            `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Re-attach event listeners
    setupEventListeners();
}

