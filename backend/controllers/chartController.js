const PlatformAccount = require('../models/PlatformAccount');
const StatsHistory = require('../models/StatsHistory');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get problems solved over time for charts
 * @route   GET /api/charts/problems-over-time
 * @access  Private
 */
const getProblemsOverTime = asyncHandler(async (req, res) => {
    const { platform = 'overall', days = 30 } = req.query;

    const progressData = await StatsHistory.getProgressData(req.user.id, platform, parseInt(days));

    // Format data for Chart.js
    const chartData = {
        labels: progressData.map(entry => entry.date),
        datasets: [
            {
                label: 'Total Problems',
                data: progressData.map(entry => entry.problems),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    // Add difficulty breakdown if available
    if (progressData.length > 0 && progressData[0].easy !== undefined) {
        chartData.datasets.push(
            {
                label: 'Easy',
                data: progressData.map(entry => entry.easy),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false
            },
            {
                label: 'Medium',
                data: progressData.map(entry => entry.medium),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: false
            },
            {
                label: 'Hard',
                data: progressData.map(entry => entry.hard),
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: false
            }
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'line',
            title: `Problems Solved Over Time (${platform})`,
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: `Problems Solved - Last ${days} Days`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Problems Solved'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        }
    });
});

/**
 * @desc    Get problem difficulty distribution for charts
 * @route   GET /api/charts/problem-distribution
 * @access  Private
 */
const getProblemDistribution = asyncHandler(async (req, res) => {
    const { platform } = req.query;

    let platformAccounts;
    
    if (platform && platform !== 'all') {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            platformName: platform,
            isActive: true
        });
    } else {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            isActive: true
        });
    }

    // Aggregate difficulty distribution
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    platformAccounts.forEach(account => {
        easyCount += account.stats.easyProblemsSolved;
        mediumCount += account.stats.mediumProblemsSolved;
        hardCount += account.stats.hardProblemsSolved;
    });

    const chartData = {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [{
            data: [easyCount, mediumCount, hardCount],
            backgroundColor: [
                '#10B981', // Green for Easy
                '#F59E0B', // Yellow for Medium
                '#EF4444'  // Red for Hard
            ],
            borderColor: [
                '#059669',
                '#D97706',
                '#DC2626'
            ],
            borderWidth: 2
        }]
    };

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'doughnut',
            title: `Problem Difficulty Distribution (${platform || 'All Platforms'})`,
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Problems by Difficulty'
                    }
                }
            },
            summary: {
                total: easyCount + mediumCount + hardCount,
                easy: easyCount,
                medium: mediumCount,
                hard: hardCount
            }
        }
    });
});

/**
 * @desc    Get language usage distribution for charts
 * @route   GET /api/charts/language-distribution
 * @access  Private
 */
const getLanguageDistribution = asyncHandler(async (req, res) => {
    const { platform } = req.query;

    let platformAccounts;
    
    if (platform && platform !== 'all') {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            platformName: platform,
            isActive: true
        });
    } else {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            isActive: true
        });
    }

    // Aggregate language statistics
    const languageMap = new Map();

    platformAccounts.forEach(account => {
        if (account.stats.languageStats) {
            account.stats.languageStats.forEach((langData, language) => {
                if (languageMap.has(language)) {
                    const existing = languageMap.get(language);
                    existing.problemsSolved += langData.problemsSolved;
                    existing.submissions += langData.submissions;
                } else {
                    languageMap.set(language, { ...langData });
                }
            });
        }
    });

    // Convert to arrays for Chart.js
    const languages = Array.from(languageMap.keys());
    const problemCounts = languages.map(lang => languageMap.get(lang).problemsSolved);

    // Color palette for languages
    const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#6366F1', '#84CC16', '#F97316', '#06B6D4'
    ];

    const chartData = {
        labels: languages,
        datasets: [{
            label: 'Problems Solved',
            data: problemCounts,
            backgroundColor: colors.slice(0, languages.length),
            borderColor: colors.slice(0, languages.length).map(color => color + '80'),
            borderWidth: 1
        }]
    };

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'bar',
            title: `Language Usage Distribution (${platform || 'All Platforms'})`,
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Problems Solved by Language'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Problems Solved'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Programming Language'
                        }
                    }
                }
            }
        }
    });
});

/**
 * @desc    Get rating history over time for charts
 * @route   GET /api/charts/rating-history
 * @access  Private
 */
const getRatingHistory = asyncHandler(async (req, res) => {
    const { platform = 'overall', days = 90 } = req.query;

    const progressData = await StatsHistory.getProgressData(req.user.id, platform, parseInt(days));

    const chartData = {
        labels: progressData.map(entry => entry.date),
        datasets: [{
            label: 'Contest Rating',
            data: progressData.map(entry => entry.rating),
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#8B5CF6',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4
        }]
    };

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'line',
            title: `Rating History (${platform})`,
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: `Contest Rating - Last ${days} Days`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Rating'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        }
    });
});

/**
 * @desc    Get platform comparison data for charts
 * @route   GET /api/charts/platform-comparison
 * @access  Private
 */
const getPlatformComparison = asyncHandler(async (req, res) => {
    const platformAccounts = await PlatformAccount.find({
        userId: req.user.id,
        isActive: true
    });

    if (platformAccounts.length === 0) {
        throw new AppError('No platform accounts found', 404);
    }

    const platforms = platformAccounts.map(account => account.platformName);
    const problemCounts = platformAccounts.map(account => account.stats.totalProblemsSolved);
    const ratings = platformAccounts.map(account => account.stats.contestRating);

    const chartData = {
        labels: platforms,
        datasets: [
            {
                label: 'Problems Solved',
                data: problemCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3B82F6',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: 'Contest Rating',
                data: ratings,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: '#8B5CF6',
                borderWidth: 1,
                yAxisID: 'y1',
                type: 'line'
            }
        ]
    };

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'bar',
            title: 'Platform Comparison',
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Performance Across Platforms'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Platform'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Problems Solved'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Contest Rating'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        }
    });
});

/**
 * @desc    Get streak data for charts
 * @route   GET /api/charts/streak-data
 * @access  Private
 */
const getStreakData = asyncHandler(async (req, res) => {
    const { platform } = req.query;

    let platformAccounts;
    
    if (platform && platform !== 'all') {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            platformName: platform,
            isActive: true
        });
    } else {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            isActive: true
        });
    }

    const platforms = platformAccounts.map(account => account.platformName);
    const currentStreaks = platformAccounts.map(account => account.stats.streak.current);
    const maxStreaks = platformAccounts.map(account => account.stats.streak.max);

    const chartData = {
        labels: platforms,
        datasets: [
            {
                label: 'Current Streak',
                data: currentStreaks,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10B981',
                borderWidth: 1
            },
            {
                label: 'Max Streak',
                data: maxStreaks,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: '#F59E0B',
                borderWidth: 1
            }
        ]
    };

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'bar',
            title: `Streak Data (${platform || 'All Platforms'})`,
            chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Coding Streaks'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Days'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Platform'
                        }
                    }
                }
            }
        }
    });
});

/**
 * @desc    Get submission calendar data
 * @route   GET /api/charts/submission-calendar
 * @access  Private
 */
const getSubmissionCalendar = asyncHandler(async (req, res) => {
    const { platform, year = new Date().getFullYear() } = req.query;

    // Get recent activity data for calendar heatmap
    let platformAccounts;
    
    if (platform && platform !== 'all') {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            platformName: platform,
            isActive: true
        });
    } else {
        platformAccounts = await PlatformAccount.find({
            userId: req.user.id,
            isActive: true
        });
    }

    // Aggregate activity by date
    const activityMap = new Map();
    
    platformAccounts.forEach(account => {
        if (account.stats.recentActivity) {
            account.stats.recentActivity.forEach(activity => {
                const date = activity.date.toISOString().split('T')[0];
                const activityYear = new Date(activity.date).getFullYear();
                
                if (activityYear === parseInt(year)) {
                    if (activityMap.has(date)) {
                        activityMap.set(date, activityMap.get(date) + 1);
                    } else {
                        activityMap.set(date, 1);
                    }
                }
            });
        }
    });

    // Convert to array format for calendar
    const calendarData = Array.from(activityMap.entries()).map(([date, count]) => ({
        date,
        count
    }));

    res.status(200).json({
        status: 'success',
        data: {
            chartType: 'calendar',
            title: `Submission Calendar ${year} (${platform || 'All Platforms'})`,
            calendarData,
            year: parseInt(year),
            totalDays: calendarData.length,
            totalSubmissions: Array.from(activityMap.values()).reduce((sum, count) => sum + count, 0)
        }
    });
});

module.exports = {
    getProblemsOverTime,
    getProblemDistribution,
    getLanguageDistribution,
    getRatingHistory,
    getPlatformComparison,
    getStreakData,
    getSubmissionCalendar
};
