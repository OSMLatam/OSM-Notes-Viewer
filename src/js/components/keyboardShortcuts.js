/**
 * @fileoverview Keyboard shortcuts manager for navigating and interacting with the application
 * @module components/keyboardShortcuts
 */

import { i18n } from '../utils/i18n.js';

/**
 * Keyboard shortcuts manager
 * @class KeyboardShortcuts
 */
export class KeyboardShortcuts {
  /**
   * Create a keyboard shortcuts manager
   * @constructor
   */
  constructor() {
    /** @type {Array<Object>} List of registered shortcuts */
    this.shortcuts = [];
    /** @type {boolean} Whether shortcuts are enabled */
    this.enabled = true;
    /** @type {boolean} Whether help overlay is visible */
    this.helpVisible = false;

    this.init();
  }

  /**
   * Initialize keyboard shortcuts
   * @returns {void}
   */
  init() {
    // Register global shortcuts
    this.registerShortcuts();

    // Setup event listeners
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Setup help toggle (Ctrl+/ or Cmd+/)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.toggleHelp();
      }
    });
  }

  /**
   * Register all shortcuts
   * @returns {void}
   */
  registerShortcuts() {
    // Navigation shortcuts
    this.register({
      key: 'e',
      description: i18n.t('shortcuts.nav.explore'),
      handler: () => this.navigateTo('/pages/explore.html'),
      category: 'navigation',
    });

    this.register({
      key: 'u',
      ctrl: true,
      description: i18n.t('shortcuts.search.users'),
      handler: () => this.focusSearch('users'),
      category: 'search',
    });

    this.register({
      key: 'c',
      ctrl: true,
      description: i18n.t('shortcuts.search.countries'),
      handler: () => this.focusSearch('countries'),
      category: 'search',
    });

    this.register({
      key: 'h',
      description: i18n.t('shortcuts.nav.home'),
      handler: () => this.navigateTo('/src/index.html'),
      category: 'navigation',
    });

    this.register({
      key: 'a',
      description: i18n.t('shortcuts.nav.about'),
      handler: () => this.navigateTo('/pages/about.html'),
      category: 'navigation',
    });

    // Action shortcuts
    this.register({
      key: 's',
      description: i18n.t('shortcuts.search.focus'),
      handler: () => this.focusSearchInput(),
      category: 'actions',
    });

    this.register({
      key: 'Escape',
      description: i18n.t('shortcuts.actions.close'),
      handler: () => this.closeDialogs(),
      category: 'actions',
    });

    this.register({
      key: 'Enter',
      description: i18n.t('shortcuts.search.submit'),
      handler: () => this.submitSearch(),
      category: 'actions',
      requireFocus: true,
    });

    // Theme toggle
    this.register({
      key: 't',
      ctrl: true,
      description: i18n.t('shortcuts.settings.theme'),
      handler: () => this.toggleTheme(),
      category: 'settings',
    });

    // Language selector
    this.register({
      key: 'l',
      ctrl: true,
      description: i18n.t('shortcuts.settings.language'),
      handler: () => this.openLanguageSelector(),
      category: 'settings',
    });

    // Back navigation
    this.register({
      key: 'b',
      ctrl: true,
      description: i18n.t('shortcuts.nav.back'),
      handler: () => window.history.back(),
      category: 'navigation',
    });

    // Forward navigation
    this.register({
      key: 'f',
      ctrl: true,
      description: i18n.t('shortcuts.nav.forward'),
      handler: () => window.history.forward(),
      category: 'navigation',
    });
  }

  /**
   * Register a keyboard shortcut
   * @param {Object} shortcut - Shortcut configuration
   * @param {string} shortcut.key - Key to press
   * @param {boolean} [shortcut.ctrl=false] - Require Ctrl key
   * @param {boolean} [shortcut.shift=false] - Require Shift key
   * @param {boolean} [shortcut.alt=false] - Require Alt key
   * @param {string} shortcut.description - Description for help
   * @param {Function} shortcut.handler - Handler function
   * @param {string} shortcut.category - Category (navigation, actions, etc.)
   * @param {boolean} [shortcut.requireFocus=false] - Require focus on input
   * @returns {void}
   */
  register(shortcut) {
    this.shortcuts.push(shortcut);
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {void}
   */
  handleKeyDown(event) {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    if (this.isTypingInInput(event.target)) {
      return;
    }

    // Find matching shortcut
    const shortcut = this.shortcuts.find((s) => this.matchesShortcut(s, event));

    if (shortcut) {
      // Check if focus is required
      if (shortcut.requireFocus && document.activeElement.tagName !== 'INPUT') {
        return;
      }

      event.preventDefault();
      shortcut.handler();
    }
  }

  /**
   * Check if user is typing in an input field
   * @param {HTMLElement} target - Target element
   * @returns {boolean} True if typing in input
   */
  isTypingInInput(target) {
    const tagName = target.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable = target.contentEditable === 'true';

    return isInput || isContentEditable;
  }

  /**
   * Check if key event matches shortcut configuration
   * @param {Object} shortcut - Shortcut configuration
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} True if matches
   */
  matchesShortcut(shortcut, event) {
    const keyMatch =
      event.key.toLowerCase() === shortcut.key.toLowerCase() || event.key === shortcut.key;

    const ctrlMatch = !shortcut.ctrl || event.ctrlKey || event.metaKey;
    const shiftMatch = !shortcut.shift || event.shiftKey;
    const altMatch = !shortcut.alt || event.altKey;

    return keyMatch && ctrlMatch && shiftMatch && altMatch;
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to
   * @returns {void}
   */
  navigateTo(url) {
    window.location.href = url;
  }

  /**
   * Focus search input
   * @returns {void}
   */
  focusSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Focus search with specific type
   * @param {string} type - Search type ('users' or 'countries')
   * @returns {void}
   */
  focusSearch(type) {
    // Switch to the correct tab
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      if (btn.dataset.tab === type) {
        btn.click();
      }
    });

    // Focus search input
    setTimeout(() => this.focusSearchInput(), 100);
  }

  /**
   * Submit search
   * @returns {void}
   */
  submitSearch() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && document.activeElement.id === 'searchInput') {
      searchBtn.click();
    }
  }

  /**
   * Close dialogs and menus
   * @returns {void}
   */
  closeDialogs() {
    // Close language selector
    const langMenu = document.getElementById('languageMenu');
    if (langMenu && langMenu.style.display !== 'none') {
      langMenu.style.display = 'none';
    }

    // Close share menu
    const shareMenu = document.getElementById('shareMenu');
    if (shareMenu && shareMenu.style.display !== 'none') {
      shareMenu.style.display = 'none';
    }

    // Close mobile menu
    const nav = document.querySelector('.nav');
    if (nav && nav.classList.contains('mobile-open')) {
      nav.classList.remove('mobile-open');
    }

    // Close search results
    const searchResults = document.getElementById('searchResults');
    if (searchResults && searchResults.innerHTML.trim() !== '') {
      searchResults.innerHTML = '';
    }
  }

  /**
   * Toggle theme
   * @returns {void}
   */
  toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }

  /**
   * Open language selector
   * @returns {void}
   */
  openLanguageSelector() {
    const langBtn = document.getElementById('languageBtn');
    if (langBtn) {
      langBtn.click();
    }
  }

  /**
   * Toggle help overlay
   * @returns {void}
   */
  toggleHelp() {
    this.helpVisible = !this.helpVisible;

    if (this.helpVisible) {
      this.showHelp();
    } else {
      this.hideHelp();
    }
  }

  /**
   * Show help overlay
   * @returns {void}
   */
  showHelp() {
    const helpOverlay = this.createHelpOverlay();
    document.body.appendChild(helpOverlay);

    // Animate in
    setTimeout(() => {
      helpOverlay.classList.add('show');
    }, 10);
  }

  /**
   * Hide help overlay
   * @returns {void}
   */
  hideHelp() {
    const helpOverlay = document.getElementById('keyboardShortcutsHelp');
    if (helpOverlay) {
      helpOverlay.classList.remove('show');
      setTimeout(() => {
        helpOverlay.remove();
      }, 300);
    }
  }

  /**
   * Create help overlay HTML
   * @returns {HTMLElement} Help overlay element
   */
  createHelpOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'keyboardShortcutsHelp';
    overlay.className = 'keyboard-shortcuts-help';

    // Group shortcuts by category
    const categories = this.groupShortcutsByCategory();

    let html = `
            <div class="shortcuts-header">
                <h2>${i18n.t('shortcuts.title')}</h2>
                <button class="close-btn" aria-label="${i18n.t('shortcuts.close')}">×</button>
            </div>
            <div class="shortcuts-content">
        `;

    // Render each category
    Object.entries(categories).forEach(([category, shortcuts]) => {
      html += `
                <div class="shortcuts-category">
                    <h3>${this.formatCategoryName(category)}</h3>
                    <div class="shortcuts-list">
            `;

      shortcuts.forEach((shortcut) => {
        const keyCombo = this.formatKeyCombo(shortcut);
        html += `
                    <div class="shortcut-item">
                        <div class="shortcut-keys">${keyCombo}</div>
                        <div class="shortcut-description">${shortcut.description}</div>
                    </div>
                `;
      });

      html += `
                    </div>
                </div>
            `;
    });

    html += `
            </div>
            <div class="shortcuts-footer">
                <p>${i18n.t('shortcuts.closeHint')}</p>
            </div>
        `;

    overlay.innerHTML = html;

    // Close button handler
    overlay.querySelector('.close-btn').addEventListener('click', () => {
      this.toggleHelp();
    });

    // ESC key handler
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleHelp();
      }
    });

    return overlay;
  }

  /**
   * Group shortcuts by category
   * @returns {Object} Grouped shortcuts
   */
  groupShortcutsByCategory() {
    const groups = {};

    this.shortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    return groups;
  }

  /**
   * Format category name for display
   * @param {string} category - Category name
   * @returns {string} Formatted name
   */
  formatCategoryName(category) {
    const names = {
      navigation: i18n.t('shortcuts.navigation'),
      search: i18n.t('shortcuts.search'),
      actions: i18n.t('shortcuts.actions'),
      settings: i18n.t('shortcuts.settings'),
    };
    return names[category] || category;
  }

  /**
   * Format key combination for display
   * @param {Object} shortcut - Shortcut configuration
   * @returns {string} Formatted key combo
   */
  formatKeyCombo(shortcut) {
    const parts = [];

    if (shortcut.ctrl) parts.push('<kbd>Ctrl</kbd>');
    if (shortcut.shift) parts.push('<kbd>Shift</kbd>');
    if (shortcut.alt) parts.push('<kbd>Alt</kbd>');

    const keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key;
    parts.push(`<kbd>${keyDisplay}</kbd>`);

    return parts.join(' + ');
  }

  /**
   * Enable keyboard shortcuts
   * @returns {void}
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable keyboard shortcuts
   * @returns {void}
   */
  disable() {
    this.enabled = false;
  }
}

// Export singleton instance
export const keyboardShortcuts = new KeyboardShortcuts();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  keyboardShortcuts.init();
});
