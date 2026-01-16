// Search component with autocomplete

import { debounce } from '../utils/debounce.js';

export class SearchComponent {
    constructor(inputElement, resultsElement, onSelect) {
        this.input = inputElement;
        this.results = resultsElement;
        this.onSelect = onSelect;
        this.data = [];
        this.selectedIndex = -1;

        // Create debounced input handler
        this.debouncedHandleInput = debounce(() => this.handleInput(), 300);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Use debounced handler to reduce unnecessary filtering
        this.input.addEventListener('input', () => this.debouncedHandleInput());

        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.results.contains(e.target)) {
                this.hideResults();
            }
        });
    }

    setData(data) {
        this.data = data;
    }

    handleInput() {
        const query = this.input.value.trim().toLowerCase();

        if (query.length < 2) {
            this.hideResults();
            return;
        }

        const filtered = this.filterData(query);
        this.showResults(filtered);
    }

    filterData(query) {
        return this.data
            .filter(item => this.matchesQuery(item, query))
            .slice(0, 10);
    }

    matchesQuery(item, query) {
        // Override this in subclasses
        return false;
    }

    showResults(items) {
        if (items.length === 0) {
            this.hideResults();
            return;
        }

        const html = items.map((item, index) =>
            this.renderItem(item, index)
        ).join('');

        this.results.innerHTML = html;
        this.results.style.display = 'block';
        this.selectedIndex = -1;

        // Add click handlers
        this.results.querySelectorAll('.search-result-item').forEach((el, index) => {
            el.addEventListener('click', () => this.selectItem(items[index]));
        });
    }

    hideResults() {
        this.results.style.display = 'none';
        this.results.innerHTML = '';
    }

    renderItem(item, index) {
        // Override this in subclasses
        return '';
    }

    selectItem(item) {
        if (this.onSelect) {
            this.onSelect(item);
        }
        this.hideResults();
    }

    handleKeydown(e) {
        const items = this.results.querySelectorAll('.search-result-item');

        if (items.length === 0) return;

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this.updateSelection(items);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(items);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    items[this.selectedIndex].click();
                }
                break;

            case 'Escape':
                this.hideResults();
                break;
        }
    }

    updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        if (this.selectedIndex >= 0) {
            items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .search-result-item {
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        transition: background 0.2s;
    }

    .search-result-item:hover,
    .search-result-item.selected {
        background: #f5f5f5;
    }

    .search-result-item:last-child {
        border-bottom: none;
    }
`;
document.head.appendChild(style);

