# OSM Notes Wrapped - Plan de Desarrollo

## 📋 Resumen Ejecutivo

Este documento describe el plan de desarrollo para implementar una funcionalidad similar a "OSM
Wrapped" (https://osmwrapped.com/) pero enfocada en métricas de notas de OpenStreetMap. La
funcionalidad permitirá a los usuarios generar y compartir un resumen visual de sus contribuciones a
las notas de OSM.

**Objetivo:** Crear una experiencia compartible en redes sociales que celebre las contribuciones de
los usuarios a las notas de OSM y ayude a difundir el proyecto.

---

## 🎯 Objetivos

1. **Generar resúmenes visuales** de las contribuciones anuales de usuarios
2. **Crear imágenes compartibles** optimizadas para redes sociales
3. **Aumentar la visibilidad** del proyecto OSM Notes Viewer
4. **Motivar a más usuarios** a resolver notas de OSM

---

## 📊 Datos Disponibles

### Fuentes de Datos

1. **JSON de Analytics** (proyecto hermano OSM-Notes-Analytics)
   - Archivo: `/api/users/{user_id}.json`
   - Contiene todas las métricas necesarias

2. **API de OSM** (opcional, para datos adicionales)
   - Avatar: `https://www.openstreetmap.org/api/0.6/user/{user_id}.json`
   - Información del usuario

### Métricas Disponibles en JSON

```json
{
  "user_id": 12345,
  "username": "example_user",

  // Totales (lifetime)
  "history_whole_open": 542,
  "history_whole_closed": 234,
  "history_whole_commented": 123,
  "history_whole_reopened": 12,

  // Año actual
  "history_year_open": 45,
  "history_year_closed": 23,
  "history_year_commented": 10,
  "history_year_reopened": 2,

  // Mes actual
  "history_month_open": 5,
  "history_month_closed": 3,

  // Día actual
  "history_day_open": 0,
  "history_day_closed": 1,

  // Fechas importantes
  "date_starting_creating_notes": "2015-03-20",
  "date_starting_solving_notes": "2015-04-15",

  // Días más activos
  "dates_most_open": [
    {"rank": 1, "date": "2024-03-15", "quantity": 45}
  ],
  "dates_most_closed": [
    {"rank": 1, "date": "2024-06-10", "quantity": 23}
  ],

  // Países
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

  // Patrones de trabajo
  "working_hours_of_week_opening": [...],
  "working_hours_of_week_closing": [...],

  // Heatmap del año (371 caracteres)
  "last_year_activity": "001002003..."
}
```

### Métricas que Necesitan Cálculo

1. **Longest Streak** (días consecutivos)
   - Calcular desde `last_year_activity` o `dates_most_*`
   - Algoritmo: buscar secuencia más larga de días con actividad

2. **Most Active Month** del año
   - Agregar datos de `last_year_activity` por mes
   - O usar `dates_most_*` agrupados por mes

3. **Percentiles** (comparación con otros usuarios)
   - Requiere datos del índice de usuarios
   - Calcular posición relativa

---

## 🏗️ Arquitectura

### Opción Recomendada: Integrado en User Profile

```
/user.html?username=xxx&wrapped=true
```

**Ventajas:**

- Reutiliza infraestructura existente
- Acceso directo desde perfil de usuario
- No requiere nueva página

**Flujo:**

1. Usuario visita su perfil
2. Botón "Generate My Wrapped" visible
3. Click genera slides interactivos
4. Opción de descargar/compartir cada slide

### Alternativa: Página Dedicada

```
/wrapped.html?username=xxx
```

**Ventajas:**

- Más control sobre diseño
- Puede incluir animaciones/video
- Experiencia más inmersiva

---

## 🛠️ Stack Tecnológico

### Dependencias Nuevas

```json
{
  "dependencies": {
    "html2canvas": "^1.4.1", // Generación de imágenes
    "dom-to-image": "^2.6.0" // Alternativa más ligera
  }
}
```

**Recomendación:** `html2canvas` es más maduro y tiene mejor soporte.

### Herramientas Existentes (Reutilizar)

- ✅ `Chart.js` - Para gráficos
- ✅ SVG heatmaps - Para visualizaciones
- ✅ `apiClient.js` - Para obtener datos
- ✅ `formatter.js` - Para formatear números/fechas
- ✅ `share.js` - Para compartir
- ✅ `i18n.js` - Para internacionalización

---

## 📐 Diseño de Slides

### Slide 1: Portada

```
┌─────────────────────────────────┐
│   🎉 Tu Año en OSM Notes 🎉   │
│                                 │
│        @username                │
│                                 │
│    [Avatar del usuario]         │
│                                 │
│    Año 2024                     │
└─────────────────────────────────┘
```

**Datos:**

- `username`
- Avatar de OSM API
- Año actual

---

### Slide 2: Resumen del Año

```
┌─────────────────────────────────┐
│   Tu Resumen del Año            │
│                                 │
│   📝 Notas Cerradas: 234       │
│   💬 Comentarios: 123           │
│   🔄 Reabiertas: 12             │
│                                 │
│   vs Año Anterior: +45% ⬆️      │
└─────────────────────────────────┘
```

**Datos:**

- `history_year_closed`
- `history_year_commented`
- `history_year_reopened`
- Comparación con año anterior (si disponible)

---

### Slide 3: Tu Mejor Día

```
┌─────────────────────────────────┐
│   Tu Día Más Productivo         │
│                                 │
│   📅 15 de Marzo, 2024          │
│                                 │
│   Cerraste 45 notas en un día!  │
│                                 │
│   🏆 Récord Personal            │
└─────────────────────────────────┘
```

**Datos:**

- `dates_most_closed[0]`
- Formato: fecha legible
- Cantidad

---

### Slide 4: Países donde Contribuiste

```
┌─────────────────────────────────┐
│   Países donde Contribuiste     │
│                                 │
│   🗺️ Top 3 Países:              │
│                                 │
│   1. 🇨🇴 Colombia - 80 notas    │
│   2. 🇪🇨 Ecuador - 45 notas     │
│   3. 🇵🇪 Perú - 23 notas        │
│                                 │
│   Total: 5 países               │
└─────────────────────────────────┘
```

**Datos:**

- `countries_solving_notes` (top 3)
- Total de países únicos
- Banderas (usar `countryFlags.js` existente)

---

### Slide 5: Tu Racha Más Larga

```
┌─────────────────────────────────┐
│   Tu Racha de Contribución      │
│                                 │
│   🔥 15 días consecutivos       │
│                                 │
│   Del 1 al 15 de Junio          │
│                                 │
│   ¡Increíble consistencia!      │
└─────────────────────────────────┘
```

**Datos:**

- Calcular desde `last_year_activity`
- Fechas de inicio y fin

---

### Slide 6: Horas de Trabajo

```
┌─────────────────────────────────┐
│   Tus Horas de Actividad        │
│                                 │
│   [Heatmap 24x7]                │
│                                 │
│   Hora más activa: 14:00         │
│   Día más activo: Viernes       │
└─────────────────────────────────┘
```

**Datos:**

- `working_hours_of_week_closing`
- Reutilizar componente `workingHoursHeatmap.js`
- Calcular hora/día más activo

---

### Slide 7: Heatmap del Año

```
┌─────────────────────────────────┐
│   Tu Actividad Durante el Año   │
│                                 │
│   [GitHub-style heatmap]       │
│                                 │
│   234 días activos              │
│   131 días sin actividad        │
└─────────────────────────────────┘
```

**Datos:**

- `last_year_activity`
- Reutilizar componente `activityHeatmap.js`
- Calcular días activos vs inactivos

---

### Slide 8: Hashtags Favoritos

```
┌─────────────────────────────────┐
│   Tus Hashtags Más Usados       │
│                                 │
│   #mapathon - 45 veces          │
│   #survey - 23 veces             │
│   #fixme - 12 veces              │
│                                 │
│   Total: 8 hashtags únicos      │
└─────────────────────────────────┘
```

**Datos:**

- `hashtags` (top 3)
- Total de hashtags únicos

---

### Slide 9: Milestones

```
┌─────────────────────────────────┐
│   Logros y Milestones           │
│                                 │
│   🎯 Primera nota: 2015-03-20   │
│   ✅ Primera resuelta: 2015-04-15│
│                                 │
│   📊 Total lifetime:            │
│   • 542 notas abiertas          │
│   • 234 notas cerradas          │
└─────────────────────────────────┘
```

**Datos:**

- `date_starting_creating_notes`
- `date_starting_solving_notes`
- `history_whole_open`
- `history_whole_closed`

---

### Slide 10: Cierre y Compartir

```
┌─────────────────────────────────┐
│   ¡Gracias por Contribuir!      │
│                                 │
│   Sigue resolviendo notas        │
│   y ayudando a mejorar OSM      │
│                                 │
│   [Logo del proyecto]           │
│                                 │
│   Ver perfil completo:          │
│   notes.osm.lat/...             │
└─────────────────────────────────┘
```

**Datos:**

- Link al perfil completo
- Branding del proyecto

---

## 💻 Implementación Técnica

### Estructura de Archivos

```
src/
├── js/
│   ├── pages/
│   │   └── wrapped.js          # Lógica principal del wrapped
│   ├── components/
│   │   ├── wrappedSlides.js    # Generador de slides
│   │   ├── wrappedImage.js     # Generador de imágenes
│   │   └── wrappedShare.js     # Compartir wrapped
│   └── utils/
│       └── streakCalculator.js # Calcular rachas
├── css/
│   └── wrapped.css             # Estilos para slides
└── pages/
    └── wrapped.html            # Página del wrapped (opcional)
```

---

### 1. Componente Principal: `wrapped.js`

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
      // 1. Cargar datos del usuario
      this.userData = await this.loadUserData(username);

      // 2. Calcular métricas adicionales
      this.calculatedMetrics = this.calculateMetrics(this.userData);

      // 3. Generar slides
      this.slides = this.generateSlides(this.userData, this.calculatedMetrics);

      // 4. Renderizar
      this.render();
    } catch (error) {
      console.error('Error loading wrapped:', error);
      this.showError(error.message);
    }
  }

  async loadUserData(username) {
    // Si tenemos username, buscar user_id
    if (isNaN(username)) {
      const userIndex = await apiClient.getUserIndex();
      const user = userIndex.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!user) throw new Error('User not found');
      username = user.user_id;
    }

    // Cargar perfil completo
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

### 2. Generador de Slides: `wrappedSlides.js`

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
                    <button class="wrapped-prev">← Anterior</button>
                    <span class="wrapped-counter">1 / ${this.slides.length}</span>
                    <button class="wrapped-next">Siguiente →</button>
                </div>
                <div class="wrapped-actions">
                    <button class="wrapped-download">📥 Descargar Slide</button>
                    <button class="wrapped-share">🔗 Compartir</button>
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
                    <h1 class="wrapped-title">🎉 Tu Año en OSM Notes 🎉</h1>
                    <div class="wrapped-username">@${data.username}</div>
                    <div class="wrapped-avatar">
                        <img src="${data.avatarUrl}" alt="${data.username}">
                    </div>
                    <div class="wrapped-year">Año ${data.year}</div>
                </div>
            </div>
        `;
  }

  renderSummarySlide(data, index, isActive) {
    return `
            <div class="wrapped-slide ${isActive}" data-slide-index="${index}">
                <div class="wrapped-slide-content">
                    <h2>Tu Resumen del Año</h2>
                    <div class="wrapped-stats">
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">📝</span>
                            <span class="wrapped-stat-label">Notas Cerradas</span>
                            <span class="wrapped-stat-value">${data.closed}</span>
                        </div>
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">💬</span>
                            <span class="wrapped-stat-label">Comentarios</span>
                            <span class="wrapped-stat-value">${data.commented}</span>
                        </div>
                        <div class="wrapped-stat">
                            <span class="wrapped-stat-icon">🔄</span>
                            <span class="wrapped-stat-label">Reabiertas</span>
                            <span class="wrapped-stat-value">${data.reopened}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // ... más métodos renderSlide

  attachEventListeners() {
    // Navegación
    document.querySelector('.wrapped-next').addEventListener('click', () => {
      this.nextSlide();
    });

    document.querySelector('.wrapped-prev').addEventListener('click', () => {
      this.prevSlide();
    });

    // Descargar
    document.querySelector('.wrapped-download').addEventListener('click', () => {
      this.downloadCurrentSlide();
    });

    // Compartir
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
    // Ocultar slide actual
    document.querySelectorAll('.wrapped-slide').forEach((slide, index) => {
      slide.classList.toggle('active', index === this.currentIndex);
    });

    // Actualizar contador
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
      width: 1200, // Ancho estándar para redes sociales
      height: 630, // Alto estándar (Twitter/Facebook)
      scale: 2, // Para mejor calidad
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    };
  }

  async downloadSlide(slideElement) {
    try {
      // Mostrar loading
      this.showLoading();

      // Generar canvas
      const canvas = await html2canvas(slideElement, this.imageConfig);

      // Convertir a blob
      canvas.toBlob(
        (blob) => {
          // Crear link de descarga
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `osm-notes-wrapped-slide-${Date.now()}.png`;
          link.click();

          // Limpiar
          URL.revokeObjectURL(url);
          this.hideLoading();
        },
        'image/png',
        0.95
      );
    } catch (error) {
      console.error('Error generating image:', error);
      this.showError('Error al generar imagen. Intenta de nuevo.');
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
    // Mostrar spinner o mensaje
    const loading = document.createElement('div');
    loading.className = 'wrapped-loading';
    loading.textContent = 'Generando imagen...';
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

### 4. Calculador de Rachas: `streakCalculator.js`

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

### 5. Estilos CSS: `wrapped.css`

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

## 🔧 Integración con el Proyecto Existente

### Modificar `userProfile.js`

Agregar botón para generar wrapped:

```javascript
// En userProfile.js, después de cargar el perfil

function addWrappedButton(user) {
  const actionsSection = document.getElementById('profileActions');
  if (!actionsSection) return;

  const wrappedButton = document.createElement('button');
  wrappedButton.className = 'wrapped-button';
  wrappedButton.innerHTML = '🎉 Generar Mi Wrapped';
  wrappedButton.onclick = () => {
    window.location.href = `/pages/wrapped.html?username=${encodeURIComponent(user.username)}`;
  };

  actionsSection.appendChild(wrappedButton);
}
```

### Agregar a `package.json`

```json
{
  "dependencies": {
    "html2canvas": "^1.4.1"
  }
}
```

### Instalación

```bash
npm install html2canvas
```

---

## 📱 Optimización para Redes Sociales

### Dimensiones de Imagen

- **Twitter:** 1200x630px (ratio 1.91:1)
- **Facebook:** 1200x630px
- **LinkedIn:** 1200x627px
- **Instagram:** 1080x1080px (cuadrado)

### Metadatos Open Graph

Agregar a `wrapped.html`:

```html
<meta property="og:title" content="Mi OSM Notes Wrapped 2024" />
<meta
  property="og:description"
  content="Descubre mis contribuciones a las notas de OpenStreetMap"
/>
<meta property="og:image" content="[URL de imagen generada]" />
<meta property="og:type" content="website" />
```

---

## 🧪 Testing

### Casos de Prueba

1. **Usuario con datos completos**
   - Verificar que todos los slides se generen
   - Verificar cálculos de métricas

2. **Usuario con datos mínimos**
   - Verificar manejo de datos faltantes
   - Verificar mensajes apropiados

3. **Generación de imágenes**
   - Verificar calidad de imagen
   - Verificar tamaño de archivo
   - Verificar formato PNG

4. **Navegación**
   - Verificar botones anterior/siguiente
   - Verificar teclado (flechas)
   - Verificar contador de slides

5. **Compartir**
   - Verificar links de compartir
   - Verificar descarga de imágenes

---

## 🚀 Roadmap de Implementación

### Fase 1: MVP (2 semanas)

- [ ] Estructura básica de slides
- [ ] 3-4 slides principales
- [ ] Navegación básica
- [ ] Generación de imágenes simple

### Fase 2: Funcionalidad Completa (2 semanas)

- [ ] Todos los slides (10 slides)
- [ ] Cálculo de rachas
- [ ] Integración con perfil de usuario
- [ ] Compartir en redes sociales

### Fase 3: Mejoras (1 semana)

- [ ] Animaciones y transiciones
- [ ] Optimización de imágenes
- [ ] Internacionalización (i18n)
- [ ] Tests

### Fase 4: Polish (1 semana)

- [ ] Diseño visual refinado
- [ ] Performance optimization
- [ ] Documentación
- [ ] Lanzamiento

---

## 📝 Consideraciones Adicionales

### Performance

- **Lazy loading:** Cargar slides solo cuando se necesiten
- **Image optimization:** Comprimir imágenes generadas
- **Caching:** Cachear datos del usuario

### Accesibilidad

- **Keyboard navigation:** Ya implementado
- **Screen readers:** Agregar ARIA labels
- **Contrast:** Verificar contraste de colores

### Privacidad

- **Datos del usuario:** Solo mostrar datos públicos
- **Imágenes:** No almacenar imágenes generadas
- **Tracking:** Opcional, con consentimiento

---

## 🔗 Referencias

- [OSM Wrapped](https://osmwrapped.com/) - Inspiración
- [html2canvas Documentation](https://html2canvas.hertzen.com/)
- [OpenStreetMap API](https://wiki.openstreetmap.org/wiki/API)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

---

## 📄 Licencia

Este documento es parte del proyecto OSM Notes Viewer y está bajo la misma licencia del proyecto
(MIT).

---

## 🔍 Información Adicional para Implementación

### Estructura HTML de Ejemplo

Basado en la estructura de `user.html`, el HTML para `wrapped.html` debería seguir el mismo patrón:

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

### Integración con i18n

El proyecto usa un sistema de i18n. Para agregar traducciones para Wrapped:

1. **Agregar traducciones a los archivos de locale:**

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

// En lugar de texto hardcodeado
const title = t('wrapped.slideCover');
```

### Modificar vite.config.js

Agregar `wrapped.html` al input de Rollup:

```javascript
// vite.config.js
rollupOptions: {
    input: {
        main: resolve(__dirname, 'src/index.html'),
        user: resolve(__dirname, 'src/pages/user.html'),
        country: resolve(__dirname, 'src/pages/country.html'),
        explore: resolve(__dirname, 'src/pages/explore.html'),
        about: resolve(__dirname, 'src/pages/about.html'),
        wrapped: resolve(__dirname, 'src/pages/wrapped.html'), // ← Agregar esta línea
    },
    // ...
}
```

### Manejo de Errores

Seguir el patrón existente del proyecto:

```javascript
// Similar a userProfile.js
function showError(message) {
  const errorDiv = document.getElementById('wrappedError');
  const loading = document.getElementById('wrappedLoading');

  if (loading) loading.style.display = 'none';
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// En el catch
try {
  // ... código
} catch (error) {
  console.error('Error loading wrapped:', error);
  showError(`Failed to load wrapped: ${error.message}`);
}
```

### Componentes Reutilizables

El proyecto ya tiene componentes que se pueden reutilizar:

1. **Activity Heatmap:**

```javascript
import { renderActivityHeatmap } from '../components/activityHeatmap.js';
// Usar directamente en el slide del heatmap
```

2. **Working Hours Heatmap:**

```javascript
import { renderWorkingHoursSection } from '../components/workingHoursHeatmap.js';
// Usar en el slide de horas de trabajo
```

3. **Country Flags:**

```javascript
import { getCountryFlag } from '../utils/countryFlags.js';
// Para mostrar banderas en el slide de países
```

4. **User Avatar:**

```javascript
import { getUserAvatar, loadOSMAvatarInBackground } from '../utils/userAvatar.js';
// Para el slide de portada
```

5. **Formatters:**

```javascript
import { formatNumber, formatDate } from '../utils/formatter.js';
// Para formatear números y fechas
```

### Ejemplo de JSON Real

Para entender mejor la estructura, sería útil ver un ejemplo real. El documento asume la estructura
basada en `API.md`, pero tener un ejemplo real ayudaría a:

- Verificar campos opcionales vs requeridos
- Entender valores null/undefined
- Ver formatos de fecha reales
- Verificar estructura de arrays anidados

**Recomendación:** Antes de implementar, obtener un JSON real de un usuario para validar la
estructura.

### Testing con Datos Reales

1. **Usuario con datos completos:** Probar con un usuario activo
2. **Usuario nuevo:** Probar con datos mínimos
3. **Usuario sin actividad reciente:** Verificar manejo de `last_year_activity` vacío
4. **Usuario sin países:** Verificar `countries_solving_notes` vacío
5. **Usuario sin hashtags:** Verificar `hashtags` vacío

### Consideraciones de Performance

1. **Lazy loading de slides:** No renderizar todos los slides a la vez
2. **Image generation:** Puede ser lento, mostrar loading
3. **Caching:** Reutilizar datos ya cargados del perfil si vienen desde ahí
4. **Mobile:** `html2canvas` puede ser pesado en móviles, considerar timeout

### Debugging

Agregar logging similar al proyecto existente:

```javascript
console.log('Loading wrapped for user:', username);
console.log('User data:', userData);
console.log('Calculated metrics:', calculatedMetrics);
console.log('Generated slides:', slides.length);
```

---

## ✅ Checklist de Implementación

### Fase 1: Setup

- [ ] Instalar `html2canvas`: `npm install html2canvas`
- [ ] Crear `src/pages/wrapped.html`
- [ ] Crear `src/css/wrapped.css`
- [ ] Crear `src/js/pages/wrapped.js`
- [ ] Agregar `wrapped.html` a `vite.config.js`
- [ ] Agregar traducciones a archivos de locale

### Fase 2: Componentes Base

- [ ] Crear `src/js/components/wrappedSlides.js`
- [ ] Crear `src/js/components/wrappedImage.js`
- [ ] Crear `src/js/utils/streakCalculator.js`
- [ ] Implementar carga de datos de usuario
- [ ] Implementar cálculo de métricas

### Fase 3: Slides

- [ ] Slide 1: Portada
- [ ] Slide 2: Resumen
- [ ] Slide 3: Mejor día
- [ ] Slide 4: Países
- [ ] Slide 5: Racha
- [ ] Slide 6: Horas de trabajo
- [ ] Slide 7: Heatmap
- [ ] Slide 8: Hashtags
- [ ] Slide 9: Milestones
- [ ] Slide 10: Cierre

### Fase 4: Funcionalidad

- [ ] Navegación entre slides
- [ ] Generación de imágenes
- [ ] Descarga de imágenes
- [ ] Compartir en redes sociales
- [ ] Integración con perfil de usuario

### Fase 5: Polish

- [ ] Animaciones y transiciones
- [ ] Responsive design
- [ ] Optimización de imágenes
- [ ] Testing con datos reales
- [ ] Documentación

---

**Última actualización:** 2025-01-XX **Autor:** Equipo OSM Notes Viewer **Versión:** 1.1
