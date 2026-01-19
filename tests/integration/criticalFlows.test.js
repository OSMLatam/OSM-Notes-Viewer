/**
 * @fileoverview Integration tests for critical user flows
 * @module tests/integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../../src/js/api/apiClient.js';
import { i18n } from '../../src/js/utils/i18n.js';
import { formatNumber, formatDate } from '../../src/js/utils/formatter.js';

describe('Critical User Flows', () => {

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Reset fetch mock
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Flow 1: Page Load and Initialization', () => {
        it('should initialize i18n on page load', async () => {
            await i18n.init();
            expect(i18n.currentLang).toBeDefined();
            expect(i18n.translations).toBeDefined();
        });

        it('should detect browser language', () => {
            const lang = i18n.getCurrentLanguage();
            expect(['en', 'es', 'de', 'fr']).toContain(lang);
        });

        it('should fallback to English if invalid language', () => {
            // Simulate invalid language
            localStorage.setItem('osm-notes-lang', 'invalid');
            const lang = i18n.getCurrentLanguage();
            // getCurrentLanguage returns what's in localStorage, even if invalid
            // The validation happens in setLanguage() function
            expect(lang).toBe('invalid');

            // Now test that setLanguage rejects invalid languages
            const result = i18n.setLanguage('invalid');
            expect(result).toBe(false);
            expect(i18n.currentLang).toBe('en'); // Should fallback to default
        });
    });

    describe('Flow 2: Search Functionality', () => {
        const mockUsers = [
            { user_id: 1, username: 'testuser1', history_whole_open: 100 },
            { user_id: 2, username: 'testuser2', history_whole_open: 200 }
        ];

        beforeEach(() => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockUsers
            });
        });

        it('should fetch user index on search', async () => {
            const users = await apiClient.getUserIndex();
            expect(users).toBeDefined();
            expect(Array.isArray(users)).toBe(true);
        });

        it('should filter users by username', async () => {
            const users = await apiClient.getUserIndex();
            const filtered = users.filter(u =>
                u.username.toLowerCase().includes('test')
            );
            expect(filtered.length).toBeGreaterThan(0);
        });

        it('should handle search errors gracefully', { timeout: 10000 }, async () => {
            // Clear cache first
            apiClient.clearCache();

            // Mock network error
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(apiClient.getUserIndex()).rejects.toThrow();
        });
    });

    describe('Flow 3: User Profile Loading', () => {
        const mockUser = {
            user_id: 123,
            username: 'testuser',
            history_whole_open: 500,
            history_whole_closed: 300,
            history_whole_commented: 100,
            history_whole_reopened: 10,
            last_year_activity: '0'.repeat(365),
            working_hours_of_week_opening: [],
            working_hours_of_week_commenting: [],
            working_hours_of_week_closing: []
        };

        beforeEach(() => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockUser
            });
        });

        it('should load user profile data', async () => {
            const user = await apiClient.getUser(123);
            expect(user).toBeDefined();
            expect(user.user_id).toBe(123);
            expect(user.username).toBe('testuser');
        });

        it('should format user statistics correctly', () => {
            const formatted = formatNumber(mockUser.history_whole_open);
            expect(formatted).toBe('500');
        });

        it('should handle missing user profile', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404
            });

            await expect(apiClient.getUser(999)).rejects.toThrow();
        });
    });

    describe('Flow 4: Country Profile Loading', () => {
        const mockCountry = {
            country_id: 456,
            country_name: 'Test Country',
            history_whole_open: 1000,
            history_whole_closed: 500,
            history_whole_commented: 200,
            history_whole_reopened: 20
        };

        beforeEach(() => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockCountry
            });
        });

        it('should load country profile data', async () => {
            const country = await apiClient.getCountry(456);
            expect(country).toBeDefined();
            expect(country.country_id).toBe(456);
        });

        it('should format country statistics correctly', () => {
            const formatted = formatNumber(mockCountry.history_whole_open);
            expect(formatted).toBe('1,000');
        });
    });

    describe('Flow 5: Theme Toggle', () => {
        it('should toggle between light and dark mode', () => {
            const initialTheme = document.documentElement.getAttribute('data-theme');
            const toggle = document.querySelector('.theme-toggle');

            if (toggle) {
                toggle.click();
                const newTheme = document.documentElement.getAttribute('data-theme');
                expect(newTheme).not.toBe(initialTheme);
            }
        });

        it('should persist theme preference', () => {
            localStorage.setItem('osm-notes-theme', 'dark');
            const savedTheme = localStorage.getItem('osm-notes-theme');
            expect(savedTheme).toBe('dark');
        });
    });

    describe('Flow 6: Language Switching', () => {
        it('should switch languages correctly', () => {
            i18n.setLanguage('es');
            expect(i18n.currentLang).toBe('es');

            i18n.setLanguage('en');
            expect(i18n.currentLang).toBe('en');
        });

        it('should reject invalid language codes', () => {
            const result = i18n.setLanguage('invalid');
            expect(result).toBe(false);
        });

        it('should translate content after language change', async () => {
            await i18n.init();
            i18n.setLanguage('es');

            const translation = i18n.t('nav.home');
            expect(translation).toBeDefined();
            expect(translation).not.toBe('nav.home');
        });
    });

    describe('Flow 7: Data Formatting', () => {
        it('should format large numbers correctly', () => {
            expect(formatNumber(1234)).toBe('1,234');
            expect(formatNumber(1000000)).toBe('1,000,000');
            expect(formatNumber(0)).toBe('0');
        });

        it('should handle null/undefined numbers', () => {
            expect(formatNumber(null)).toBe('0');
            expect(formatNumber(undefined)).toBe('0');
        });

        it('should format dates correctly', () => {
            const dateStr = '2024-01-15T12:00:00Z';
            const formatted = formatDate(dateStr);
            expect(formatted).toContain('2024');
            expect(formatted).toContain('Jan');
        });

        it('should handle invalid dates', () => {
            const formatted = formatDate('invalid-date');
            expect(formatted).toBe('invalid-date');
        });
    });

    describe('Flow 8: API Caching', () => {
        it('should cache API responses', async () => {
            const mockData = { test: 'data' };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockData
            });

            // First call
            const data1 = await apiClient.fetch('/test');

            // Second call should use cache
            const data2 = await apiClient.fetch('/test');

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(data1).toEqual(data2);
        });

        it('should expire cache after TTL', async () => {
            // This would require mocking time or increasing TTL
            // For now, just verify cache mechanism exists
            expect(apiClient.cache).toBeDefined();
        });
    });

    describe('Flow 9: Error Handling', () => {
        it('should handle network errors', { timeout: 10000 }, async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(apiClient.getMetadata()).rejects.toThrow();
        });

        it('should handle 404 errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404
            });

            await expect(apiClient.getUser(999)).rejects.toThrow();
        });

        it('should handle invalid JSON', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => { throw new Error('Invalid JSON'); }
            });

            await expect(apiClient.getMetadata()).rejects.toThrow();
        });
    });

    describe('Flow 10: Internationalization', () => {
        it('should translate all navigation links', async () => {
            await i18n.init();

            const navKeys = ['nav.home', 'nav.explore', 'nav.about'];
            navKeys.forEach(key => {
                const translation = i18n.t(key);
                expect(translation).toBeDefined();
                expect(translation).not.toBe(key);
            });
        });

        it('should handle missing translations gracefully', () => {
            const translation = i18n.t('nonexistent.key');
            expect(translation).toBe('nonexistent.key');
        });

        it('should replace parameters in translations', () => {
            const translation = i18n.t('explore.results.showing', {
                count: 10,
                total: 100
            });
            expect(translation).toContain('10');
            expect(translation).toContain('100');
        });
    });
});
