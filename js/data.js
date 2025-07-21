// CodeTrackPro - Data Management Module

// Leaderboard Management
function populateLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    
    leaderboardData.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-700 transition-colors duration-300';
        
        const rankClass = user.rank <= 3 ? 'text-yellow-400 font-bold' : '';
        const badges = user.badges.join(' ');
        
        row.innerHTML = `
            <td class="py-4 px-2 ${rankClass}">#${user.rank}</td>
            <td class="py-4 px-2 font-semibold">${user.username}</td>
            <td class="py-4 px-2 text-indigo-400 font-bold">${user.cscore.toLocaleString()}</td>
            <td class="py-4 px-2">${user.problems.toLocaleString()}</td>
            <td class="py-4 px-2">${badges}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Events Management
function populateEvents() {
    const grid = document.getElementById('events-grid');
    grid.innerHTML = '';
    
    const filteredEvents = currentEventFilter === 'all' 
        ? eventsData 
        : eventsData.filter(event => event.platform === currentEventFilter);
    
    filteredEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-105';
        
        const platformColors = {
            leetcode: 'bg-yellow-500',
            codeforces: 'bg-blue-500',
            hackerrank: 'bg-green-500',
            codechef: 'bg-orange-500'
        };
        
        eventCard.innerHTML = `
            <div class="flex items-center mb-4">
                <div class="w-3 h-3 ${platformColors[event.platform]} rounded-full mr-3"></div>
                <span class="text-sm text-gray-400 capitalize">${event.platform}</span>
            </div>
            <h3 class="text-xl font-bold mb-2">${event.title}</h3>
            <div class="space-y-2 text-gray-400">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${event.date} at ${event.time}</span>
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>${event.duration}</span>
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <span>${event.participants} participants</span>
                </div>
            </div>
            <div class="mt-4">
                <button class="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg font-semibold transition-colors duration-300">
                    Join Contest
                </button>
            </div>
        `;
        
        grid.appendChild(eventCard);
    });
}

// Timeline Management
function populateTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    
    timelineData.forEach((item, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'flex-shrink-0 text-center';
        
        const platformColors = {
            leetcode: 'bg-yellow-500',
            codeforces: 'bg-blue-500',
            hackerrank: 'bg-green-500',
            codechef: 'bg-orange-500',
            all: 'bg-indigo-500'
        };
        
        timelineItem.innerHTML = `
            <div class="timeline-dot w-4 h-4 ${platformColors[item.platform]} rounded-full mx-auto mb-2"></div>
            <div class="bg-gray-700 rounded-lg p-4 w-64 hover:bg-gray-600 transition-colors duration-300">
                <p class="text-sm font-semibold mb-1">${item.event}</p>
                <p class="text-xs text-gray-400">${formatDate(item.date)}</p>
            </div>
        `;
        
        timeline.appendChild(timelineItem);
    });
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}

// Data Export Functionality
function exportData() {
    const exportData = {
        profile: {
            username: document.getElementById('username').textContent,
            bio: document.getElementById('bio').textContent,
            stats: {
                totalProblems: document.getElementById('total-problems').textContent,
                contests: document.getElementById('contests').textContent,
                cScore: document.getElementById('c-score').textContent,
                globalRank: document.getElementById('global-rank').textContent
            }
        },
        timeline: timelineData,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'codetrackpro-data.json';
    link.click();
}

// Data Import Functionality
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.profile) {
                document.getElementById('username').textContent = data.profile.username;
                document.getElementById('bio').textContent = data.profile.bio;
                
                if (data.profile.stats) {
                    document.getElementById('total-problems').textContent = data.profile.stats.totalProblems;
                    document.getElementById('contests').textContent = data.profile.stats.contests;
                    document.getElementById('c-score').textContent = data.profile.stats.cScore;
                    document.getElementById('global-rank').textContent = data.profile.stats.globalRank;
                }
            }
            
            saveProfile();
            alert('Data imported successfully!');
        } catch (error) {
            alert('Error importing data: Invalid file format');
        }
    };
    reader.readAsText(file);
}

// Statistics Calculator
function calculateStatistics() {
    const stats = {
        totalProblems: mockData.all.problems.reduce((a, b) => a + b, 0),
        averageProgress: mockData.all.progress.reduce((a, b) => a + b, 0) / mockData.all.progress.length,
        strongestPlatform: mockData.all.platforms[mockData.all.problems.indexOf(Math.max(...mockData.all.problems))],
        improvementRate: (mockData.all.progress[mockData.all.progress.length - 1] - mockData.all.progress[0]) / mockData.all.progress.length
    };
    
    return stats;
}

// Real-time Data Updates (mock)
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Simulate small updates to progress
        const progressElements = document.querySelectorAll('[id$="-problems"]');
        progressElements.forEach(element => {
            const currentValue = parseInt(element.textContent.replace(',', ''));
            if (Math.random() > 0.95) { // 5% chance of update
                element.textContent = (currentValue + 1).toLocaleString();
            }
        });
    }, 30000); // Check every 30 seconds
}
