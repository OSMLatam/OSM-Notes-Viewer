// Note Map Utility
// Functions to generate embedded maps for OpenStreetMap notes

/**
 * Generate an embedded map URL for an OSM note
 * @param {number} noteId - OSM note ID
 * @returns {string} Embedded map URL
 */
export function getNoteMapUrl(noteId) {
  if (!noteId) return '';

  // OSM embedded map URL for notes
  // Using bbox= parameter to show the note location
  return `https://www.openstreetmap.org/note/${noteId}`;
}

/**
 * Generate an iframe embed URL for an OSM note
 * Note: OSM doesn't provide direct iframe embedding, so we'll use a workaround
 * @param {number} noteId - OSM note ID
 * @returns {string} URL that can be used for display
 */
export function getNoteEmbedUrl(noteId) {
  if (!noteId) return '';

  // Since OSM doesn't support direct iframe embedding, we'll create a link
  // that opens the note page. For a visual preview, we could use a screenshot service
  // or display a placeholder with a link.
  return `https://www.openstreetmap.org/note/${noteId}`;
}

/**
 * Create a note card HTML element
 * @param {Object} note - Note object with id and optional title
 * @returns {string} HTML string for the note card
 */
export function createNoteCard(note) {
  if (!note || !note.id) return '';

  const noteUrl = getNoteEmbedUrl(note.id);
  const title = note.title || `Note #${note.id}`;
  const date = note.date ? new Date(note.date).toLocaleDateString() : '';

  return `
        <div class="note-card" onclick="window.open('${noteUrl}', '_blank')">
            <div class="note-card-map">
                <!-- Static map preview or placeholder -->
                <img src="https://www.openstreetmap.org/export/embed.html?bbox=${note.lon - 0.001},${note.lat - 0.001},${note.lon + 0.001},${note.lat + 0.001}&layer=mapnik&marker=${note.lat},${note.lon}"
                     alt="Note ${note.id} location"
                     style="width: 100%; height: 100%; object-fit: cover; background: var(--bg-light);"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect fill=%27%23ddd%27 width=%27100%27 height=%27100%27/%3E%3Ctext x=%2750%27 y=%2750%27 text-anchor=%27middle%27 fill=%27%23999%27%3ENote %23${note.id}%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="note-card-info">
                <div class="note-card-title">${title}</div>
                <div class="note-card-meta">
                    <span>${date}</span>
                    <a href="${noteUrl}" target="_blank" class="note-card-link" onclick="event.stopPropagation()">
                        View ↗
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create note cards from a list of note IDs
 * @param {Array<number>} noteIds - Array of note IDs
 * @param {string} type - Type of notes ('open' or 'closed')
 * @returns {string} HTML string with all note cards
 */
export function createNoteCards(noteIds, type = 'open') {
  if (!noteIds || noteIds.length === 0) {
    return '<p style="text-align: center; color: var(--text-light); font-size: 0.9rem;">No recent notes available</p>';
  }

  // For now, we'll just create cards with the note IDs
  // In a real implementation, you'd fetch note details from OSM API
  const cards = noteIds.slice(0, 5).map((id) => ({
    id: id,
    title: `${type === 'open' ? 'Open' : 'Closed'} Note #${id}`,
    date: new Date().toLocaleDateString(),
    lat: 0, // Would need to fetch from OSM API
    lon: 0, // Would need to fetch from OSM API
  }));

  return cards.map(createNoteCard).join('');
}

/**
 * Create a simple note card without map (when coordinates are not available)
 * @param {number} noteId - Note ID
 * @param {string} type - Type of note
 * @returns {string} HTML string for simple note card
 */
export function createSimpleNoteCard(noteId, type = 'open') {
  if (!noteId) return '';

  const noteUrl = `https://www.openstreetmap.org/note/${noteId}`;

  return `
        <div class="note-card" onclick="window.open('${noteUrl}', '_blank')">
            <div class="note-card-map" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">
                📍
            </div>
            <div class="note-card-info">
                <div class="note-card-title">${type === 'open' ? 'Open' : 'Closed'} Note #${noteId}</div>
                <div class="note-card-meta">
                    <span>View on OSM</span>
                    <a href="${noteUrl}" target="_blank" class="note-card-link" onclick="event.stopPropagation()">
                        Open ↗
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Fetch note details from OSM API
 * @param {number} noteId - Note ID
 * @returns {Promise<Object>} Note details with coordinates
 */
async function fetchNoteDetails(noteId) {
  try {
    console.log('Fetching from OSM API for note ID:', noteId);
    const response = await fetch(`https://api.openstreetmap.org/api/0.6/notes/${noteId}.json`);
    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error('Error fetching note:', response.status, response.statusText);
      throw new Error('Note not found');
    }

    const data = await response.json();
    console.log('Received data:', data);
    console.log('data.type:', data.type);
    console.log('data.geometry:', data.geometry);
    console.log('data.geometry.coordinates:', data.geometry?.coordinates);

    // Handle GeoJSON format from OSM Notes API
    if (data.type === 'Feature' && data.geometry && data.geometry.coordinates) {
      console.log('Processing as GeoJSON Feature...');
      const [lon, lat] = data.geometry.coordinates;
      const result = {
        id: data.properties.id || noteId,
        lat: lat,
        lon: lon,
        status: data.properties.status || 'open',
        comments: data.properties.comments?.length || 0,
      };
      console.log('Parsed note details:', result);
      return result;
    } else {
      console.log('NOT GeoJSON Feature, trying other formats...');
    }

    // Handle old API format (backup)
    if (data.elements && data.elements.length > 0) {
      const note = data.elements[0];
      const result = {
        id: note.id,
        lat: note.lat,
        lon: note.lon,
        status: note.status,
        comments: note.comments?.length || 0,
      };
      console.log('Parsed note details:', result);
      return result;
    }
  } catch (error) {
    console.error('Could not fetch note details:', error);
  }
  return null;
}

/**
 * Create a note card with interactive Leaflet map
 * @param {number} noteId - Note ID
 * @param {string} type - Type of note
 * @returns {Promise<HTMLElement>} DOM element with map
 */
export async function createNoteCardWithMap(noteId, type = 'open') {
  if (!noteId) return null;

  console.log('Creating note card for note ID:', noteId);
  console.log('Leaflet available?', typeof window.L);

  const noteUrl = `https://www.openstreetmap.org/note/${noteId}`;
  const container = document.createElement('div');
  container.className = 'note-card';
  container.style.cursor = 'pointer';
  container.onclick = () => window.open(noteUrl, '_blank');

  // Create map container
  const mapContainer = document.createElement('div');
  mapContainer.className = 'note-card-map';
  mapContainer.style.height = '200px';
  mapContainer.style.position = 'relative';

  // Create info section
  const infoContainer = document.createElement('div');
  infoContainer.className = 'note-card-info';
  infoContainer.innerHTML = `
        <div class="note-card-title">${type === 'open' ? 'Open' : 'Closed'} Note #${noteId}</div>
        <div class="note-card-meta">
            <span>View on OSM</span>
            <a href="${noteUrl}" target="_blank" class="note-card-link" onclick="event.stopPropagation()">
                Open ↗
            </a>
        </div>
    `;

  container.appendChild(mapContainer);
  container.appendChild(infoContainer);

  // Try to fetch note details and create map
  console.log('Fetching note details for ID:', noteId);
  const noteDetails = await fetchNoteDetails(noteId);
  console.log('Note details:', noteDetails);

  if (noteDetails && noteDetails.lat && noteDetails.lon && window.L) {
    try {
      // Create map with Leaflet
      const map = window.L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      // Use OSM tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Set view to note location
      map.setView([noteDetails.lat, noteDetails.lon], 15);

      // Add marker
      const icon = window.L.divIcon({
        className: 'note-marker',
        html: '<div style="background: #ff0000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      window.L.marker([noteDetails.lat, noteDetails.lon], { icon: icon })
        .addTo(map)
        .bindPopup(`<b>Note #${noteId}</b>`);
    } catch (error) {
      console.error('Error creating Leaflet map:', error);
      // Fallback to placeholder
      mapContainer.style.background =
        'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)';
      mapContainer.style.display = 'flex';
      mapContainer.style.alignItems = 'center';
      mapContainer.style.justifyContent = 'center';
      mapContainer.style.color = 'white';
      mapContainer.style.fontSize = '1.5rem';
      mapContainer.innerHTML = '📍';
    }
  } else {
    // Fallback to placeholder
    mapContainer.style.background =
      'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)';
    mapContainer.style.display = 'flex';
    mapContainer.style.alignItems = 'center';
    mapContainer.style.justifyContent = 'center';
    mapContainer.style.color = 'white';
    mapContainer.style.fontSize = '1.5rem';
    mapContainer.innerHTML = '📍';
  }

  return container;
}
