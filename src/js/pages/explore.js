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

    // Show always 5 pages when possible
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    let html = '<div class="pagination" style="display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0; flex-wrap: wrap;">';

    // Previous button
    if (page > 1) {
        html += `<button onclick="applyFiltersAndDisplay('${type}', ${page - 1})" class="pagination-btn" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">← Anterior</button>`;
    }

    // Always show page 1 if not in range
    if (startPage > 1) {
        html += `<button onclick="applyFiltersAndDisplay('${type}', 1)" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 0.5rem 0.25rem; color: var(--text-light);">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (i === page) {
            html += `<span style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border-radius: 4px;">${i}</span>`;
        } else {
            html += `<button onclick="applyFiltersAndDisplay('${type}', ${i})" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">${i}</button>`;
        }
    }

    // Always show last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 0.5rem 0.25rem; color: var(--text-light);">...</span>`;
        }
        html += `<button onclick="applyFiltersAndDisplay('${type}', ${totalPages})" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">${totalPages}</button>`;
    }

    // Next button
    if (page < totalPages) {
        html += `<button onclick="applyFiltersAndDisplay('${type}', ${page + 1})" class="pagination-btn" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">Siguiente →</button>`;
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
const USERS_PER_PAGE = 200;
const COUNTRIES_PER_PAGE = 200;
const MAX_USERS_PAGES = 10; // Show up to 2000 users (200 per page)
const MAX_COUNTRIES_PAGES = 10; // Show up to 2000 countries (200 per page)

// Filter and sort state
const filters = {
    users: {
        sortBy: 'notes_closed', // notes_open, notes_closed, alphabetical_asc, alphabetical_desc
        limit: MAX_USERS_PAGES
    },
    countries: {
        sortBy: 'notes_closed',
        limit: MAX_COUNTRIES_PAGES
    }
};

// Make filters available globally
window.exploreFilters = filters;

// Global functions for sort buttons
window.setUserSort = function(sortBy) {
    filters.users.sortBy = sortBy;
    applyFiltersAndDisplay('users', 1);
};

window.setCountrySort = function(sortBy) {
    filters.countries.sortBy = sortBy;
    applyFiltersAndDisplay('countries', 1);
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
    // Event listeners are now handled inline via onclick in the buttons
    // This function is kept for consistency but is essentially a no-op now
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

// Make applyFiltersAndDisplay available globally for onclick handlers
window.applyFiltersAndDisplay = applyFiltersAndDisplay;

function sortData(data, sortBy) {
    const sorted = [...data];

    switch (sortBy) {
        case 'notes_open':
            // Sort by open notes (descending)
            return sorted.sort((a, b) => (b.history_whole_open || 0) - (a.history_whole_open || 0));

        case 'notes_closed':
            // Sort by closed notes (descending)
            return sorted.sort((a, b) => (b.history_whole_closed || 0) - (a.history_whole_closed || 0));

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
            <div class="filter-group" style="display: flex; gap: 0.5rem; align-items: center;">
                <span style="font-weight: 600; color: var(--text-color);">Ordenar:</span>
                <button onclick="setUserSort('notes_open')"
                    class="filter-icon-btn ${filters.users.sortBy === 'notes_open' ? 'active' : ''}"
                    title="Notas Abiertas" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    📝 Abiertas
                </button>
                <button onclick="setUserSort('notes_closed')"
                    class="filter-icon-btn ${filters.users.sortBy === 'notes_closed' ? 'active' : ''}"
                    title="Notas Cerradas" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ✓ Cerradas
                </button>
                <button onclick="setUserSort('alphabetical_asc')"
                    class="filter-icon-btn ${filters.users.sortBy === 'alphabetical_asc' ? 'active' : ''}"
                    title="A-Z" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ↓ A-Z
                </button>
                <button onclick="setUserSort('alphabetical_desc')"
                    class="filter-icon-btn ${filters.users.sortBy === 'alphabetical_desc' ? 'active' : ''}"
                    title="Z-A" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ↑ Z-A
                </button>
            </div>
            <div class="filter-info">
                Mostrando ${users.length} de ${allUsers.length} usuarios - Página ${page} de ${totalPages}
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
                    <span class="explore-value">${filters.users.sortBy === 'notes_open'
                        ? formatNumber(user.history_whole_open || 0) + ' notas abiertas'
                        : formatNumber(user.history_whole_closed || 0) + ' notas cerradas'}</span>
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
            <div class="filter-group" style="display: flex; gap: 0.5rem; align-items: center;">
                <span style="font-weight: 600; color: var(--text-color);">Ordenar:</span>
                <button onclick="setCountrySort('notes_open')"
                    class="filter-icon-btn ${filters.countries.sortBy === 'notes_open' ? 'active' : ''}"
                    title="Notas Abiertas" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    📝 Abiertas
                </button>
                <button onclick="setCountrySort('notes_closed')"
                    class="filter-icon-btn ${filters.countries.sortBy === 'notes_closed' ? 'active' : ''}"
                    title="Notas Cerradas" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ✓ Cerradas
                </button>
                <button onclick="setCountrySort('alphabetical_asc')"
                    class="filter-icon-btn ${filters.countries.sortBy === 'alphabetical_asc' ? 'active' : ''}"
                    title="A-Z" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ↓ A-Z
                </button>
                <button onclick="setCountrySort('alphabetical_desc')"
                    class="filter-icon-btn ${filters.countries.sortBy === 'alphabetical_desc' ? 'active' : ''}"
                    title="Z-A" style="padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ↑ Z-A
                </button>
            </div>
            <div class="filter-info">
                Mostrando ${countries.length} de ${allCountries.length} regiones - Página ${page} de ${totalPages}
            </div>
        </div>
        ${createPagination(page, totalPages, (p) => applyFiltersAndDisplay('countries', p), 'countries')}
        <div class="explore-grid">
            ${countries.map(country => {
                const countryName = country.country_name_en || country.country_name;
                const countryFlag = getCountryFlagFromObject(country);
                return `
                <div class="explore-item" onclick="window.location.href='country.html?id=${country.country_id}'">
                    <div style="display: flex; align-items: center; gap: 0.75rem; min-height: 32px;">
                        <span class="explore-name">${countryFlag ? `${countryFlag} ` : ''}${countryName}</span>
                    </div>
                    <span class="explore-value">${filters.countries.sortBy === 'notes_open'
                        ? formatNumber(country.history_whole_open || 0) + ' notas abiertas'
                        : formatNumber(country.history_whole_closed || 0) + ' notas cerradas'}</span>
                </div>
            `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Re-attach event listeners
    setupEventListeners();
}

