import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatDate,
  formatRelativeTime,
  formatPercentage,
  truncate,
} from '../../src/js/utils/formatter.js';

describe('Formatter Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with thousands separator', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123)).toBe('123');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle null and undefined', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });

    it('should handle large numbers', () => {
      expect(formatNumber(1234567890)).toBe('1,234,567,890');
    });
  });

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      const date = '2024-01-15T10:30:00Z';
      const formatted = formatDate(date);
      expect(formatted).toContain('2024');
      expect(formatted).toContain('Jan');
    });

    it('should return "-" for empty/null dates', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate('')).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('should handle invalid date strings gracefully', () => {
      const invalid = 'not-a-date';
      expect(formatDate(invalid)).toBe(invalid);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for very recent times', () => {
      const justNow = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatRelativeTime(justNow)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should handle singular vs plural', () => {
      const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
    });

    it('should return "-" for empty/null dates', () => {
      expect(formatRelativeTime(null)).toBe('-');
      expect(formatRelativeTime('')).toBe('-');
    });
  });

  describe('formatPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(formatPercentage(25, 100)).toBe('25.0%');
      expect(formatPercentage(1, 3)).toBe('33.3%');
      expect(formatPercentage(50, 200)).toBe('25.0%');
    });

    it('should handle zero total', () => {
      expect(formatPercentage(10, 0)).toBe('0%');
      expect(formatPercentage(0, 0)).toBe('0%');
    });

    it('should format to one decimal place', () => {
      expect(formatPercentage(1, 3)).toBe('33.3%');
      expect(formatPercentage(2, 3)).toBe('66.7%');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(truncate(longText, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncate(shortText, 20)).toBe('Short text');
    });

    it('should use default maxLength of 50', () => {
      const text = 'a'.repeat(60);
      expect(truncate(text)).toBe('a'.repeat(50) + '...');
    });

    it('should handle null/undefined', () => {
      expect(truncate(null)).toBe(null);
      expect(truncate(undefined)).toBe(undefined);
    });
  });
});
