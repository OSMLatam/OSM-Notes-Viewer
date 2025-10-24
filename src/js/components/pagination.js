// Pagination component for handling large lists

/**
 * Render pagination controls
 * @param {HTMLElement} container - Container for pagination
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Callback when page changes
 */
export function renderPagination(container, currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const paginationHtml = createPaginationHTML(currentPage, totalPages);
    container.innerHTML = paginationHtml;

    // Add event listeners
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            if (page && page !== currentPage) {
                onPageChange(page);
            }
        });
    });
}

function createPaginationHTML(currentPage, totalPages) {
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    let html = '<div class="pagination">';

    // Previous button
    if (currentPage > 1) {
        html += `<button class="pagination-btn" data-page="${currentPage - 1}" aria-label="Previous page">
            ← Previous
        </button>`;
    }

    // First page
    if (startPage > 1) {
        html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" data-page="${currentPage + 1}" aria-label="Next page">
            Next →
        </button>`;
    }

    html += '</div>';
    return html;
}

/**
 * Calculate pagination info
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @param {number} currentPage - Current page (1-indexed)
 * @returns {Object} Pagination info
 */
export function getPaginationInfo(totalItems, itemsPerPage, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
        totalPages,
        currentPage,
        startIndex,
        endIndex,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
}

export default {
    renderPagination,
    getPaginationInfo
};

