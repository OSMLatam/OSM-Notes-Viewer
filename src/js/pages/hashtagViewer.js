/**
 * Hashtag Viewer Page
 * Displays all notes with a specific hashtag
 */

import { formatDate } from '../utils/formatter.js';
import { showError, showLoading, showEmpty } from '../components/errorHandler.js';
import { renderPagination } from '../components/pagination.js';
import { apiClient } from '../api/apiClient.js';
import { i18n } from '../utils/i18n.js';
import { prefetchNote, prefetchNextPage } from '../utils/prefetch.js';

// Get hashtag from URL
const urlParams = new URLSearchParams(window.location.search);
const hashtagParam = urlParams.get('tag');
const pageParam = urlParams.get('page');

// State
let currentHashtag = '';
let currentPage = pageParam ? parseInt(pageParam, 10) : 1;
let currentLimit = 20;
let currentFilters = {
  status: urlParams.get('status') || '',
  date_from: urlParams.get('date_from') || '',
  date_to: urlParams.get('date_to') || '',
};
let paginationData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n
  await i18n.init();

  // Listen for language changes
  window.addEventListener('languageChanged', async () => {
    // Re-render content with new translations
    const hashtagStats = document.getElementById('hashtagStats');
    if (hashtagStats && hashtagStats.innerHTML) {
      i18n.updatePageContent();
      // Re-translate filter options
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) {
        const options = statusFilter.querySelectorAll('option');
        options.forEach((option) => {
          const value = option.value;
          if (value === '') {
            option.textContent = i18n.t('hashtag.filters.statusAll');
          } else {
            const statusKey = `hashtag.filters.status${value.charAt(0).toUpperCase() + value.slice(1)}`;
            option.textContent = i18n.t(statusKey) || option.textContent;
          }
        });
      }
    }
  });

  if (!hashtagParam) {
    showError(document.getElementById('hashtagError'), 'No hashtag provided');
    document.getElementById('hashtagLoading').style.display = 'none';
    return;
  }

  // Clean hashtag (remove # if present)
  currentHashtag = hashtagParam.replace(/^#/, '').toLowerCase();

  try {
    await loadHashtagData();
    await loadHashtagNotes();
    setupFilters();
  } catch (error) {
    console.error('Error loading hashtag:', error);
    showError(document.getElementById('hashtagError'), `Failed to load hashtag: ${error.message}`);
    document.getElementById('hashtagLoading').style.display = 'none';
  }
});

/**
 * Load hashtag details from API
 */
async function loadHashtagData() {
  const loading = document.getElementById('hashtagLoading');
  const error = document.getElementById('hashtagError');
  const content = document.getElementById('hashtagContent');

  try {
    loading.style.display = 'block';
    error.style.display = 'none';
    content.style.display = 'none';

    // Get hashtag details from API
    const apiBaseUrl = import.meta.env.PROD ? 'https://notes-api.osm.lat' : 'http://localhost:3000';

    const hashtagUrl = `${apiBaseUrl}/api/v1/hashtags/${encodeURIComponent(currentHashtag)}`;
    const response = await fetch(hashtagUrl, {
      headers: {
        'User-Agent': 'OSM-Notes-Viewer/1.0 (https://notes.osm.lat)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Hashtag not found');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Hide loading, show content
    loading.style.display = 'none';
    content.style.display = 'block';

    // Render hashtag header
    renderHashtagHeader(data);

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      pageTitle.textContent = `#${currentHashtag} - ${i18n.t('title.hashtag')}`;
    }
  } catch (error) {
    console.error('Error in loadHashtagData:', error);
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = error.message || 'Failed to load hashtag data';
    throw error;
  }
}

/**
 * Render hashtag header with stats
 * @param {Object} hashtagData - Hashtag details from API
 */
function renderHashtagHeader(hashtagData) {
  const hashtagBadge = document.getElementById('hashtagBadge');
  const hashtagStats = document.getElementById('hashtagStats');

  if (hashtagBadge) {
    hashtagBadge.textContent = `#${currentHashtag}`;
  }

  if (hashtagStats) {
    const usersCount = hashtagData.users_count || 0;
    const countriesCount = hashtagData.countries_count || 0;

    hashtagStats.innerHTML = `
            <div class="hashtag-stat-item">
                <span class="hashtag-stat-label" data-i18n="hashtag.stats.users">Users:</span>
                <span class="hashtag-stat-value">${usersCount}</span>
            </div>
            <div class="hashtag-stat-item">
                <span class="hashtag-stat-label" data-i18n="hashtag.stats.countries">Countries:</span>
                <span class="hashtag-stat-value">${countriesCount}</span>
            </div>
        `;
    // Apply i18n to newly added elements
    i18n.updatePageContent();
  }
}

/**
 * Load notes with hashtag from API
 */
async function loadHashtagNotes() {
  const notesList = document.getElementById('notesList');
  const paginationContainer = document.getElementById('notesPagination');

  if (!notesList) return;

  try {
    showLoading(notesList, 'Loading notes...');

    // Build search query - use text parameter to search for hashtag in comments
    const apiBaseUrl = import.meta.env.PROD ? 'https://notes-api.osm.lat' : 'http://localhost:3000';

    const searchParams = new URLSearchParams({
      text: `#${currentHashtag}`, // Search for hashtag in comments
      page: currentPage.toString(),
      limit: currentLimit.toString(),
    });

    // Add filters
    if (currentFilters.status) {
      searchParams.append('status', currentFilters.status);
    }
    if (currentFilters.date_from) {
      searchParams.append('date_from', currentFilters.date_from);
    }
    if (currentFilters.date_to) {
      searchParams.append('date_to', currentFilters.date_to);
    }

    const notesUrl = `${apiBaseUrl}/api/v1/notes?${searchParams.toString()}`;
    const response = await fetch(notesUrl, {
      headers: {
        'User-Agent': 'OSM-Notes-Viewer/1.0 (https://notes.osm.lat)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse = await response.json();
    const notes = apiResponse.data || [];
    paginationData = apiResponse.pagination || null;

    if (notes.length === 0) {
      showEmpty(notesList, i18n.t('hashtag.notes.empty'));
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
      return;
    }

    // Render notes
    renderNotesList(notes);

    // Prefetch next page if available
    if (paginationData && paginationData.page < paginationData.total_pages) {
      const nextPage = paginationData.page + 1;
      const searchParams = new URLSearchParams({
        text: `#${currentHashtag}`,
        page: nextPage.toString(),
        limit: currentLimit.toString(),
      });
      if (currentFilters.status) searchParams.append('status', currentFilters.status);
      if (currentFilters.date_from) searchParams.append('date_from', currentFilters.date_from);
      if (currentFilters.date_to) searchParams.append('date_to', currentFilters.date_to);

      const apiBaseUrl = import.meta.env.PROD
        ? 'https://notes-api.osm.lat'
        : 'http://localhost:3000';
      const nextPageUrl = `${apiBaseUrl}/api/v1/notes?${searchParams.toString()}`;
      prefetchNextPage(nextPageUrl, 2);
    }

    // Render pagination
    if (paginationContainer && paginationData) {
      renderNotesPagination();
    }
  } catch (error) {
    console.error('Error loading notes:', error);
    showError(notesList, `Failed to load notes: ${error.message}`);
  }
}

/**
 * Render list of notes
 * @param {Array<Object>} notes - Array of note objects
 */
async function renderNotesList(notes) {
  const notesList = document.getElementById('notesList');
  if (!notesList) return;

  // Get country index for country names
  let countriesIndex = [];
  try {
    countriesIndex = await apiClient.getCountryIndex();
  } catch (error) {
    console.error('Error loading country index:', error);
  }

  const notesHtml = notes
    .map((note) => {
      const createdDate = note.created_at ? new Date(note.created_at) : null;
      const closedDate = note.closed_at ? new Date(note.closed_at) : null;

      // Find country name
      let countryName = null;
      let countryLink = '';
      if (note.id_country && countriesIndex.length > 0) {
        const country = countriesIndex.find((c) => c.country_id === note.id_country);
        if (country) {
          countryName = country.country_name_en || country.country_name;
          countryLink = `<a href="country.html?id=${country.country_id}" class="note-card-country">${escapeHtml(countryName)}</a>`;
        }
      }

      return `
            <article class="note-card-item" role="listitem" tabindex="0"
                     onclick="window.location.href='note.html?id=${note.note_id}'"
                     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location.href='note.html?id=${note.note_id}'}"
                     aria-label="Note ${note.note_id}, status: ${note.status}">
                <div class="note-card-header">
                    <a href="note.html?id=${note.note_id}" class="note-card-id" onclick="event.stopPropagation()" aria-label="View note ${note.note_id}">
                        ${i18n.t('common.note')} #${note.note_id}
                    </a>
                    <span class="note-card-status ${note.status}" role="status" aria-label="Note status: ${note.status}">${i18n.t(`note.status.${note.status}`) || note.status}</span>
                </div>
                <div class="note-card-meta">
                    ${
                      createdDate
                        ? `
                        <div class="note-card-meta-item">
                            <span>📅</span>
                            <span>${i18n.t('note.action.created')}: ${formatDate(createdDate)}</span>
                        </div>
                    `
                        : ''
                    }
                    ${
                      closedDate
                        ? `
                        <div class="note-card-meta-item">
                            <span>🔒</span>
                            <span>${i18n.t('note.action.closed')}: ${formatDate(closedDate)}</span>
                        </div>
                    `
                        : ''
                    }
                    ${
                      note.comments_count
                        ? `
                        <div class="note-card-meta-item">
                            <span>💬</span>
                            <span>${note.comments_count} ${note.comments_count === 1 ? i18n.t('common.comment') : i18n.t('common.comments')}</span>
                        </div>
                    `
                        : ''
                    }
                    ${
                      countryLink
                        ? `
                        <div class="note-card-meta-item">
                            <span>🌍</span>
                            <span>${countryLink}</span>
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `;
    })
    .join('');

  notesList.innerHTML = notesHtml;

  // Prefetch notes in the list (low priority, non-blocking)
  notes.slice(0, 5).forEach((note) => {
    if (note.note_id) {
      prefetchNote(note.note_id, 1);
    }
  });
}

/**
 * Render pagination controls
 */
function renderNotesPagination() {
  const paginationContainer = document.getElementById('notesPagination');
  if (!paginationContainer || !paginationData) return;

  const { page, total_pages, total } = paginationData;

  if (total_pages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `
        <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">
            ← ${i18n.t('hashtag.pagination.previous')}
        </button>
    `;

  // Page numbers
  const maxPagesToShow = 7;
  let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(total_pages, startPage + maxPagesToShow - 1);

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  if (startPage > 1) {
    html += `<button class="pagination-btn" data-page="1">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-info">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
            <button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
  }

  if (endPage < total_pages) {
    if (endPage < total_pages - 1) {
      html += `<span class="pagination-info">...</span>`;
    }
    html += `<button class="pagination-btn" data-page="${total_pages}">${total_pages}</button>`;
  }

  // Next button
  html += `
        <button class="pagination-btn" ${page === total_pages ? 'disabled' : ''} data-page="${page + 1}">
            ${i18n.t('hashtag.pagination.next')} →
        </button>
    `;

  // Pagination info
  const start = (page - 1) * currentLimit + 1;
  const end = Math.min(page * currentLimit, total);
  html += `
        <div class="pagination-info">
            ${i18n.t('hashtag.pagination.showing', { start, end, total })}
        </div>
    `;

  paginationContainer.innerHTML = html;

  // Add event listeners
  paginationContainer.querySelectorAll('.pagination-btn:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPage = parseInt(btn.dataset.page, 10);
      if (newPage !== page && newPage >= 1 && newPage <= total_pages) {
        currentPage = newPage;
        loadHashtagNotes();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

/**
 * Setup filter controls
 */
function setupFilters() {
  const statusFilter = document.getElementById('statusFilter');
  const dateFromFilter = document.getElementById('dateFromFilter');
  const dateToFilter = document.getElementById('dateToFilter');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  // Load saved filters from URL
  const urlStatus = urlParams.get('status');
  const urlDateFrom = urlParams.get('date_from');
  const urlDateTo = urlParams.get('date_to');

  if (urlStatus && statusFilter) {
    statusFilter.value = urlStatus;
    currentFilters.status = urlStatus;
  }
  if (urlDateFrom && dateFromFilter) {
    dateFromFilter.value = urlDateFrom;
    currentFilters.date_from = urlDateFrom;
  }
  if (urlDateTo && dateToFilter) {
    dateToFilter.value = urlDateTo;
    currentFilters.date_to = urlDateTo;
  }

  // Translate select options dynamically
  if (statusFilter) {
    const options = statusFilter.querySelectorAll('option');
    options.forEach((option) => {
      const value = option.value;
      if (value === '') {
        option.textContent = i18n.t('hashtag.filters.statusAll');
      } else {
        const statusKey = `hashtag.filters.status${value.charAt(0).toUpperCase() + value.slice(1)}`;
        option.textContent = i18n.t(statusKey) || option.textContent;
      }
    });
  }

  // Apply filters button
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      currentFilters.status = statusFilter?.value || '';
      currentFilters.date_from = dateFromFilter?.value || '';
      currentFilters.date_to = dateToFilter?.value || '';
      currentPage = 1; // Reset to first page
      loadHashtagNotes();
      updateUrl();
    });
  }

  // Clear filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (statusFilter) statusFilter.value = '';
      if (dateFromFilter) dateFromFilter.value = '';
      if (dateToFilter) dateToFilter.value = '';
      currentFilters = {
        status: '',
        date_from: '',
        date_to: '',
      };
      currentPage = 1;
      loadHashtagNotes();
      updateUrl();
    });
  }
}

/**
 * Update URL with current filters
 */
function updateUrl() {
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('tag', currentHashtag);

  if (currentFilters.status) {
    newUrl.searchParams.set('status', currentFilters.status);
  } else {
    newUrl.searchParams.delete('status');
  }

  if (currentFilters.date_from) {
    newUrl.searchParams.set('date_from', currentFilters.date_from);
  } else {
    newUrl.searchParams.delete('date_from');
  }

  if (currentFilters.date_to) {
    newUrl.searchParams.set('date_to', currentFilters.date_to);
  } else {
    newUrl.searchParams.delete('date_to');
  }

  if (currentPage > 1) {
    newUrl.searchParams.set('page', currentPage.toString());
  } else {
    newUrl.searchParams.delete('page');
  }

  window.history.replaceState({}, '', newUrl);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
