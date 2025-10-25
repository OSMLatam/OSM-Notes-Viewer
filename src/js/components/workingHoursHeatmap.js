// Working Hours Heatmap Component (24h x 7 days)
import { i18n } from '../utils/i18n.js';

/**
 * Render working hours heatmap
 * @param {Array} workingHours - Array of {day_of_week, hour_of_day, count}
 * @param {HTMLElement} container - Container element
 * @param {string} title - Title for the heatmap
 */
export function renderWorkingHoursHeatmap(workingHours, container, title = 'Working Hours') {
    if (!workingHours || workingHours.length === 0) {
        container.innerHTML = '<p class="text-light">No working hours data available</p>';
        return;
    }

    // Create data matrix (7 days x 24 hours)
    const matrix = createDataMatrix(workingHours);

    // Create SVG heatmap
    const svg = createWorkingHoursSVG(matrix, title);
    container.innerHTML = svg;
}

function createDataMatrix(workingHours) {
    // Create 7x24 matrix (days x hours)
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));

    // Fill matrix with data
    workingHours.forEach(item => {
        const dayIndex = item.day_of_week; // 0=Sunday, 6=Saturday
        const hourIndex = item.hour_of_day; // 0-23
        const count = item.count || 0;

        if (dayIndex >= 0 && dayIndex < 7 && hourIndex >= 0 && hourIndex < 24) {
            matrix[dayIndex][hourIndex] = count;
        }
    });

    return matrix;
}

function createWorkingHoursSVG(matrix, title) {
    const cellSize = 16;
    const cellGap = 2;
    const labelWidth = 60;
    const labelHeight = 20;
    const titleHeight = 25;

    const hours = 24;
    const days = 7;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const width = labelWidth + (hours * (cellSize + cellGap));
    const height = titleHeight + labelHeight + (days * (cellSize + cellGap));

    // Find max value for color scaling
    const maxValue = Math.max(...matrix.flat());

    let content = '';

    // Title
    content += `<text x="${width / 2}" y="18" class="heatmap-title" text-anchor="middle">${title}</text>`;

    // Day labels
    for (let day = 0; day < days; day++) {
        const y = titleHeight + labelHeight + (day * (cellSize + cellGap)) + (cellSize / 2);
        content += `<text x="5" y="${y + 4}" class="day-label">${dayNames[day]}</text>`;
    }

    // Hour labels (show every 4 hours)
    for (let hour = 0; hour < hours; hour += 4) {
        const x = labelWidth + (hour * (cellSize + cellGap)) + (cellSize / 2);
        content += `<text x="${x}" y="${titleHeight + 15}" class="hour-label" text-anchor="middle">${hour}h</text>`;
    }

    // Cells
    for (let day = 0; day < days; day++) {
        for (let hour = 0; hour < hours; hour++) {
            const value = matrix[day][hour];
            const x = labelWidth + (hour * (cellSize + cellGap));
            const y = titleHeight + labelHeight + (day * (cellSize + cellGap));
            const color = getHeatColor(value, maxValue);

            content += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}"
                        fill="${color}" rx="2" class="hour-cell"
                        data-day="${dayNames[day]}" data-hour="${hour}" data-value="${value}">
                        <title>${dayNames[day]} ${hour}:00 - ${value} activities</title>
                      </rect>`;
        }
    }

    // Legend
    const legendY = height + 20;
    const legendItems = [
        { label: i18n.t('user.workingHours.legend.less'), color: '#ebedf0' },
        { label: i18n.t('user.workingHours.legend.more'), color: '#216e39' }
    ];

    let legendContent = '';
    legendItems.forEach((item, index) => {
        const x = 10 + (index * 80);
        legendContent += `
            <rect x="${x}" y="${legendY}" width="12" height="12" fill="${item.color}" rx="2"></rect>
            <text x="${x + 18}" y="${legendY + 9}" class="legend-text">${item.label}</text>
        `;
    });

    return `
        <div class="working-hours-container">
            <svg width="${width}" height="${height + 40}" class="working-hours-svg">
                ${content}
                ${legendContent}
            </svg>
        </div>
    `;
}

function getHeatColor(value, maxValue) {
    if (value === 0) return '#ebedf0';

    const intensity = value / maxValue;

    // GitHub-style color scheme
    if (intensity < 0.1) return '#c6e48b';
    if (intensity < 0.2) return '#7bc96f';
    if (intensity < 0.3) return '#239a3b';
    if (intensity < 0.4) return '#196127';
    return '#0e4429';
}

/**
 * Render multiple working hours heatmaps (opening, commenting, closing)
 * @param {Array} openingHours - Opening notes data
 * @param {Array} commentingHours - Commenting data
 * @param {Array} closingHours - Closing notes data
 * @param {HTMLElement} container - Container element
 * @param {string} context - Context: 'user' or 'country'
 */
export function renderWorkingHoursSection(openingHours, commentingHours, closingHours, container, context = 'user') {
    let html = '<div class="working-hours-section">';

    // Opening hours
    if (openingHours && openingHours.length > 0) {
        html += '<div class="heatmap-subsection">';
        html += `<h4>${i18n.t(`${context}.workingHours.opening`)}</h4>`;
        html += '<div id="openingHeatmap"></div>';
        html += '</div>';
    }

    // Commenting hours
    if (commentingHours && commentingHours.length > 0) {
        html += '<div class="heatmap-subsection">';
        html += `<h4>${i18n.t(`${context}.workingHours.commenting`)}</h4>`;
        html += '<div id="commentingHeatmap"></div>';
        html += '</div>';
    }

    // Closing hours
    if (closingHours && closingHours.length > 0) {
        html += '<div class="heatmap-subsection">';
        html += `<h4>${i18n.t(`${context}.workingHours.closing`)}</h4>`;
        html += '<div id="closingHeatmap"></div>';
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Render individual heatmaps
    if (openingHours && openingHours.length > 0) {
        const openingContainer = container.querySelector('#openingHeatmap');
        renderWorkingHoursHeatmap(openingHours, openingContainer, i18n.t(`${context}.workingHours.opening`));
    }

    if (commentingHours && commentingHours.length > 0) {
        const commentingContainer = container.querySelector('#commentingHeatmap');
        renderWorkingHoursHeatmap(commentingHours, commentingContainer, i18n.t(`${context}.workingHours.commenting`));
    }

    if (closingHours && closingHours.length > 0) {
        const closingContainer = container.querySelector('#closingHeatmap');
        renderWorkingHoursHeatmap(closingHours, closingContainer, i18n.t(`${context}.workingHours.closing`));
    }
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .working-hours-container {
        display: flex;
        justify-content: center;
        margin: 1rem 0;
    }

    .working-hours-svg {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .heatmap-title {
        font-size: 14px;
        font-weight: 600;
        fill: var(--text-color);
    }

    .day-label,
    .hour-label {
        font-size: 10px;
        fill: var(--text-light);
    }

    .hour-cell {
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .hour-cell:hover {
        stroke: var(--primary-color);
        stroke-width: 2;
        transform: scale(1.1);
    }

    .legend-text {
        font-size: 10px;
        fill: var(--text-light);
    }

    .working-hours-section {
        margin: 2rem 0;
    }

    .heatmap-subsection {
        margin: 1.5rem 0;
    }

    .heatmap-subsection h4 {
        margin: 0 0 1rem 0;
        color: var(--text-color);
        font-size: 1.1rem;
    }

    @media (max-width: 768px) {
        .working-hours-svg {
            transform: scale(0.8);
            transform-origin: top left;
        }

        .working-hours-container {
            overflow-x: auto;
            justify-content: flex-start;
        }
    }
`;
document.head.appendChild(style);


