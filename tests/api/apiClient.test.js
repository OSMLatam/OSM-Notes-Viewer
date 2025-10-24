import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../../src/js/api/apiClient.js';

describe('APIClient', () => {
    beforeEach(() => {
        // Clear cache before each test
        apiClient.cache.clear();
        apiClient.cacheTimestamps.clear();
    });

    describe('getUserIndex', () => {
        it('should fetch user index', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { user_id: 1, username: 'testuser' }
                    ])
                })
            );

            const result = await apiClient.getUserIndex();
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('username');
        });

        it('should handle fetch errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('Network error'))
            );

            await expect(apiClient.getUserIndex()).rejects.toThrow();
        });
    });

    describe('getCountryIndex', () => {
        it('should fetch country index', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { country_id: 'US', country_name: 'United States' }
                    ])
                })
            );

            const result = await apiClient.getCountryIndex();
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('country_name');
        });
    });

    describe('caching', () => {
        it('should cache responses', async () => {
            const mockData = [{ id: 1, name: 'test' }];
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData)
                })
            );

            await apiClient.getUserIndex();
            await apiClient.getUserIndex();

            // Should only fetch once due to caching
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should respect cache expiration', async () => {
            const mockData = [{ id: 1, name: 'test' }];
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData)
                })
            );

            // Fetch first time
            await apiClient.getUserIndex();

            // Mock expired cache
            apiClient.cacheTimestamps.set('/indexes/users.json', Date.now() - 20 * 60 * 1000);

            // Fetch again - should fetch from network
            await apiClient.getUserIndex();

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should throw error on HTTP error status', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 404
                })
            );

            await expect(apiClient.getUserIndex()).rejects.toThrow('HTTP error');
        });
    });
});


