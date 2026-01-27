// Interactive Statistics Page
import { apiClient } from '../api/apiClient.js';

let barChart, pieChart, comparisonChart, animatedChart;
let usersData = [];
let countriesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initializeCharts();
  setupEventListeners();
  initializeAnimatedChart();
});

// Load data
async function loadData() {
  try {
    // Use apiClient to respect API configuration (production vs development)
    usersData = await apiClient.getUserIndex();
    countriesData = await apiClient.getCountryIndex();

    // Count users with >= 10 opened notes
    const usersWith10Plus = usersData.filter((user) => (user.history_whole_open ?? 0) >= 10).length;
    console.log('Data loaded:', {
      users: usersData.length,
      countries: countriesData.length,
      usersWith10PlusNotes: usersWith10Plus,
    });
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Initialize charts
function initializeCharts() {
  updateCharts();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('datasetSelect').addEventListener('change', updateCharts);
  document.getElementById('typeSelect').addEventListener('change', updateCharts);
  document.getElementById('metricSelect').addEventListener('change', updateCharts);
}

// Update all charts
function updateCharts() {
  const dataset = document.getElementById('datasetSelect').value;
  const type = document.getElementById('typeSelect').value;
  const metric = document.getElementById('metricSelect').value;

  const data = type === 'users' ? usersData : countriesData;
  const processedData = processData(data, dataset, metric);

  updateBarChart(processedData);
  updatePieChart(processedData);
  updateComparisonChart(processedData, type, data, dataset, metric);
}

// Process data based on filters
function processData(data, dataset, metric) {
  // Sort data
  let sorted = [...data].sort((a, b) => {
    if (metric === 'open') return b.history_whole_open - a.history_whole_open;
    if (metric === 'closed') return b.history_whole_closed - a.history_whole_closed;
    return (
      b.history_whole_open +
      b.history_whole_closed -
      (a.history_whole_open + a.history_whole_closed)
    );
  });

  // Limit dataset
  if (dataset === 'top10') sorted = sorted.slice(0, 10);
  else if (dataset === 'top20') sorted = sorted.slice(0, 20);
  else if (dataset === 'top50') sorted = sorted.slice(0, 50);

  // Get labels and values
  const labels = sorted.map((item) => {
    if ('username' in item) return item.username;
    if ('country_name_en' in item) return item.country_name_en;
    return 'Unknown';
  });

  const openValues = sorted.map((item) => item.history_whole_open);
  const closedValues = sorted.map((item) => item.history_whole_closed);

  return { labels, openValues, closedValues };
}

// Update bar chart
function updateBarChart(data) {
  const ctx = document.getElementById('barChart');

  if (barChart) barChart.destroy();

  const metric = document.getElementById('metricSelect').value;

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: metric === 'open' ? 'Opened' : metric === 'closed' ? 'Closed' : 'Total',
          data:
            metric === 'open'
              ? data.openValues
              : metric === 'closed'
                ? data.closedValues
                : data.openValues.map((val, i) => val + data.closedValues[i]),
          backgroundColor: 'rgba(126, 188, 111, 0.6)',
          borderColor: 'rgba(126, 188, 111, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

// Update pie chart
function updatePieChart(data) {
  const ctx = document.getElementById('pieChart');

  if (pieChart) pieChart.destroy();

  const metric = document.getElementById('metricSelect').value;

  // Take top 8 for pie chart readability
  const sliceCount = 8;
  const labels = data.labels.slice(0, sliceCount);
  const values =
    metric === 'open'
      ? data.openValues.slice(0, sliceCount)
      : metric === 'closed'
        ? data.closedValues.slice(0, sliceCount)
        : data.openValues.slice(0, sliceCount).map((val, i) => val + data.closedValues[i]);

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            'rgba(126, 188, 111, 0.8)',
            'rgba(74, 144, 226, 0.8)',
            'rgba(243, 156, 18, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(26, 188, 156, 0.8)',
            'rgba(52, 73, 94, 0.8)',
            'rgba(149, 165, 166, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 15,
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Update comparison chart
function updateComparisonChart(data, type, originalData, dataset, metric) {
  const ctx = document.getElementById('comparisonChart');

  if (comparisonChart) comparisonChart.destroy();

  // Show/hide note about filtering
  const comparisonNote = document.getElementById('comparisonNote');
  if (comparisonNote) {
    comparisonNote.style.display = type === 'users' ? 'block' : 'none';
  }

  // Filter users with less than 10 opened notes for comparison chart
  let filteredData = data;
  if (type === 'users') {
    // Filter original data to exclude users with less than 10 opened notes
    // Handle null values: treat null as 0 (no notes opened)
    const filteredUsers = originalData.filter((user) => {
      const openedNotes = user.history_whole_open ?? 0;
      return openedNotes >= 10;
    });
    console.log(
      `Comparison chart: Filtered ${originalData.length} users to ${filteredUsers.length} users (>= 10 opened notes)`
    );

    // For comparison chart, always sort by opened notes (descending) to show users with most opened notes
    // This ensures we see users with significant opened note activity regardless of the selected metric
    let sorted = [...filteredUsers].sort((a, b) => {
      const aOpen = a.history_whole_open ?? 0;
      const bOpen = b.history_whole_open ?? 0;
      return bOpen - aOpen;
    });

    // Apply dataset limit if specified
    // For comparison chart, limit "all" to top 100 for readability
    if (dataset === 'top10') sorted = sorted.slice(0, 10);
    else if (dataset === 'top20') sorted = sorted.slice(0, 20);
    else if (dataset === 'top50') sorted = sorted.slice(0, 50);
    else if (dataset === 'all') sorted = sorted.slice(0, 100); // Limit to top 100 for comparison chart readability

    // Get labels and values
    const labels = sorted.map((item) => {
      if ('username' in item) return item.username;
      if ('country_name_en' in item) return item.country_name_en;
      return 'Unknown';
    });

    const openValues = sorted.map((item) => item.history_whole_open ?? 0);
    const closedValues = sorted.map((item) => item.history_whole_closed ?? 0);

    filteredData = { labels, openValues, closedValues };
    console.log(`Comparison chart: After processing, showing ${filteredData.labels.length} users`);
    console.log(
      `Comparison chart: Dataset selected: ${dataset}, Total filtered users available: ${filteredUsers.length}`
    );

    // Log sample of users with most opened notes
    if (sorted.length > 0) {
      const topUsers = sorted.slice(0, 5).map((u) => ({
        username: u.username,
        opened: u.history_whole_open ?? 0,
        closed: u.history_whole_closed ?? 0,
      }));
      console.log('Comparison chart: Top 5 users by opened notes:', topUsers);
    }
  }

  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: filteredData.labels,
      datasets: [
        {
          label: 'Opened',
          data: filteredData.openValues,
          backgroundColor: 'rgba(126, 188, 111, 0.6)',
          borderColor: 'rgba(126, 188, 111, 1)',
          borderWidth: 1,
        },
        {
          label: 'Closed',
          data: filteredData.closedValues,
          backgroundColor: 'rgba(74, 144, 226, 0.6)',
          borderColor: 'rgba(74, 144, 226, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

// Animated Top 10 Evolution
let animationFrame = 0;
let animationData = [];
let animationInterval = null;
let isPlaying = false;

function initializeAnimatedChart() {
  const canvas = document.getElementById('animatedChart');
  if (!canvas) return;

  // Prepare animation data from countries
  prepareAnimationData();

  // Create initial empty chart
  const ctx = canvas.getContext('2d');
  animatedChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Total Notes',
          data: [],
          backgroundColor: 'rgba(126, 188, 111, 0.8)',
          borderColor: 'rgba(126, 188, 111, 1)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
      animation: {
        duration: 300,
      },
    },
  });

  // Setup controls
  const playPauseBtn = document.getElementById('playPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const speedSlider = document.getElementById('speedSlider');

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', toggleAnimation);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetAnimation);
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', updateAnimationSpeed);
  }

  // Display first frame
  updateAnimatedFrame(0);
}

function prepareAnimationData() {
  // Collect all unique dates from all countries
  const dateMap = new Map();

  countriesData.forEach((country) => {
    if (!country.dates_most_open || country.dates_most_open.length === 0) return;

    country.dates_most_open.forEach((entry) => {
      const date = entry.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, {});
      }

      const countryName = country.country_name_en || country.country_name;
      const countryId = country.country_id;
      dateMap.get(date)[countryId] = {
        name: countryName,
        value: entry.quantity,
      };
    });
  });

  // Sort dates and create animation frames
  const sortedDates = Array.from(dateMap.keys()).sort();
  animationData = sortedDates.map((date) => {
    const countriesAtDate = dateMap.get(date);
    const topCountries = Object.values(countriesAtDate)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      date: date,
      top10: topCountries,
    };
  });

  console.log(
    `Animation prepared: ${animationData.length} frames from ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
  );
}

function updateAnimatedFrame(frameIndex) {
  if (!animatedChart || frameIndex >= animationData.length) return;

  const frame = animationData[frameIndex];
  const labels = frame.top10.map((c) => c.name);
  const values = frame.top10.map((c) => c.value);

  animatedChart.data.labels = labels;
  animatedChart.data.datasets[0].data = values;
  animatedChart.update('none'); // 'none' for instant update during animation

  // Update date display
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    currentDateEl.textContent = new Date(frame.date).toLocaleDateString();
  }
}

function toggleAnimation() {
  const btn = document.getElementById('playPauseBtn');
  if (!btn) return;

  if (isPlaying) {
    // Pause
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    isPlaying = false;
    btn.textContent = '▶️ Play';
  } else {
    // Play
    const speed = parseInt(document.getElementById('speedSlider').value);
    const delay = 1100 - speed * 100; // 100ms to 1000ms

    animationInterval = setInterval(() => {
      animationFrame++;
      if (animationFrame >= animationData.length) {
        animationFrame = 0; // Loop
      }
      updateAnimatedFrame(animationFrame);
    }, delay);

    isPlaying = true;
    btn.textContent = '⏸️ Pause';
  }
}

function resetAnimation() {
  animationFrame = 0;
  updateAnimatedFrame(0);

  if (isPlaying) {
    toggleAnimation(); // Stop playing
  }
}

function updateAnimationSpeed() {
  if (!isPlaying) return;

  // Restart animation with new speed
  toggleAnimation(); // Pause
  toggleAnimation(); // Play with new speed
}
