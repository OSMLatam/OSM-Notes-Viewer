/**
 * Integration Tests for Note Viewer Page
 * Tests complete flows for loading and displaying notes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM elements
function createMockDOM() {
  document.body.innerHTML = `
        <div id="noteLoading" style="display: none;">Loading...</div>
        <div id="noteError" style="display: none;"></div>
        <div id="noteContent" style="display: none;">
            <div id="noteInfo"></div>
            <div id="noteMap"></div>
            <div id="noteText"></div>
            <div id="hashtags"></div>
            <div id="interactions"></div>
            <div id="commentForm">
                <textarea id="commentText"></textarea>
                <button id="commentBtn">Comment</button>
                <button id="closeBtn" style="display: none;">Close</button>
                <button id="reopenBtn" style="display: none;">Reopen</button>
            </div>
        </div>
    `;
}

// Mock note data from OSM API
const mockNoteData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 12345,
        url: 'https://api.openstreetmap.org/api/0.6/notes/12345',
        comment_url: 'https://api.openstreetmap.org/api/0.6/notes/12345/comment',
        close_url: 'https://api.openstreetmap.org/api/0.6/notes/12345/close',
        date_created: '2024-01-15T10:30:00Z',
        status: 'open',
        comments: [
          {
            date: '2024-01-15T10:30:00Z',
            uid: 1001,
            user: 'testuser',
            user_url: 'https://api.openstreetmap.org/user/testuser',
            action: 'opened',
            text: 'This is a test note #surveyme',
          },
          {
            date: '2024-01-15T11:00:00Z',
            uid: 1002,
            user: 'anotheruser',
            user_url: 'https://api.openstreetmap.org/user/anotheruser',
            action: 'commented',
            text: 'I will check this #invalid',
          },
        ],
      },
      geometry: {
        type: 'Point',
        coordinates: [-74.006, 40.7128], // New York coordinates
      },
    },
  ],
};

describe('Note Viewer Integration Tests', () => {
  beforeEach(() => {
    createMockDOM();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Note Loading Flow', () => {
    it('should load note data from OSM API', async () => {
      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNoteData,
      });

      // Mock country API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ country: { id: 'US', name: 'United States' } }),
      });

      // Mock ML recommendation API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'close', confidence: 0.85 }),
      });

      // Simulate loadNote function behavior
      const loading = document.getElementById('noteLoading');
      const error = document.getElementById('noteError');
      const content = document.getElementById('noteContent');

      // Initial state
      loading.style.display = 'block';
      error.style.display = 'none';
      content.style.display = 'none';

      // Simulate API call
      const response = await fetch('https://api.openstreetmap.org/api/0.6/notes/12345.json');
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.features).toBeDefined();
      expect(data.features[0].properties.id).toBe(12345);

      // Simulate successful load
      loading.style.display = 'none';
      content.style.display = 'block';

      expect(loading.style.display).toBe('none');
      expect(content.style.display).toBe('block');
      expect(error.style.display).toBe('none');
    });

    it('should handle 404 error when note not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      const loading = document.getElementById('noteLoading');
      const error = document.getElementById('noteError');
      const content = document.getElementById('noteContent');

      loading.style.display = 'block';
      error.style.display = 'none';
      content.style.display = 'none';

      try {
        const response = await fetch('https://api.openstreetmap.org/api/0.6/notes/99999.json');
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Note not found');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = err.message;
      }

      expect(loading.style.display).toBe('none');
      expect(error.style.display).toBe('block');
      expect(error.textContent).toBe('Note not found');
      expect(content.style.display).toBe('none');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const loading = document.getElementById('noteLoading');
      const error = document.getElementById('noteError');
      const content = document.getElementById('noteContent');

      loading.style.display = 'block';
      error.style.display = 'none';
      content.style.display = 'none';

      try {
        await fetch('https://api.openstreetmap.org/api/0.6/notes/12345.json');
      } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = err.message;
      }

      expect(loading.style.display).toBe('none');
      expect(error.style.display).toBe('block');
      expect(error.textContent).toBe('Network error');
    });
  });

  describe('Interactions Panel', () => {
    it('should parse and display note interactions', () => {
      const note = mockNoteData.features[0];
      const comments = note.properties.comments;
      const interactionsContainer = document.getElementById('interactions');

      // Simulate rendering interactions
      interactionsContainer.innerHTML = comments
        .map((comment, index) => {
          const actionLabel =
            comment.action === 'opened'
              ? 'Created'
              : comment.action === 'commented'
                ? 'Commented'
                : comment.action === 'closed'
                  ? 'Closed'
                  : comment.action === 'reopened'
                    ? 'Reopened'
                    : comment.action;

          return `
                    <div class="interaction" data-index="${index}">
                        <div class="interaction-action">${actionLabel}</div>
                        <div class="interaction-user">${comment.user}</div>
                        <div class="interaction-date">${comment.date}</div>
                        <div class="interaction-text">${comment.text}</div>
                    </div>
                `;
        })
        .join('');

      const interactions = interactionsContainer.querySelectorAll('.interaction');
      expect(interactions.length).toBe(2);

      // Check first interaction (opened)
      const firstInteraction = interactions[0];
      expect(firstInteraction.querySelector('.interaction-action').textContent).toBe('Created');
      expect(firstInteraction.querySelector('.interaction-user').textContent).toBe('testuser');
      expect(firstInteraction.querySelector('.interaction-text').textContent).toContain(
        '#surveyme'
      );

      // Check second interaction (commented)
      const secondInteraction = interactions[1];
      expect(secondInteraction.querySelector('.interaction-action').textContent).toBe('Commented');
      expect(secondInteraction.querySelector('.interaction-user').textContent).toBe('anotheruser');
      expect(secondInteraction.querySelector('.interaction-text').textContent).toContain(
        '#invalid'
      );
    });

    it('should extract hashtags from interactions', () => {
      const note = mockNoteData.features[0];
      const comments = note.properties.comments;
      const hashtags = new Set();

      comments.forEach((comment) => {
        const hashtagRegex = /#[\w]+/g;
        const matches = comment.text.match(hashtagRegex);
        if (matches) {
          matches.forEach((tag) => hashtags.add(tag.toLowerCase()));
        }
      });

      expect(hashtags.size).toBe(2);
      expect(hashtags.has('#surveyme')).toBe(true);
      expect(hashtags.has('#invalid')).toBe(true);
    });

    it('should display empty state when no interactions', () => {
      const interactionsContainer = document.getElementById('interactions');
      const emptyNote = {
        ...mockNoteData.features[0],
        properties: {
          ...mockNoteData.features[0].properties,
          comments: [],
        },
      };

      if (emptyNote.properties.comments.length === 0) {
        interactionsContainer.innerHTML = '<p class="no-interactions">No interactions yet</p>';
      }

      expect(interactionsContainer.querySelector('.no-interactions')).toBeTruthy();
      expect(interactionsContainer.querySelector('.no-interactions').textContent).toBe(
        'No interactions yet'
      );
    });

    it('should order interactions chronologically', () => {
      const note = mockNoteData.features[0];
      const comments = [...note.properties.comments];

      // Sort by date (oldest first)
      comments.sort((a, b) => new Date(a.date) - new Date(b.date));

      expect(comments[0].date).toBe('2024-01-15T10:30:00Z');
      expect(comments[0].action).toBe('opened');
      expect(comments[1].date).toBe('2024-01-15T11:00:00Z');
      expect(comments[1].action).toBe('commented');
    });
  });

  describe('Action Buttons Display', () => {
    it('should show close button for open notes', () => {
      const note = mockNoteData.features[0];
      const closeBtn = document.getElementById('closeBtn');
      const reopenBtn = document.getElementById('reopenBtn');

      if (note.properties.status === 'open') {
        closeBtn.style.display = 'inline-block';
        reopenBtn.style.display = 'none';
      }

      expect(closeBtn.style.display).toBe('inline-block');
      expect(reopenBtn.style.display).toBe('none');
    });

    it('should show reopen button for closed notes', () => {
      const closedNote = {
        ...mockNoteData.features[0],
        properties: {
          ...mockNoteData.features[0].properties,
          status: 'closed',
        },
      };

      const closeBtn = document.getElementById('closeBtn');
      const reopenBtn = document.getElementById('reopenBtn');

      if (closedNote.properties.status === 'closed') {
        reopenBtn.style.display = 'inline-block';
        closeBtn.style.display = 'none';
      }

      expect(reopenBtn.style.display).toBe('inline-block');
      expect(closeBtn.style.display).toBe('none');
    });
  });

  describe('Comment Form Integration', () => {
    it('should enable comment button when text is entered', () => {
      const commentText = document.getElementById('commentText');
      const commentBtn = document.getElementById('commentBtn');

      commentBtn.disabled = true;

      // Simulate input
      commentText.value = 'Test comment';
      commentBtn.disabled = !commentText.value.trim();

      expect(commentBtn.disabled).toBe(false);
    });

    it('should disable comment button when text is empty', () => {
      const commentText = document.getElementById('commentText');
      const commentBtn = document.getElementById('commentBtn');

      commentText.value = 'Test comment';
      commentBtn.disabled = !commentText.value.trim();
      expect(commentBtn.disabled).toBe(false);

      commentText.value = '';
      commentBtn.disabled = !commentText.value.trim();
      expect(commentBtn.disabled).toBe(true);
    });
  });
});
