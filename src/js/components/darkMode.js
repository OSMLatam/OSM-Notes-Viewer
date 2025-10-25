// Dark Mode Toggle Component
import { analytics } from '../utils/analytics.js';
import { animationManager } from './animationManager.js';

const THEME_KEY = 'osm-notes-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

/**
 * Initialize dark mode based on user preference
 */
export function initDarkMode() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme, or system preference, or default to light
    const theme = savedTheme || (prefersDark ? DARK_THEME : LIGHT_THEME);

    setTheme(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? DARK_THEME : LIGHT_THEME);
        }
    });
}

/**
 * Set theme
 * @param {string} theme - 'dark' or 'light'
 */
export function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update toggle button if exists
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.textContent = theme === DARK_THEME ? '☀️ Light' : '🌙 Dark';
        toggle.setAttribute('aria-label', `Switch to ${theme === DARK_THEME ? 'light' : 'dark'} mode`);
    }
}

/**
 * Toggle between dark and light theme
 */
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

    // Animate theme transition
    animationManager.animateThemeTransition();

    setTheme(newTheme);

    // Track theme toggle
    analytics.trackThemeToggle(newTheme);

    // Show toast notification
    animationManager.showToast(`Switched to ${newTheme} mode`, 'success');
}

/**
 * Get current theme
 * @returns {string} Current theme
 */
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
}

export default {
    initDarkMode,
    setTheme,
    toggleTheme,
    getCurrentTheme
};

