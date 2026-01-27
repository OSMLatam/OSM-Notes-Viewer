---
title: 'OSM Notes Wrapped - Development Plan'
description:
  'Development plan for implementing OSM Notes Wrapped functionality, similar to OSM Wrapped but
  focused on OpenStreetMap notes metrics, allowing users to generate and share visual summaries of
  their contributions'
version: '1.0.0'
last_updated: '2026-01-25'
author: 'AngocA'
tags:
  - 'development-plan'
  - 'features'
audience:
  - 'developers'
project: 'OSM-Notes-Viewer'
status: 'active'
---

# OSM Notes Wrapped - Development Plan

## 📋 Executive Summary

This document describes the development plan to implement functionality similar to "OSM Wrapped"
(https://osmwrapped.com/) but focused on OpenStreetMap notes metrics. The functionality will allow
users to generate and share a visual summary of their contributions to OSM notes.

**Goal:** Create a shareable social media experience that celebrates users' contributions to OSM
notes and helps spread awareness of the project.

---

## 🎯 Objectives

1. **Generate visual summaries** of users' annual contributions
2. **Create shareable images** optimized for social media
3. **Increase visibility** of the OSM Notes Viewer project
4. **Motivate more users** to resolve OSM notes

---

## 📊 Available Data

### Data Sources

1. **Analytics JSON** (sibling project OSM-Notes-Analytics)
   - File: `/api/users/{user_id}.json`
   - Contains all necessary metrics

2. **OSM API** (optional, for additional data)
   - Avatar: `https://www.openstreetmap.org/api/0.6/user/{user_id}.json`
   - User information

### Metrics Available in JSON

```json
{
  "user_id": 12345,
  "username": "example_user",

  // Totals (lifetime)
  "history_whole_open": 542,
  "history_whole_closed": 234,
  "history_whole_commented": 123,
  "history_whole_reopened": 12,

  // Current year
  "history_year_open": 45,
  "history_year_closed": 23,
  "history_year_commented": 10,
  "history_year_reopened": 2,

  // Current month
  "history_month_open": 5,
  "history_month_closed": 3,

  // Current day
  "history_day_open": 0,
  "history_day_closed": 1,

  // Important dates
  "date_starting_creating_notes": "2015-03-20",
  "date_starting_solving_notes": "2015-04-15",

  // Most active days
  "dates_most_open": [
    {"rank": 1, "date": "2024-03-15", "quantity": 45}
  ],
  "dates_most_closed": [
    {"rank": 1, "date": "2024-06-10", "quantity": 23}
  ],

  // Countries
  "countries_open_notes": [
    {"rank": 1, "country": "Colombia", "quantity": 150}
  ],
  "countries_solving_notes": [
    {"rank": 1, "country": "Colombia", "quantity": 80}
  ],

  // Hashtags
  "hashtags": [
    {"rank": 1, "hashtag": "#mapathon", "quantity": 45}
  ],

  // Work patterns
  "working_hours_of_week_opening": [...],
  "working_hours_of_week_closing": [...],

  // Year heatmap (371 characters)
  "last_year_activity": "001002003..."
}
```

### Metrics that Need Calculation

1. **Longest Streak** (consecutive days)
   - Calculate from `last_year_activity` or `dates_most_*`
   - Algorithm: find longest sequence of days with activity

2. **Most Active Month** of the year
   - Aggregate data from `last_year_activity` by month
   - Or use `dates_most_*` grouped by month

3. **Percentiles** (comparison with other users)
   - Requires data from user index
   - Calculate relative position

---

## 🏗️ Architecture

### Recommended Option: Integrated in User Profile

```
/user.html?username=xxx&wrapped=true
```

**Advantages:**

- Reuses existing infrastructure
- Direct access from user profile
- No new page required

**Flow:**

1. User visits their profile
2. "Generate My Wrapped" button visible
3. Click generates interactive slides
4. Option to download/share each slide

### Alternative: Dedicated Page

```
/wrapped.html?username=xxx
```

**Advantages:**

- More control over design
- Can include animations/video
- More immersive experience

---

## 🛠️ Technology Stack

### New Dependencies

```json
{
  "dependencies": {
    "html2canvas": "^1.4.1", // Image generation
    "dom-to-image": "^2.6.0" // Lighter alternative
  }
}
```

**Recommendation:** `html2canvas` is more mature and has better support.

### Existing Tools (Reuse)

- ✅ `Chart.js` - For charts
- ✅ SVG heatmaps - For visualizations
- ✅ `apiClient.js` - To fetch data
- ✅ `formatter.js` - To format numbers/dates
- ✅ `share.js` - To share
- ✅ `i18n.js` - For internationalization

---

## 📐 Slide Design

### Slide 1: Cover

```
┌─────────────────────────────────┐
│   🎉 Your Year in OSM Notes 🎉 │
│                                 │
│        @username                │
│                                 │
│    [User avatar]                │
│                                 │
│    Year 2024                    │
└─────────────────────────────────┘
```

**Data:**

- `username`
- Avatar from OSM API
- Current year

---

### Slide 2: Year Summary

```
┌─────────────────────────────────┐
│   Your Year Summary             │
│                                 │
│   📝 Notes Closed: 234          │
│   💬 Comments: 123              │
│   🔄 Reopened: 12               │
│                                 │
│   vs Previous Year: +45% ⬆️     │
└─────────────────────────────────┘
```

**Data:**

- `history_year_closed`
- `history_year_commented`
- `history_year_reopened`
- Comparison with previous year (if available)

---

### Slide 3: Your Best Day

```
┌─────────────────────────────────┐
│   Your Most Productive Day      │
│                                 │
│   📅 March 15, 2024             │
│                                 │
│   You closed 45 notes in a day! │
│                                 │
│   🏆 Personal Record            │
└─────────────────────────────────┘
```

**Data:**

- `dates_most_closed[0]`
- Format: readable date
- Quantity

---

### Slide 4: Countries Where You Contributed

```
┌─────────────────────────────────┐
│   Countries Where You Contributed│
│                                 │
│   🗺️ Top 3 Countries:           │
│                                 │
│   1. 🇨🇴 Colombia - 80 notes    │
│   2. 🇪🇨 Ecuador - 45 notes     │
│   3. 🇵🇪 Perú - 23 notes        │
│                                 │
│   Total: 5 countries            │
└─────────────────────────────────┘
```

**Data:**

- `countries_solving_notes` (top 3)
- Total unique countries
- Flags (use existing `countryFlags.js`)

---

### Slide 5: Your Longest Streak

```
┌─────────────────────────────────┐
│   Your Contribution Streak      │
│                                 │
│   🔥 15 consecutive days         │
│                                 │
│   From June 1 to June 15        │
│                                 │
│   Incredible consistency!       │
└─────────────────────────────────┘
```

**Data:**

- Calculate from `last_year_activity`
- Start and end dates

---

### Slide 6: Working Hours

```
┌─────────────────────────────────┐
│   Your Activity Hours           │
│                                 │
│   [Heatmap 24x7]                │
│                                 │
│   Most active hour: 14:00       │
│   Most active day: Friday       │
└─────────────────────────────────┘
```

**Data:**

- `working_hours_of_week_closing`
- Reuse `workingHoursHeatmap.js` component
- Calculate most active hour/day

---

### Slide 7: Year Heatmap

```
┌─────────────────────────────────┐
│   Your Activity During the Year │
│                                 │
│   [GitHub-style heatmap]        │
│                                 │
│   234 active days               │
│   131 inactive days             │
└─────────────────────────────────┘
```

**Data:**

- `last_year_activity`
- Reuse `activityHeatmap.js` component
- Calculate active vs inactive days

---

### Slide 8: Favorite Hashtags

```
┌─────────────────────────────────┐
│   Your Most Used Hashtags       │
│                                 │
│   #mapathon - 45 times          │
│   #survey - 23 times             │
│   #fixme - 12 times              │
│                                 │
│   Total: 8 unique hashtags      │
└─────────────────────────────────┘
```

**Data:**

- `hashtags` (top 3)
- Total unique hashtags

---

### Slide 9: Milestones

```
┌─────────────────────────────────┐
│   Achievements and Milestones   │
│                                 │
│   🎯 First note: 2015-03-20     │
│   ✅ First solved: 2015-04-15   │
│                                 │
│   📊 Total lifetime:            │
│   • 542 notes opened            │
│   • 234 notes closed            │
└─────────────────────────────────┘
```

**Data:**

- `date_starting_creating_notes`
- `date_starting_solving_notes`
- `history_whole_open`
- `history_whole_closed`

---

### Slide 10: Closing and Share

```
┌─────────────────────────────────┐
│   Thanks for Contributing!       │
│                                 │
│   Keep resolving notes          │
│   and helping improve OSM       │
│                                 │
│   [Project logo]                │
│                                 │
│   View full profile:            │
│   notes.osm.lat/...             │
└─────────────────────────────────┘
```

**Data:**

- Link to full profile
- Project branding

---

## 💻 Technical Implementation

### File Structure

```
src/
├── js/
│   ├── pages/
│   │   └── wrapped.js          # Main wrapped logic
│   ├── components/
│   │   ├── wrappedSlides.js    # Slide generator
│   │   ├── wrappedImage.js     # Image generator
│   │   └── wrappedShare.js     # Share wrapped
│   └── utils/
│       └── streakCalculator.js # Calculate streaks
├── css/
│   └── wrapped.css             # Styles for slides
└── pages/
    └── wrapped.html            # Wrapped page (optional)
```

---

### 1. Main Component: `wrapped.js`

```javascript
// src/js/pages/wrapped.js

import { apiClient } from '../api/apiClient.js';
import { WrappedSlides } from '../components/wrappedSlides.js';
import { WrappedImageGenerator } from '../components/wrappedImage.js';
import { calculateStreak } from '../utils/streakCalculator.js';

export class WrappedPage {
  constructor() {
    this.userData = null;
    this.slides = [];
    this.currentSlide = 0;
  }

  async init(username) {
    try {
      // 1. Load user data
      this.userData = await this.loadUserData(username);

      // 2. Calculate additional metrics
      this.calculatedMetrics = this.calculateMetrics(this.userData);

      // 3. Generate slides
      this.slides = this.generateSlides(this.userData, this.calculatedMetrics);

      // 4. Render
      this.render();
    } catch (error) {
      console.error('Error loading wrapped:', error);
      this.showError(error.message);
    }
  }

  async loadUserData(username) {
    // If we have username, find user_id
    if (isNaN(username)) {
      const userIndex = await apiClient.getUserIndex();
      const user = userIndex.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!user) throw new Error('User not found');
      username = user.user_id;
    }

    // Load full profile
    return await apiClient.getUser(username);
  }

  calculateMetrics(userData) {
    return {
      streak: calculateStreak(userData.last_year_activity),
      mostActiveMonth: this.getMostActiveMonth(userData),
      activeDays: this.countActiveDays(userData.last_year_activity),
      totalCountries: userData.countries_solving_notes?.length || 0,
      totalHashtags: userData.hashtags?.length || 0,
    };
  }

  generateSlides(userData, metrics) {
    const slides = [];

    // Slide 1: Portada
    slides.push({
      type: 'cover',
      data: {
        username: userData.username,
        year: new Date().getFullYear(),
      },
    });

    // Slide 2: Resumen
    slides.push({
      type: 'summary',
      data: {
        closed: userData.history_year_closed,
        commented: userData.history_year_commented,
        reopened: userData.history_year_reopened,
      },
    });

    // ... más slides

    return slides;
  }

  render() {
    const container = document.getElementById('wrappedContainer');
    const slidesComponent = new WrappedSlides();
    slidesComponent.render(this.slides, container);
  }
}
```

---

### 2. Slide Generator: `wrappedSlides.js`

```javascript
// src/js/components/wrappedSlides.js

export class WrappedSlides {
  constructor() {
    this.slides = [];
    this.currentIndex = 0;
  }

  render(slides, container) {
    this.slides = slides;
    container.innerHTML = this.createSlidesHTML();
    this.attachEventListeners();
  }

  createSlidesHTML() {
    return `
            <div class="wrapped-container">
                <div class="wrapped-slides">
                    ${this.slides.map((slide, index) => this.renderSlide(slide, index)).join('')}
                </div>
                <div class="wrapped-controls">
                    <button class="wrapped-prev">← Previous</button>
                    <span class="wrapped-counter">1 / ${this.slides.length}</span>
                    <button class="wrapped-next">Next →</button>
                </div>
                <div class="wrapped-actions">
                    <button class="wrapped-download">📥 Download Slide</button>
                    <button class="wrapped-share">🔗 Share</button>
                </div>
            </div>
        `;
  }

  renderSlide(slide, index) {
    const isActive = index === 0 ? 'active' : '';

    switch (slide.type) {
      case 'cover':
        return this.renderCoverSlide(slide.data, index, isActive);
      case 'summary':
        return this.renderSummarySlide(slide.data, index, isActive);
      case 'bestDay':
        return this.renderBestDaySlide(slide.data, index, isActive);
      // ... más tipos
      default:
        return '';
    }
  }

  renderCoverSlide(data, index, isActive) {
    return `
            <div class="wrapped-slide ${isActive}" data-slide-index="${index}">
                <div class="wrapped-slide-content">
                    <h1 class="wrapped-title">🎉 Your Year in OSM Notes 🎉</h1>
                    <div class="wrapped-username">@${data.username}</div>
                    <div class="wrapped-avatar">
                        <img src="${data.avatarUrl}" alt="${data.username}">
                    </div>
                    <div class="wrapped-year">Year ${data.year}</div>
                </div>
            </div>
        `;
  }

  renderSummarySlide(data, index, isActive) {
    return `
            <div class="wrapped-slide ${isActive}" data-slide-index="${index}">
                <div class="wrapped-slide-content">
                    <h2>Your Year Summary</h2>
                    <div class="wrapped-stats">
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">📝</span>
                            <span class="wrapped-stat-label">Notes Closed</span>
                            <span class="wrapped-stat-value">${data.closed}</span>
                        </div>
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">💬</span>
                            <span class="wrapped-stat-label">Comments</span>
                            <span class="wrapped-stat-value">${data.commented}</span>
                        </div>
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">🔄</span>
                            <span class="wrapped-stat-label">Reopened</span>
                            <span class="wrapped-stat-value">${data.reopened}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // ... more renderSlide methods

  attachEventListeners() {
    // Navigation
    document.querySelector('.wrapped-next').addEventListener('click', () => {
      this.nextSlide();
    });

    document.querySelector('.wrapped-prev').addEventListener('click', () => {
      this.prevSlide();
    });

    // Download
    document.querySelector('.wrapped-download').addEventListener('click', () => {
      this.downloadCurrentSlide();
    });

    // Share
    document.querySelector('.wrapped-share').addEventListener('click', () => {
      this.shareCurrentSlide();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.nextSlide();
      if (e.key === 'ArrowLeft') this.prevSlide();
    });
  }

  nextSlide() {
    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      this.updateSlide();
    }
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSlide();
    }
  }

  updateSlide() {
    // Hide current slide
    document.querySelectorAll('.wrapped-slide').forEach((slide, index) => {
      slide.classList.toggle('active', index === this.currentIndex);
    });

    // Update counter
    document.querySelector('.wrapped-counter').textContent =
      `${this.currentIndex + 1} / ${this.slides.length}`;
  }

  async downloadCurrentSlide() {
    const slideElement = document.querySelector(
      `.wrapped-slide[data-slide-index="${this.currentIndex}"]`
    );

    const imageGenerator = new WrappedImageGenerator();
    await imageGenerator.downloadSlide(slideElement);
  }

  shareCurrentSlide() {
    // Implementar compartir
    const shareComponent = new WrappedShare();
    shareComponent.share(this.currentIndex);
  }
}
```

---

### 3. Generador de Imágenes: `wrappedImage.js`

```javascript
// src/js/components/wrappedImage.js

import html2canvas from 'html2canvas';

export class WrappedImageGenerator {
  constructor() {
    this.imageConfig = {
      width: 1200, // Standard width for social media
      height: 630, // Standard height (Twitter/Facebook)
      scale: 2, // For better quality
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    };
  }

  async downloadSlide(slideElement) {
    try {
      // Show loading
      this.showLoading();

      // Generate canvas
      const canvas = await html2canvas(slideElement, this.imageConfig);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `osm-notes-wrapped-slide-${Date.now()}.png`;
          link.click();

          // Cleanup
          URL.revokeObjectURL(url);
          this.hideLoading();
        },
        'image/png',
        0.95
      );
    } catch (error) {
      console.error('Error generating image:', error);
      this.showError('Error generating image. Please try again.');
    }
  }

  async generateAllSlides(slideElements) {
    const images = [];

    for (const slideElement of slideElements) {
      const canvas = await html2canvas(slideElement, this.imageConfig);
      const imageData = canvas.toDataURL('image/png');
      images.push(imageData);
    }

    return images;
  }

  showLoading() {
    // Show spinner or message
    const loading = document.createElement('div');
    loading.className = 'wrapped-loading';
    loading.textContent = 'Generating image...';
    document.body.appendChild(loading);
  }

  hideLoading() {
    const loading = document.querySelector('.wrapped-loading');
    if (loading) loading.remove();
  }

  showError(message) {
    // Mostrar error
    alert(message);
  }
}
```

---

### 4. Streak Calculator: `streakCalculator.js`

```javascript
// src/js/utils/streakCalculator.js

/**
 * Calculate longest streak from activity string
 * @param {string} activityString - 371 character string (53 weeks × 7 days)
 * @returns {Object} { days: number, startDate: Date, endDate: Date }
 */
export function calculateStreak(activityString) {
  if (!activityString || activityString.length === 0) {
    return { days: 0, startDate: null, endDate: null };
  }

  // Parse activity string to dates
  const activities = parseActivityString(activityString);

  // Find longest consecutive sequence
  let maxStreak = 0;
  let currentStreak = 0;
  let streakStart = null;
  let maxStreakStart = null;
  let maxStreakEnd = null;

  // Sort by date
  activities.sort((a, b) => a.date - b.date);

  for (let i = 0; i < activities.length; i++) {
    const current = activities[i];
    const prev = i > 0 ? activities[i - 1] : null;

    if (prev && isConsecutiveDay(prev.date, current.date)) {
      // Continue streak
      currentStreak++;
      if (streakStart === null) {
        streakStart = prev.date;
      }
    } else {
      // New streak
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = streakStart;
        maxStreakEnd = prev ? prev.date : current.date;
      }
      currentStreak = 1;
      streakStart = current.date;
    }
  }

  // Check last streak
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
    maxStreakStart = streakStart;
    maxStreakEnd = activities[activities.length - 1].date;
  }

  return {
    days: maxStreak,
    startDate: maxStreakStart,
    endDate: maxStreakEnd,
  };
}

/**
 * Parse activity string to array of dates with activity
 * @param {string} activityString - 371 character string
 * @returns {Array} Array of { date: Date, value: number }
 */
function parseActivityString(activityString) {
  const activities = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 371); // Go back 371 days

  for (let i = 0; i < activityString.length; i++) {
    const value = parseInt(activityString[i], 10);
    if (value > 0) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      activities.push({ date, value });
    }
  }

  return activities;
}

/**
 * Check if two dates are consecutive days
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isConsecutiveDay(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Count active days from activity string
 * @param {string} activityString
 * @returns {number}
 */
export function countActiveDays(activityString) {
  if (!activityString) return 0;
  return activityString.split('').filter((char) => parseInt(char, 10) > 0).length;
}
```

---

### 5. CSS Styles: `wrapped.css`

```css
/* src/css/wrapped.css */

.wrapped-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.wrapped-slides {
  position: relative;
  min-height: 600px;
}

.wrapped-slide {
  display: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  color: white;
  text-align: center;
}

.wrapped-slide.active {
  display: block;
  animation: slideIn 0.5s ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.wrapped-slide-content {
  max-width: 800px;
  margin: 0 auto;
}

.wrapped-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: bold;
}

.wrapped-username {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.wrapped-avatar img {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px solid white;
  margin-bottom: 1rem;
}

.wrapped-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 2rem;
}

.wrapped-stat {
  background: rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.wrapped-stat-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.wrapped-stat-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.wrapped-stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
}

.wrapped-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-top: 2rem;
}

.wrapped-controls button {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s;
}

.wrapped-controls button:hover {
  transform: scale(1.05);
}

.wrapped-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wrapped-counter {
  font-size: 1.1rem;
  font-weight: bold;
}

.wrapped-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.wrapped-actions button {
  padding: 1rem 2rem;
  background: white;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.2s;
}

.wrapped-actions button:hover {
  background: var(--primary-color);
  color: white;
}

.wrapped-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  z-index: 10000;
}

/* Responsive */
@media (max-width: 768px) {
  .wrapped-slide {
    padding: 2rem 1rem;
  }

  .wrapped-title {
    font-size: 2rem;
  }

  .wrapped-stats {
    grid-template-columns: 1fr;
  }
}
```

---

## 🔧 Integration with Existing Project

### Modify `userProfile.js`

Add button to generate wrapped:

```javascript
// In userProfile.js, after loading profile

function addWrappedButton(user) {
  const actionsSection = document.getElementById('profileActions');
  if (!actionsSection) return;

  const wrappedButton = document.createElement('button');
  wrappedButton.className = 'wrapped-button';
  wrappedButton.innerHTML = '🎉 Generate My Wrapped';
  wrappedButton.onclick = () => {
    window.location.href = `/pages/wrapped.html?username=${encodeURIComponent(user.username)}`;
  };

  actionsSection.appendChild(wrappedButton);
}
```

### Add to `package.json`

```json
{
  "dependencies": {
    "html2canvas": "^1.4.1"
  }
}
```

### Installation

```bash
npm install html2canvas
```

---

## 📱 Social Media Optimization

### Image Dimensions

- **Twitter:** 1200x630px (ratio 1.91:1)
- **Facebook:** 1200x630px
- **LinkedIn:** 1200x627px
- **Instagram:** 1080x1080px (square)

### Open Graph Metadata

Add to `wrapped.html`:

```html
<meta property="og:title" content="My OSM Notes Wrapped 2024" />
<meta property="og:description" content="Discover my contributions to OpenStreetMap notes" />
<meta property="og:image" content="[Generated image URL]" />
<meta property="og:type" content="website" />
```

---

## 🧪 Testing

### Test Cases

1. **User with complete data**
   - Verify all slides are generated
   - Verify metric calculations

2. **User with minimal data**
   - Verify handling of missing data
   - Verify appropriate messages

3. **Image generation**
   - Verify image quality
   - Verify file size
   - Verify PNG format

4. **Navigation**
   - Verify previous/next buttons
   - Verify keyboard (arrows)
   - Verify slide counter

5. **Sharing**
   - Verify sharing links
   - Verify image download

---

## 🚀 Implementation Roadmap

### Phase 1: MVP (2 weeks)

- [ ] Basic slide structure
- [ ] 3-4 main slides
- [ ] Basic navigation
- [ ] Simple image generation

### Phase 2: Complete Functionality (2 weeks)

- [ ] All slides (10 slides)
- [ ] Streak calculation
- [ ] Integration with user profile
- [ ] Social media sharing

### Phase 3: Improvements (1 week)

- [ ] Animations and transitions
- [ ] Image optimization
- [ ] Internationalization (i18n)
- [ ] Tests

### Phase 4: Polish (1 week)

- [ ] Refined visual design
- [ ] Performance optimization
- [ ] Documentation
- [ ] Launch

---

## 📝 Additional Considerations

### Performance

- **Lazy loading:** Load slides only when needed
- **Image optimization:** Compress generated images
- **Caching:** Cache user data

### Accessibility

- **Keyboard navigation:** Already implemented
- **Screen readers:** Add ARIA labels
- **Contrast:** Verify color contrast

### Privacy

- **User data:** Only show public data
- **Images:** Don't store generated images
- **Tracking:** Optional, with consent

---

## 🔗 References

- [OSM Wrapped](https://osmwrapped.com/) - Inspiration
- [html2canvas Documentation](https://html2canvas.hertzen.com/)
- [OpenStreetMap API](https://wiki.openstreetmap.org/wiki/API)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

---

## 📄 License

This document is part of the OSM Notes Viewer project and is under the same license as the project
(MIT).

---

## 🔍 Additional Implementation Information

### Example HTML Structure

Based on the structure of `user.html`, the HTML for `wrapped.html` should follow the same pattern:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OSM Notes Wrapped - OSM Notes Viewer</title>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../css/main.css" />
    <link rel="stylesheet" href="../css/profile.css" />
    <link rel="stylesheet" href="../css/wrapped.css" />
  </head>
  <body>
    <header class="header">
      <div class="container">
        <h1 class="logo">
          <a
            href="../index.html"
            style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem;"
          >
            <img src="../images/logo.svg" alt="OSM Notes Viewer" style="height: 2.5rem;" />
          </a>
        </h1>
        <nav class="nav">
          <a href="../index.html" class="nav-link">Home</a>
          <a href="explore.html" class="nav-link">Explore</a>
          <a href="stats.html" class="nav-link">Stats</a>
          <a href="about.html" class="nav-link">About</a>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div id="wrappedLoading" class="loading">Generating your wrapped...</div>
        <div id="wrappedError" class="error" style="display: none;"></div>
        <div id="wrappedContainer" style="display: none;">
          <!-- Slides will be rendered here -->
        </div>
      </div>
    </main>

    <script type="module" src="../js/pages/wrapped.js"></script>
  </body>
</html>
```

### Integration with i18n

The project uses an i18n system. To add translations for Wrapped:

1. **Add translations to locale files:**

```javascript
// src/locales/es.js
export default {
  // ... traducciones existentes
  wrapped: {
    title: 'Tu Año en OSM Notes',
    generating: 'Generando tu resumen...',
    slideCover: 'Tu Año en OSM Notes',
    slideSummary: 'Tu Resumen del Año',
    slideBestDay: 'Tu Día Más Productivo',
    slideCountries: 'Países donde Contribuiste',
    slideStreak: 'Tu Racha de Contribución',
    slideWorkingHours: 'Tus Horas de Actividad',
    slideHeatmap: 'Tu Actividad Durante el Año',
    slideHashtags: 'Tus Hashtags Más Usados',
    slideMilestones: 'Logros y Milestones',
    slideClosing: '¡Gracias por Contribuir!',
    notesClosed: 'Notas Cerradas',
    comments: 'Comentarios',
    reopened: 'Reabiertas',
    previous: 'Anterior',
    next: 'Siguiente',
    download: 'Descargar Slide',
    share: 'Compartir',
    daysConsecutive: 'días consecutivos',
    activeDays: 'días activos',
    inactiveDays: 'días sin actividad',
  },
};
```

2. **Usar en el código:**

```javascript
import { t } from '../utils/i18n.js';

// Instead of hardcoded text
const title = t('wrapped.slideCover');
```

### Modify vite.config.js

Add `wrapped.html` to Rollup input:

```javascript
// vite.config.js
rollupOptions: {
    input: {
        main: resolve(__dirname, 'src/index.html'),
        user: resolve(__dirname, 'src/pages/user.html'),
        country: resolve(__dirname, 'src/pages/country.html'),
        explore: resolve(__dirname, 'src/pages/explore.html'),
        about: resolve(__dirname, 'src/pages/about.html'),
        wrapped: resolve(__dirname, 'src/pages/wrapped.html'), // ← Add this line
    },
    // ...
}
```

### Error Handling

Follow the existing project pattern:

```javascript
// Similar to userProfile.js
function showError(message) {
  const errorDiv = document.getElementById('wrappedError');
  const loading = document.getElementById('wrappedLoading');

  if (loading) loading.style.display = 'none';
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// In catch
try {
  // ... code
} catch (error) {
  console.error('Error loading wrapped:', error);
  showError(`Failed to load wrapped: ${error.message}`);
}
```

### Reusable Components

The project already has components that can be reused:

1. **Activity Heatmap:**

```javascript
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
// Use directly in heatmap slide
```

2. **Working Hours Heatmap:**

```javascript
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
// Use in working hours slide
```

3. **Country Flags:**

```javascript
import { getCountryFlag } from '../utils/countryFlags.js';
// To show flags in countries slide
```

4. **User Avatar:**

```javascript
import { getUserAvatar, loadOSMAvatarInBackground } from '../utils/userAvatar.js';
// For cover slide
```

5. **Formatters:**

```javascript
import { formatNumber, formatDate } from '../utils/formatter.js';
// To format numbers and dates
```

### Real JSON Example

To better understand the structure, it would be useful to see a real example. The document assumes
the structure based on `API.md`, but having a real example would help to:

- Verify optional vs required fields
- Understand null/undefined values
- See real date formats
- Verify nested array structure

**Recommendation:** Before implementing, get a real JSON from a user to validate the structure.

### Testing with Real Data

1. **User with complete data:** Test with an active user
2. **New user:** Test with minimal data
3. **User without recent activity:** Verify handling of empty `last_year_activity`
4. **User without countries:** Verify empty `countries_solving_notes`
5. **User without hashtags:** Verify empty `hashtags`

### Performance Considerations

1. **Lazy loading of slides:** Don't render all slides at once
2. **Image generation:** Can be slow, show loading
3. **Caching:** Reuse data already loaded from profile if coming from there
4. **Mobile:** `html2canvas` can be heavy on mobile, consider timeout

### Debugging

Add logging similar to existing project:

```javascript
console.log('Loading wrapped for user:', username);
console.log('User data:', userData);
console.log('Calculated metrics:', calculatedMetrics);
console.log('Generated slides:', slides.length);
```

---

## ✅ Implementation Checklist

### Phase 1: Setup

- [ ] Install `html2canvas`: `npm install html2canvas`
- [ ] Create `src/pages/wrapped.html`
- [ ] Create `src/css/wrapped.css`
- [ ] Create `src/js/pages/wrapped.js`
- [ ] Add `wrapped.html` to `vite.config.js`
- [ ] Add translations to locale files

### Phase 2: Base Components

- [ ] Create `src/js/components/wrappedSlides.js`
- [ ] Create `src/js/components/wrappedImage.js`
- [ ] Create `src/js/utils/streakCalculator.js`
- [ ] Implement user data loading
- [ ] Implement metric calculation

### Phase 3: Slides

- [ ] Slide 1: Cover
- [ ] Slide 2: Summary
- [ ] Slide 3: Best day
- [ ] Slide 4: Countries
- [ ] Slide 5: Streak
- [ ] Slide 6: Working hours
- [ ] Slide 7: Heatmap
- [ ] Slide 8: Hashtags
- [ ] Slide 9: Milestones
- [ ] Slide 10: Closing

### Phase 4: Functionality

- [ ] Navigation between slides
- [ ] Image generation
- [ ] Image download
- [ ] Social media sharing
- [ ] Integration with user profile

### Phase 5: Polish

- [ ] Animations and transitions
- [ ] Responsive design
- [ ] Image optimization
- [ ] Testing with real data
- [ ] Documentation

---

**Última actualización:** 2025-01-XX **Autor:** Equipo OSM Notes Viewer **Versión:** 1.1
