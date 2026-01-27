// Chart components (wrapper for future Chart.js integration)

/**
 * Create a simple bar chart
 */
export function createBarChart(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p>No data available</p>';
    return;
  }

  // Simple HTML/CSS bar chart (can be replaced with Chart.js later)
  const maxValue = Math.max(...data.map((d) => d.value));

  const html = data
    .map((item) => {
      const percentage = (item.value / maxValue) * 100;
      return `
            <div class="chart-bar-item">
                <div class="chart-bar-label">${item.label}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    <div class="chart-bar-value">${item.value}</div>
                </div>
            </div>
        `;
    })
    .join('');

  container.innerHTML = `<div class="chart-bars">${html}</div>`;
}

/**
 * Create a simple pie chart representation
 */
export function createPieChart(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p>No data available</p>';
    return;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const html = data
    .map((item, index) => {
      const percentage = ((item.value / total) * 100).toFixed(1);
      return `
            <div class="pie-item">
                <div class="pie-color" style="background: ${getChartColor(index)}"></div>
                <div class="pie-label">${item.label}</div>
                <div class="pie-value">${percentage}%</div>
            </div>
        `;
    })
    .join('');

  container.innerHTML = `<div class="pie-chart">${html}</div>`;
}

function getChartColor(index) {
  const colors = [
    '#7ebc6f',
    '#4a90e2',
    '#f39c12',
    '#e74c3c',
    '#9b59b6',
    '#1abc9c',
    '#34495e',
    '#95a5a6',
  ];
  return colors[index % colors.length];
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .chart-bars {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .chart-bar-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .chart-bar-label {
        font-weight: 500;
        font-size: 0.9rem;
    }

    .chart-bar-container {
        position: relative;
        background: #f0f0f0;
        border-radius: 4px;
        height: 30px;
        overflow: hidden;
    }

    .chart-bar-fill {
        background: linear-gradient(90deg, #7ebc6f, #68a055);
        height: 100%;
        transition: width 0.5s ease;
    }

    .chart-bar-value {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-weight: 600;
        font-size: 0.9rem;
    }

    .pie-chart {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .pie-item {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .pie-color {
        width: 20px;
        height: 20px;
        border-radius: 4px;
    }

    .pie-label {
        flex: 1;
    }

    .pie-value {
        font-weight: 600;
        color: #666;
    }
`;
document.head.appendChild(style);
