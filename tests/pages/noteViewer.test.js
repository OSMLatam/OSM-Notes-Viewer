/**
 * Tests for Note Viewer Page
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM environment
beforeEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

/**
 * Extract hashtags from text
 * This function is extracted from noteViewer.js for testing
 * @param {string} text - Text to extract hashtags from
 * @returns {Array<string>} Array of hashtags
 */
function extractHashtags(text) {
  if (!text) return [];
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
}

/**
 * Format JOSM tags
 * This function logic is extracted from noteViewer.js for testing
 * @param {Object|Array|string} tags - OSM tags
 * @returns {string} Tags in JOSM format (key1=value1,key2=value2)
 */
function formatJosmTags(tags) {
  if (!tags) return '';

  if (typeof tags === 'string') {
    return tags;
  } else if (Array.isArray(tags)) {
    const tagPairs = tags.map((tag) => {
      const key = tag.key || tag.tag || Object.keys(tag)[0];
      const value = tag.value || tag[key] || '';
      return { key, value };
    });
    return tagPairs.map((t) => `${t.key}=${t.value}`).join(',');
  } else if (typeof tags === 'object') {
    const tagPairs = Object.entries(tags).map(([key, value]) => ({ key, value }));
    return tagPairs.map((t) => `${t.key}=${t.value}`).join(',');
  }

  return '';
}

describe('Note Viewer', () => {
  describe('extractHashtags', () => {
    it('should extract single hashtag from text', () => {
      const text = 'This is a note with #hashtag in it';
      const result = extractHashtags(text);
      expect(result).toEqual(['#hashtag']);
    });

    it('should extract multiple hashtags from text', () => {
      const text = 'Note with #surveyme and #invalid hashtags';
      const result = extractHashtags(text);
      expect(result).toEqual(['#surveyme', '#invalid']);
    });

    it('should extract hashtags with numbers and underscores', () => {
      const text = 'Hashtags #test123 and #test_tag work';
      const result = extractHashtags(text);
      expect(result).toEqual(['#test123', '#test_tag']);
    });

    it('should convert hashtags to lowercase', () => {
      const text = 'Hashtag #UPPERCASE should be lowercase';
      const result = extractHashtags(text);
      expect(result).toEqual(['#uppercase']);
    });

    it('should return empty array for text without hashtags', () => {
      const text = 'This text has no hashtags';
      const result = extractHashtags(text);
      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = extractHashtags('');
      expect(result).toEqual([]);
    });

    it('should handle null or undefined', () => {
      expect(extractHashtags(null)).toEqual([]);
      expect(extractHashtags(undefined)).toEqual([]);
    });

    it('should extract hashtags at the beginning of text', () => {
      const text = '#hashtag at the start';
      const result = extractHashtags(text);
      expect(result).toEqual(['#hashtag']);
    });

    it('should extract hashtags at the end of text', () => {
      const text = 'Text ends with #hashtag';
      const result = extractHashtags(text);
      expect(result).toEqual(['#hashtag']);
    });

    it('should handle multiple hashtags in sequence', () => {
      const text = '#tag1 #tag2 #tag3';
      const result = extractHashtags(text);
      expect(result).toEqual(['#tag1', '#tag2', '#tag3']);
    });

    it('should not extract hashtags without word characters', () => {
      const text = 'This # is not a hashtag';
      const result = extractHashtags(text);
      expect(result).toEqual([]);
    });
  });

  describe('formatJosmTags', () => {
    it('should format tags from object', () => {
      const tags = { amenity: 'restaurant', name: 'Test Restaurant' };
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant,name=Test Restaurant');
    });

    it('should format tags from array of objects', () => {
      const tags = [
        { key: 'amenity', value: 'restaurant' },
        { key: 'name', value: 'Test Restaurant' },
      ];
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant,name=Test Restaurant');
    });

    it('should format tags from string', () => {
      const tags = 'amenity=restaurant,name=Test Restaurant';
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant,name=Test Restaurant');
    });

    it('should handle empty object', () => {
      const result = formatJosmTags({});
      expect(result).toBe('');
    });

    it('should handle empty array', () => {
      const result = formatJosmTags([]);
      expect(result).toBe('');
    });

    it('should handle null or undefined', () => {
      expect(formatJosmTags(null)).toBe('');
      expect(formatJosmTags(undefined)).toBe('');
    });

    it('should handle tags with empty values', () => {
      const tags = { amenity: 'restaurant', name: '' };
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant,name=');
    });

    it('should handle array with alternative key names', () => {
      const tags = [
        { tag: 'amenity', value: 'restaurant' },
        { key: 'name', value: 'Test' },
      ];
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant,name=Test');
    });

    it('should handle single tag', () => {
      const tags = { amenity: 'restaurant' };
      const result = formatJosmTags(tags);
      expect(result).toBe('amenity=restaurant');
    });

    it('should handle tags with special characters', () => {
      const tags = { name: 'Café & Restaurant', 'addr:street': 'Main St.' };
      const result = formatJosmTags(tags);
      expect(result).toBe('name=Café & Restaurant,addr:street=Main St.');
    });
  });
});
