// CodeTrackPro - Main Application Script

// Global Variables
let currentPlatform = 'all';
let charts = {};
let currentEventFilter = 'all';
let isTyping = false;

// Mock Data
const mockData = {
    all: {
        problems: [487, 312, 298, 150],
        platforms: ['LeetCode', 'Codeforces', 'HackerRank', 'CodeChef'],
        progress: [120, 245, 389, 567, 734, 892, 1247],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        difficulty: [623, 458, 166],
        languages: [35, 28, 20, 12, 3, 2],
        languageNames: ['Python', 'C++', 'Java', 'JavaScript', 'Go', 'Rust']
    },
    leetcode: {
        problems: [487],
        platforms: ['LeetCode'],
        progress: [45, 89, 156, 234, 312, 398, 487],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        difficulty: [267, 165, 55],
        languages: [40, 30, 20, 8, 2],
        languageNames: ['Python', 'C++', 'Java', 'JavaScript', 'Go']
    },
    codeforces: {
        problems: [312],
        platforms: ['Codeforces'],
        progress: [23, 67, 123, 178, 234, 278, 312],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        difficulty: [156, 112, 44],
        languages: [45, 35, 15, 5],
        languageNames: ['C++', 'Python', 'Java', 'C']
    },
    hackerrank: {
        problems: [298],
        platforms: ['HackerRank'],
        progress: [34, 78, 134, 189, 234, 267, 298],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        difficulty: [178, 89, 31],
        languages: [50, 25, 15, 10],
        languageNames: ['Python', 'Java', 'JavaScript', 'SQL']
    },
    codechef: {
        problems: [150],
        platforms: ['CodeChef'],
        progress: [12, 34, 67, 89, 112, 134, 150],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        difficulty: [89, 45, 16],
        languages: [60, 30, 10],
        languageNames: ['C++', 'Python', 'Java']
    }
};

const leaderboardData = [
    { rank: 1, username: 'CodeMaster_Pro', cscore: 3245, problems: 1867, badges: ['🥇', '🏆', '⭐'] },
    { rank: 2, username: 'AlgoNinja', cscore: 3089, problems: 1654, badges: ['🥈', '🏆'] },
    { rank: 3, username: 'ByteWizard', cscore: 2934, problems: 1456, badges: ['🥉', '⭐'] },
    { rank: 4, username: 'John Developer', cscore: 2847, problems: 1247, badges: ['⭐'] },
    { rank: 5, username: 'DataStructGuru', cscore: 2756, problems: 1198, badges: ['💎'] },
    { rank: 6, username: 'RecursiveRider', cscore: 2689, problems: 1123, badges: ['🔥'] },
    { rank: 7, username: 'GraphExplorer', cscore: 2567, problems: 1045, badges: ['🚀'] },
    { rank: 8, username: 'DynamicCoder', cscore: 2456, problems: 987, badges: ['💻'] },
    { rank: 9, username: 'TreeTraverser', cscore: 2378, problems: 923, badges: ['🌟'] },
    { rank: 10, username: 'SortingSensei', cscore: 2289, problems: 876, badges: ['⚡'] }
];

const eventsData = [
    {
        platform: 'leetcode',
        title: 'Weekly Contest 378',
        date: '2025-01-25',
        time: '10:30 AM',
        duration: '1.5 hours',
        participants: '12,000+'
    },
    {
        platform: 'codeforces',
        title: 'Codeforces Round #912',
        date: '2025-01-27',
        time: '2:35 PM',
        duration: '2 hours',
        participants: '25,000+'
    },
    {
        platform: 'hackerrank',
        title: 'HourRank 32',
        date: '2025-01-28',
        time: '7:00 PM',
        duration: '1 hour',
        participants: '8,000+'
    },
    {
        platform: 'leetcode',
        title: 'Biweekly Contest 121',
        date: '2025-01-30',
        time: '8:00 AM',
        duration: '1.5 hours',
        participants: '15,000+'
    },
    {
        platform: 'codechef',
        title: 'Long Challenge',
        date: '2025-02-01',
        time: '3:00 PM',
        duration: '10 days',
        participants: '30,000+'
    }
];

const timelineData = [
    { date: '2025-01-20', event: 'Solved 1247th problem!', platform: 'leetcode' },
    { date: '2025-01-18', event: 'Reached Expert on Codeforces', platform: 'codeforces' },
    { date: '2025-01-15', event: 'Completed SQL certification', platform: 'hackerrank' },
    { date: '2025-01-10', event: '500th LeetCode problem solved', platform: 'leetcode' },
    { date: '2025-01-05', event: 'First contest win!', platform: 'codechef' },
    { date: '2025-01-01', event: 'New Year coding resolution', platform: 'all' }
];

// Utility Functions
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Profile Management
function saveProfile() {
    const username = document.getElementById('username').textContent;
    const bio = document.getElementById('bio').textContent;
    
    localStorage.setItem('codetrackpro_profile', JSON.stringify({
        username,
        bio,
        lastUpdated: new Date().toISOString()
    }));
}

function loadProfile() {
    const saved = localStorage.getItem('codetrackpro_profile');
    if (saved) {
        const profile = JSON.parse(saved);
        document.getElementById('username').textContent = profile.username || 'John Developer';
        document.getElementById('bio').textContent = profile.bio || 'Full Stack Engineer passionate about algorithms';
    }
}

function shareProfile() {
    const username = document.getElementById('username').textContent.toLowerCase().replace(/\s+/g, '-');
    const url = `https://codetrackpro.com/profile/${username}`;
    document.getElementById('profile-url').textContent = url;
    document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function copyToClipboard() {
    const url = document.getElementById('profile-url').textContent;
    navigator.clipboard.writeText(url).then(() => {
        alert('Profile URL copied to clipboard!');
        closeShareModal();
    });
}

// Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        
        // Animate hamburger menu
        const lines = mobileMenuBtn.querySelectorAll('div > div');
        lines.forEach((line, index) => {
            if (mobileMenu.classList.contains('hidden')) {
                line.style.transform = '';
                line.style.opacity = '1';
            } else {
                if (index === 0) line.style.transform = 'rotate(45deg) translate(6px, 6px)';
                if (index === 1) line.style.opacity = '0';
                if (index === 2) line.style.transform = 'rotate(-45deg) translate(6px, -6px)';
            }
        });
    });
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            const lines = mobileMenuBtn.querySelectorAll('div > div');
            lines.forEach(line => {
                line.style.transform = '';
                line.style.opacity = '1';
            });
        });
    });
}

// Smooth Scrolling
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Platform Switching
function switchPlatform(platform) {
    currentPlatform = platform;
    
    // Update button states
    document.querySelectorAll('.platform-btn').forEach(btn => {
        if (btn.dataset.platform === platform) {
            btn.className = 'platform-btn bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105';
        } else {
            btn.className = 'platform-btn bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105';
        }
    });
    
    // Update charts with animation
    updateChartsData();
}

function updateChartsData() {
    const data = mockData[currentPlatform];
    
    // Update each chart
    if (charts.problemsChart) {
        charts.problemsChart.data.labels = data.platforms;
        charts.problemsChart.data.datasets[0].data = data.problems;
        charts.problemsChart.update('active');
    }
    
    if (charts.progressChart) {
        charts.progressChart.data.labels = data.months;
        charts.progressChart.data.datasets[0].data = data.progress;
        charts.progressChart.update('active');
    }
    
    if (charts.difficultyChart) {
        charts.difficultyChart.data.datasets[0].data = data.difficulty;
        charts.difficultyChart.update('active');
    }
    
    if (charts.languageChart) {
        charts.languageChart.data.labels = data.languageNames;
        charts.languageChart.data.datasets[0].data = data.languages;
        charts.languageChart.update('active');
    }
}

function sortLeaderboard(column) {
    // Implementation for sorting (simplified for demo)
    console.log('Sorting by:', column);
}

function filterEvents(platform) {
    currentEventFilter = platform;
    
    // Update filter button states
    document.querySelectorAll('.event-filter-btn').forEach(btn => {
        if (btn.dataset.filter === platform) {
            btn.className = 'event-filter-btn bg-indigo-600 text-white px-6 py-2 rounded-lg transition-colors';
        } else {
            btn.className = 'event-filter-btn bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors';
        }
    });
    
    populateEvents();
}

// Performance Optimizations
window.addEventListener('resize', debounce(() => {
    Object.values(charts).forEach(chart => {
        if (chart) chart.resize();
    });
}, 250));
