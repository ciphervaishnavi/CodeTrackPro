// Chart.js Configuration and Initialization

// Global chart instances to prevent duplicates
let problemsChart = null;
let progressChart = null;
let difficultyChart = null;
let languageChart = null;
let chartsInitialized = false;

// Master initialization function (called by init.js)
function initializeCharts() {
    console.log('initializeCharts() called');
    
    // Check if we're on the dashboard page and charts elements exist
    const problemsCtx = document.getElementById('problemsChart');
    const progressCtx = document.getElementById('progressChart');
    const difficultyCtx = document.getElementById('difficultyChart');
    const languageCtx = document.getElementById('languageChart');
    
    // If chart elements don't exist, we're not on dashboard page
    if (!problemsCtx || !progressCtx || !difficultyCtx || !languageCtx) {
        console.log('Chart elements not found, skipping chart initialization');
        return;
    }
    
    // Check if charts are already initialized and working
    if (chartsInitialized && problemsChart && progressChart && difficultyChart && languageChart) {
        console.log('Charts already initialized and active, skipping...');
        return;
    }
    
    // Mark as initializing to prevent race conditions
    if (chartsInitialized) {
        console.log('Charts initialization already in progress, skipping...');
        return;
    }
    
    chartsInitialized = true; // Set flag immediately to prevent race conditions
    
    // Add a small delay to ensure DOM is fully loaded
    setTimeout(() => {
        try {
            console.log('Starting chart initialization...');
            initProblemsChart();
            initProgressChart();
            initDifficultyChart();
            initLanguageChart();
            console.log('Charts initialization complete');
        } catch (error) {
            console.error('Error initializing charts:', error);
            chartsInitialized = false; // Reset flag on error
        }
    }, 100);
}

// Problems Solved Chart
function initProblemsChart() {
    const ctx = document.getElementById('problemsChart');
    if (!ctx) {
        console.log('Problems chart context not found');
        return;
    }

    // Destroy existing chart if it exists
    if (problemsChart) {
        console.log('Destroying existing problems chart');
        problemsChart.destroy();
        problemsChart = null;
    }

    console.log('Creating new problems chart');
    problemsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Easy', 'Medium', 'Hard'],
            datasets: [{
                data: [487, 312, 156],
                backgroundColor: [
                    '#10B981', // Green - Easy
                    '#F59E0B', // Yellow - Medium
                    '#EF4444'  // Red - Hard
                ],
                borderColor: '#1F2937',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Completely disable animations to prevent infinite loops
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#E5E7EB',
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Monthly Progress Chart
function initProgressChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'Problems Solved',
                data: [45, 78, 120, 156, 198, 234, 267],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366F1',
                pointBorderColor: '#1F2937',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart',
                loop: false  // Prevent infinite animation loops
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#E5E7EB'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            }
        }
    });
}

// Difficulty Distribution Chart
function initDifficultyChart() {
    const ctx = document.getElementById('difficultyChart');
    if (!ctx) {
        console.log('Difficulty chart context not found');
        return;
    }

    // Destroy existing chart if it exists
    if (difficultyChart) {
        console.log('Destroying existing difficulty chart');
        difficultyChart.destroy();
        difficultyChart = null;
    }

    console.log('Creating new difficulty chart');
    difficultyChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Easy', 'Medium', 'Hard', 'Expert'],
            datasets: [{
                data: [487, 312, 156, 45],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)', // Green - Easy
                    'rgba(245, 158, 11, 0.7)', // Yellow - Medium
                    'rgba(239, 68, 68, 0.7)',  // Red - Hard
                    'rgba(139, 92, 246, 0.7)'  // Purple - Expert
                ],
                borderColor: [
                    '#10B981',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#E5E7EB',
                        padding: 20,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    },
                    pointLabels: {
                        color: '#9CA3AF'
                    },
                    ticks: {
                        color: '#9CA3AF',
                        backdropColor: 'transparent'
                    }
                }
            }
        }
    });
}

// Language Usage Chart
function initLanguageChart() {
    const ctx = document.getElementById('languageChart');
    if (!ctx) {
        console.log('Language chart context not found');
        return;
    }

    // Destroy existing chart if it exists
    if (languageChart) {
        console.log('Destroying existing language chart');
        languageChart.destroy();
        languageChart = null;
    }

    console.log('Creating new language chart');
    languageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust'],
            datasets: [{
                label: 'Hours Coded',
                data: [120, 98, 85, 67, 45, 23],
                backgroundColor: [
                    '#F7DF1E', // JavaScript Yellow
                    '#3776AB', // Python Blue
                    '#ED8B00', // Java Orange
                    '#00599C', // C++ Blue
                    '#00ADD8', // Go Cyan
                    '#CE422B'  // Rust Orange
                ],
                borderColor: '#1F2937',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Completely disable animations to prevent infinite loops
            plugins: {
                legend: {
                    labels: {
                        color: '#E5E7EB'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            }
        }
    });
}

// Function to update chart data (for real-time updates)
function updateProgressChart(newData) {
    if (progressChart && progressChart.canvas) {
        progressChart.data.datasets[0].data = newData;
        progressChart.update('none'); // Use 'none' for faster, non-animated updates
    }
}

function updateProblemsChart(newData) {
    if (problemsChart && problemsChart.canvas) {
        problemsChart.data.datasets[0].data = newData;
        problemsChart.update('none');
    }
}

function updateDifficultyChart(newData) {
    if (difficultyChart && difficultyChart.canvas) {
        difficultyChart.data.datasets[0].data = newData;
        difficultyChart.update('none');
    }
}

function updateLanguageChart(newData) {
    if (languageChart && languageChart.canvas) {
        languageChart.data.datasets[0].data = newData;
        languageChart.update('none');
    }
}

// Function to destroy all charts (useful for cleanup)
function destroyAllCharts() {
    if (problemsChart) {
        problemsChart.destroy();
        problemsChart = null;
    }
    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }
    if (difficultyChart) {
        difficultyChart.destroy();
        difficultyChart = null;
    }
    if (languageChart) {
        languageChart.destroy();
        languageChart = null;
    }
    chartsInitialized = false; // Reset initialization flag
}

// Function to reset charts initialization
function resetChartsInitialization() {
    chartsInitialized = false;
    console.log('Charts initialization reset');
}

// Nuclear option: force stop all chart animations
function stopAllChartAnimations() {
    if (problemsChart) {
        problemsChart.stop();
    }
    if (progressChart) {
        progressChart.stop();
    }
    if (difficultyChart) {
        difficultyChart.stop();
    }
    if (languageChart) {
        languageChart.stop();
    }
    console.log('All chart animations stopped');
}

// Safe chart creation with animation prevention
function createChartSafely(ctx, config) {
    // Ensure animations are completely disabled
    if (config.options) {
        config.options.animation = false;
    } else {
        config.options = { animation: false };
    }
    
    try {
        return new Chart(ctx, config);
    } catch (error) {
        console.error('Error creating chart:', error);
        return null;
    }
}

// Export chart instances for debugging
window.chartInstances = {
    problemsChart: () => problemsChart,
    progressChart: () => progressChart,
    difficultyChart: () => difficultyChart,
    languageChart: () => languageChart,
    destroyAll: destroyAllCharts,
    stopAnimations: stopAllChartAnimations,
    reset: resetChartsInitialization
};
