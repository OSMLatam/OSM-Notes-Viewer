import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDarkMode, setTheme, toggleTheme, getCurrentTheme } from '../../src/js/components/darkMode.js';

describe('Dark Mode Component', () => {
    beforeEach(() => {
        // Reset document attribute
        document.documentElement.removeAttribute('data-theme');
        localStorage.clear();
    });

    describe('setTheme', () => {
        it('should set theme attribute on document', () => {
            setTheme('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should save theme to localStorage', () => {
            setTheme('light');
            expect(localStorage.getItem('osm-notes-theme')).toBe('light');
        });
    });

    describe('toggleTheme', () => {
        it('should toggle from light to dark', () => {
            setTheme('light');
            toggleTheme();
            expect(getCurrentTheme()).toBe('dark');
        });

        it('should toggle from dark to light', () => {
            setTheme('dark');
            toggleTheme();
            expect(getCurrentTheme()).toBe('light');
        });
    });

    describe('getCurrentTheme', () => {
        it('should return current theme', () => {
            setTheme('dark');
            expect(getCurrentTheme()).toBe('dark');
        });

        it('should default to light if no theme set', () => {
            expect(getCurrentTheme()).toBe('light');
        });
    });

    describe('initDarkMode', () => {
        it('should initialize with saved theme', () => {
            localStorage.setItem('osm-notes-theme', 'dark');
            initDarkMode();
            expect(getCurrentTheme()).toBe('dark');
        });

        it('should detect system preference', () => {
            // Clear localStorage first
            localStorage.removeItem('osm-notes-theme');

            // Mock matchMedia to return dark preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn(() => ({
                    matches: true,
                    addEventListener: () => {}
                }))
            });

            initDarkMode();
            expect(getCurrentTheme()).toBe('dark');
        });
    });
});


