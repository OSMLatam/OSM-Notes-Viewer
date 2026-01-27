import { describe, it, expect } from 'vitest';
import { getPaginationInfo } from '../../src/js/components/pagination.js';

describe('Pagination Component', () => {
  describe('getPaginationInfo', () => {
    it('should calculate pagination for first page', () => {
      const result = getPaginationInfo(100, 10, 1);

      expect(result.totalPages).toBe(10);
      expect(result.currentPage).toBe(1);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should calculate pagination for middle page', () => {
      const result = getPaginationInfo(100, 10, 5);

      expect(result.currentPage).toBe(5);
      expect(result.startIndex).toBe(40);
      expect(result.endIndex).toBe(50);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should calculate pagination for last page', () => {
      const result = getPaginationInfo(100, 10, 10);

      expect(result.currentPage).toBe(10);
      expect(result.startIndex).toBe(90);
      expect(result.endIndex).toBe(100);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle items that divide evenly', () => {
      const result = getPaginationInfo(50, 10, 5);

      expect(result.totalPages).toBe(5);
      expect(result.endIndex).toBe(50);
    });

    it('should handle items that do not divide evenly', () => {
      const result = getPaginationInfo(25, 10, 3);

      expect(result.totalPages).toBe(3);
      expect(result.endIndex).toBe(25);
    });

    it('should handle empty results', () => {
      const result = getPaginationInfo(0, 10, 1);

      expect(result.totalPages).toBe(0);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(0);
    });
  });
});
