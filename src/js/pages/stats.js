// Interactive Statistics Page
let barChart, pieChart, comparisonChart;
let usersData = [];
let countriesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initializeCharts();
    setupEventListeners();
});

// Load data
async function loadData() {
    try {
        const usersResponse = await fetch('/data/indexes/users.json');
        usersData = await usersResponse.json();

        const countriesResponse = await fetch('/data/indexes/countries.json');
        countriesData = await countriesResponse.json();

        console.log('Data loaded:', { users: usersData.length, countries: countriesData.length });
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
    updateComparisonChart(processedData);
}

// Process data based on filters
function processData(data, dataset, metric) {
    // Sort data
    let sorted = [...data].sort((a, b) => {
        if (metric === 'open') return b.history_whole_open - a.history_whole_open;
        if (metric === 'closed') return b.history_whole_closed - a.history_whole_closed;
        return (b.history_whole_open + b.history_whole_closed) - (a.history_whole_open + a.history_whole_closed);
    });

    // Limit dataset
    if (dataset === 'top10') sorted = sorted.slice(0, 10);
    else if (dataset === 'top20') sorted = sorted.slice(0, 20);
    else if (dataset === 'top50') sorted = sorted.slice(0, 50);

    // Get labels and values
    const labels = sorted.map(item => {
        if ('username' in item) return item.username;
        if ('country_name_en' in item) return item.country_name_en;
        return 'Unknown';
    });

    const openValues = sorted.map(item => item.history_whole_open);
    const closedValues = sorted.map(item => item.history_whole_closed);

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
            datasets: [{
                label: metric === 'open' ? 'Opened' : metric === 'closed' ? 'Closed' : 'Total',
                data: metric === 'open' ? data.openValues : metric === 'closed' ? data.closedValues :
                      data.openValues.map((val, i) => val + data.closedValues[i]),
                backgroundColor: 'rgba(126, 188, 111, 0.6)',
                borderColor: 'rgba(126, 188, 111, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
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
    const values = metric === 'open' ? data.openValues.slice(0, sliceCount) :
                   metric === 'closed' ? data.closedValues.slice(0, sliceCount) :
                   data.openValues.slice(0, sliceCount).map((val, i) => val + data.closedValues[i]);

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(126, 188, 111, 0.8)',
                    'rgba(74, 144, 226, 0.8)',
                    'rgba(243, 156, 18, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(26, 188, 156, 0.8)',
                    'rgba(52, 73, 94, 0.8)',
                    'rgba(149, 165, 166, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 15,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update comparison chart
function updateComparisonChart(data) {
    const ctx = document.getElementById('comparisonChart');

    if (comparisonChart) comparisonChart.destroy();

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Opened',
                    data: data.openValues,
                    backgroundColor: 'rgba(126, 188, 111, 0.6)',
                    borderColor: 'rgba(126, 188, 111, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Closed',
                    data: data.closedValues,
                    backgroundColor: 'rgba(74, 144, 226, 0.6)',
                    borderColor: 'rgba(74, 144, 226, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}
