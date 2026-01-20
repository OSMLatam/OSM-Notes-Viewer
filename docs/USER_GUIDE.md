# User Guide

## Overview

OSM Notes Viewer is a web application for exploring and analyzing OpenStreetMap Notes. This guide
will help you navigate and use all the features of the application.

## Table of Contents

1. [Home Page](#home-page)
2. [Searching Notes](#searching-notes)
3. [Viewing Individual Notes](#viewing-individual-notes)
4. [Browsing by Hashtag](#browsing-by-hashtag)
5. [Using the Map Viewer](#using-the-map-viewer)
6. [ML Recommendations](#ml-recommendations)
7. [Using JOSM Tags](#using-josm-tags)
8. [Keyboard Navigation](#keyboard-navigation)
9. [Language Selection](#language-selection)

---

## Home Page

The home page (`/index.html`) provides:

- **Global Statistics**: Overview of total notes, active users, and countries
- **Top Contributors**: Leaderboard of most active users
- **Top Countries**: Most active countries by note activity
- **Search Functionality**: Search for users, countries, or notes

### Searching Notes

1. Click on the **"Notes"** tab in the search section
2. Enter a note ID (e.g., `12345`)
3. Press Enter or click Search
4. You will be redirected to the note viewer page

**Note:** Only numeric note IDs are accepted.

---

## Viewing Individual Notes

**URL:** `/pages/note.html?id={note_id}`

The note viewer displays comprehensive information about a single OSM note.

### Note Information Displayed

1. **Status Badge**: Shows if the note is open, closed, or reopened
2. **Map**: Interactive map showing the exact location of the note
3. **Country Link**: Click to view the country profile where the note is located
4. **Note Content**: The original text of the note
5. **Hashtags**: Clickable hashtags that link to hashtag pages
6. **Activity Timeline**: Chronological list of all interactions:
   - Note creation
   - Comments
   - Note closure
   - Note reopening
7. **User Links**: All users involved are linked to their profiles

### ML Recommendations Section

For **open notes only**, you may see an ML recommendation section that suggests:

- **Action**: What action to take (close, comment, or map)
- **Confidence**: How confident the recommendation is (0-100%)
- **Reason**: Explanation of why this action is recommended
- **JOSM Tags**: If the recommendation is to "map", suggested OSM tags are provided

### Comment Form

- **Comment Field**: Enter your comment text
- **Hashtag Suggestions**: Click suggested hashtags (#surveyme, #invalid) to add them
- **Action Buttons**:
  - **Comment**: Submit a comment (requires OAuth login)
  - **Close Note**: Close the note (requires OAuth login)
  - **Reopen Note**: Reopen a closed note (requires OAuth login)
  - **Report**: Report inappropriate content (requires OAuth login)

**Note:** Action buttons require OAuth authentication with OpenStreetMap. This feature will be
available in a future update.

### Sharing Notes

Click the **"Share"** button to:

- Copy the note URL to clipboard
- Share via social media (Twitter, Facebook, etc.)
- Share via messaging apps (WhatsApp, Telegram)

### Viewing Note XML

Click **"View XML ↗"** to see the raw XML data from the OpenStreetMap API.

---

## Browsing by Hashtag

**URL:** `/pages/hashtag.html?tag={hashtag}`

The hashtag viewer shows all notes that contain a specific hashtag.

### Features

1. **Hashtag Header**: Displays the hashtag and statistics:
   - Number of users who used this hashtag
   - Number of countries where it was used

2. **Filters**:
   - **Status**: Filter by note status (All, Open, Closed, Reopened)
   - **From Date**: Filter notes created after this date
   - **To Date**: Filter notes created before this date
   - Click **"Apply Filters"** to update the list
   - Click **"Clear"** to reset filters

3. **Notes List**: Paginated list of notes with:
   - Note ID and status
   - Creation date
   - Closure date (if closed)
   - Comments count
   - Links to note viewer and country profile

4. **Pagination**: Navigate through pages using:
   - Previous/Next buttons
   - Page number buttons
   - Shows current range (e.g., "Showing 1-20 of 150")

### Keyboard Navigation

- Click on a note card and press **Enter** or **Space** to open it
- Use **Tab** to navigate between filters and buttons

---

## Using the Map Viewer

**URL:** `/pages/map.html`

The map viewer provides three different map views of OSM notes.

### Map Tabs

1. **Open Notes**: Shows all currently open notes
2. **Closed Notes**: Shows all closed notes
3. **Boundaries**: Shows country boundaries and disputed areas

### Map Controls

- **Base Layer**: Switch between OpenStreetMap and Satellite views
- **My Location** (📍): Center the map on your current location
  - Requires geolocation permission
  - Only works for Open Notes and Closed Notes maps
  - Sets initial view to 500km around your location
- **Reset View** (🔄): Return to the initial map view

### Interacting with Notes on the Map

1. Click on any note marker or note location
2. A popup will appear showing:
   - Note ID
   - Link to view the full note details

### WMS Service Documentation

The page includes documentation for using the WMS layers in GIS software:

- **QGIS**: Step-by-step instructions
- **ArcGIS**: Step-by-step instructions
- **WMS URLs**: Copy buttons for each layer endpoint

### Keyboard Navigation

- **Arrow Left/Right**: Switch between map tabs
- **Home**: Go to first tab (Open Notes)
- **End**: Go to last tab (Boundaries)
- **Enter/Space**: Activate selected tab

---

## ML Recommendations

ML (Machine Learning) recommendations help you decide what action to take with an open note.

### Understanding Recommendations

1. **Action Types**:
   - **Close**: The note should be closed (issue resolved or invalid)
   - **Comment**: Add more information or ask for clarification
   - **Map**: The note describes a feature that should be mapped in OSM

2. **Confidence Score**:
   - Higher scores (80%+) indicate more reliable recommendations
   - Lower scores (< 50%) should be reviewed carefully

3. **Reason**: Read the explanation to understand why this action was recommended

### Using Recommendations

- **Close/Comment**: Use the action buttons in the comment form
- **Map**:
  1. Review the suggested JOSM tags
  2. Copy the tags using the "Copy for JOSM" button
  3. Open JOSM editor
  4. Create the feature and paste the tags
  5. Upload the changes to OSM

---

## Using JOSM Tags

When the ML recommendation suggests "map", JOSM tags are provided to help you create the OSM
feature.

### Format

Tags are provided in JOSM format: `key1=value1,key2=value2`

### Steps to Use

1. **Copy Tags**: Click the "Copy for JOSM" button
2. **Open JOSM**: Launch the JOSM editor
3. **Create Feature**:
   - Draw the feature (point, line, or area) at the note location
   - Select the feature
4. **Paste Tags**:
   - Open the Presets menu → Tags
   - Paste the tags in the format: `key1=value1,key2=value2`
   - JOSM will automatically parse and apply the tags
5. **Review**: Verify the tags are correct
6. **Upload**: Upload the changes to OSM
7. **Close Note**: Return to the note viewer and close the note

### Example

If the tags are: `amenity=restaurant,name=El Buen Sabor`

In JOSM:

1. Create a node at the location
2. Open Tags dialog
3. Paste: `amenity=restaurant,name=El Buen Sabor`
4. JOSM will create two tag entries:
   - `amenity` = `restaurant`
   - `name` = `El Buen Sabor`

---

## Keyboard Navigation

The application supports full keyboard navigation for accessibility.

### General Navigation

- **Tab**: Move forward through interactive elements
- **Shift+Tab**: Move backward through interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals or cancel actions

### Note Cards (Hashtag Page)

- **Tab**: Navigate to a note card
- **Enter/Space**: Open the note viewer

### Map Tabs

- **Arrow Left**: Previous tab
- **Arrow Right**: Next tab
- **Home**: First tab (Open Notes)
- **End**: Last tab (Boundaries)
- **Enter/Space**: Activate selected tab

### Skip Links

Press **Tab** when the page loads to see a "Skip to main content" link. This helps screen reader
users navigate faster.

---

## Language Selection

The application supports multiple languages:

- **English** (en)
- **Spanish** (es)
- **German** (de)
- **French** (fr)

### Changing Language

1. Look for the language selector (usually in the header or footer)
2. Click on your preferred language
3. The page will reload with translations applied
4. Your preference is saved in browser storage

### Auto-Detection

The application automatically detects your browser language and uses it if available. Otherwise, it
defaults to English.

---

## Tips and Best Practices

1. **Use Filters**: When browsing hashtags, use filters to narrow down results
2. **Check ML Recommendations**: For open notes, always check ML recommendations for guidance
3. **Review Tags**: Before using JOSM tags, verify they make sense for the location
4. **Share Notes**: Use the share button to collaborate with others
5. **Explore Maps**: Use the map viewer to discover notes in your area
6. **Keyboard Shortcuts**: Learn keyboard shortcuts for faster navigation

---

## Troubleshooting

### Map Not Loading

- **Check Internet Connection**: WMS layers require internet access
- **Allow Geolocation**: If using "My Location", grant geolocation permission
- **Try Different Browser**: Some browsers handle WMS differently

### Note Not Found

- **Verify Note ID**: Ensure you entered a valid numeric ID
- **Check Note Status**: The note might have been deleted from OSM
- **Try Direct OSM Link**: Use the "View XML" link to check if the note exists

### ML Recommendations Not Showing

- **Note Must Be Open**: ML recommendations only appear for open notes
- **API Availability**: The ML service might be temporarily unavailable
- **Check Console**: Open browser developer tools to see error messages

### Geolocation Not Working

- **HTTPS Required**: Geolocation requires HTTPS in production
- **Grant Permission**: Allow location access when prompted
- **Browser Support**: Ensure your browser supports Geolocation API

---

## Getting Help

- **Documentation**: Check the [Architecture Documentation](ARCHITECTURE.md) for technical details
- **GitHub Issues**: Report bugs or request features on GitHub
- **Community**: Join the OSM Latam community discussions

---

## Privacy and Security

- **No Authentication Required**: Viewing notes is public
- **No Tracking**: The application does not track your browsing
- **Local Storage**: Language preference is stored locally in your browser
- **Geolocation**: Your location is only used to center the map and is not stored or transmitted
