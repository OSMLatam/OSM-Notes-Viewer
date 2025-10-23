// Working Hours Heatmap Component (24h x 7 days)

/**
 * Render working hours heatmap
 * @param {Array} workingHours - Array of {hour, day, quantity}
 * @param {HTMLElement} container - Container element
 */
export function renderWorkingHoursHeatmap(workingHours, container) {
    if (!workingHours || workingHours.length === 0) {
        container.innerHTML = '<p>No working hours data available</p>';
        return;
    }

    // Create data matrix (7 days x 24 hours)
    const matrix = createDataMatrix(workingHours);

    // Create SVG heatmap
    const svg = createWorkingHoursSVG(matrix);
    container.innerHTML = svg;
}

function createDataMatrix(workingHours) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));

    // Fill matrix with data
    workingHours.forEach(item => {
        const dayIndex = days.indexOf(item.day);
        if (dayIndex !== -1 && item.hour >= 0 && item.hour < 24) {
            matrix[dayIndex][item.hour] = item.quantity;
        }
    });

    return matrix;
}

function createWorkingHoursSVG(matrix) {
    const cellSize = 20;
    const cellGap = 2;
    const labelWidth = 80;
    const labelHeight = 20;

    const hours = 24;
    const days = 7;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const width = labelWidth + (hours * (cellSize + cellGap));
    const height = labelHeight + (days * (cellSize + cellGap));

    // Find max value for color scaling
    const maxValue = Math.max(...matrix.flat());

    let content = '';

    // Day labels
    for (let day = 0; day < days; day++) {
        const y = labelHeight + (day * (cellSize + cellGap)) + (cellSize / 2);
        content += `<text x="5" y="${y + 4}" class="day-label">${dayNames[day]}</text>`;
    }

    // Hour labels (show every 3 hours)
    for (let hour = 0; hour < hours; hour += 3) {
        const x = labelWidth + (hour * (cellSize + cellGap)) + (cellSize / 2);
        content += `<text x="${x}" y="15" class="hour-label" text-anchor="middle">${hour}h</text>`;
    }

    // Cells
    for (let day = 0; day < days; day++) {
        for (let hour = 0; hour < hours; hour++) {
            const value = matrix[day][hour];
            const x = labelWidth + (hour * (cellSize + cellGap));
            const y = labelHeight + (day * (cellSize + cellGap));
            const color = getHeatColor(value, maxValue);

            content += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}"
                        fill="${color}" rx="2" class="hour-cell"
                        data-day="${dayNames[day]}" data-hour="${hour}" data-value="${value}">
                        <title>${dayNames[day]} ${hour}:00 - ${value} notes</title>
                      </rect>`;
        }
    }

    return `
        <svg width="${width}" height="${height}" class="working-hours-svg">
            ${content}
        </svg>
    `;
}

function getHeatColor(value, maxValue) {
    if (value === 0) return '#ebedf0';

    const intensity = value / maxValue;

    if (intensity < 0.2) return '#d0f0c0';
    if (intensity < 0.4) return '#9be9a8';
    if (intensity < 0.6) return '#40c463';
    if (intensity < 0.8) return '#30a14e';
    return '#216e39';
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .working-hours-svg {
        display: block;
        margin: 1rem auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .day-label,
    .hour-label {
        font-size: 10px;
        fill: #666;
    }

    .hour-cell {
        cursor: pointer;
        transition: all 0.2s;
    }

    .hour-cell:hover {
        stroke: #333;
        stroke-width: 2;
    }
`;
document.head.appendChild(style);


