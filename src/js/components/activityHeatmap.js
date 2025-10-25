// Activity Heatmap Component (GitHub-style)

/**
 * Render activity heatmap from activity string
 * @param {string} activityString - 371 character string representing daily activity
 * @param {HTMLElement} container - Container element to render into
 */
export function renderActivityHeatmap(activityString, container) {
    if (!activityString || activityString.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">📊</div>
                <p>No activity data available</p>
                <small>This user hasn't contributed any notes recently</small>
            </div>
        `;
        return;
    }

    // Parse activity string into array of values
    const activityData = activityString.split('').map(char => parseInt(char, 10));

    // Create SVG heatmap
    const svg = createHeatmapSVG(activityData);
    container.innerHTML = svg;
}

function createHeatmapSVG(data) {
    const cellSize = 12;
    const cellGap = 2;
    const weeks = 53;
    const days = 7;

    const width = weeks * (cellSize + cellGap);
    const height = days * (cellSize + cellGap);

    let cells = '';
    let index = 0;

    // Create cells (week by week)
    for (let week = 0; week < weeks; week++) {
        for (let day = 0; day < days; day++) {
            if (index >= data.length) break;

            const value = data[index];
            const x = week * (cellSize + cellGap);
            const y = day * (cellSize + cellGap);
            const color = getActivityColor(value);

            const date = getDateFromIndex(index);
            cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}"
                      fill="${color}" rx="2" class="activity-cell"
                      data-value="${value}" data-day="${day}" data-week="${week}"
                      data-date="${date}" title="${date}: ${value} contributions"/>`;

            index++;
        }
    }

    return `
        <svg width="${width}" height="${height}" class="activity-heatmap-svg">
            ${cells}
        </svg>
        <div class="activity-legend">
            <span>Less</span>
            ${[0,1,2,3,4,5,6,7,8,9].map(v =>
                `<span class="legend-cell" style="background: ${getActivityColor(v)}"></span>`
            ).join('')}
            <span>More</span>
        </div>
    `;
}

function getActivityColor(value) {
    const colors = [
        '#ebedf0', // 0
        '#9be9a8', // 1
        '#40c463', // 2
        '#30a14e', // 3
        '#216e39', // 4
        '#1a5128', // 5
        '#0d3818', // 6
        '#072010', // 7
        '#041108', // 8
        '#020804'  // 9
    ];

    return colors[Math.min(value, 9)] || colors[0];
}

function getDateFromIndex(index) {
    const today = new Date();
    const daysAgo = 365 - index;
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .activity-heatmap-svg {
        display: block;
        margin: 1rem auto;
    }

    .activity-cell {
        cursor: pointer;
        transition: all 0.2s;
    }

    .activity-cell:hover {
        stroke: #333;
        stroke-width: 1;
    }

    .activity-legend {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        margin-top: 1rem;
        font-size: 0.875rem;
        color: #666;
    }

    .legend-cell {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 2px;
    }
`;
document.head.appendChild(style);


