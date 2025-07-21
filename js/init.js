// CodeTrackPro - Initialization Module

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing CodeTrackPro...');
    
    // Initialize core modules
    initAnimations();
    initializeCharts();
    initChartAnimations();
    
    // Populate data
    populateLeaderboard();
    populateEvents();
    populateTimeline();
    
    // Initialize UI features
    initMobileMenu();
    initChat();
    initSmoothScrolling();
    
    // Initialize AI features
    displayInsights();
    
    // Auto-save profile changes
    const usernameEl = document.getElementById('username');
    const bioEl = document.getElementById('bio');
    
    if (usernameEl) usernameEl.addEventListener('blur', saveProfile);
    if (bioEl) bioEl.addEventListener('blur', saveProfile);
    
    // Load saved profile
    loadProfile();
    
    // Start real-time updates simulation
    simulateRealTimeUpdates();
    
    // Add keyboard shortcuts
    initKeyboardShortcuts();
    
    console.log('✅ CodeTrackPro initialized successfully!');
});

// Keyboard Shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to open chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const chatModal = document.getElementById('chat-modal');
            if (chatModal.classList.contains('hidden')) {
                chatModal.classList.remove('hidden');
                document.getElementById('chat-input').focus();
            } else {
                chatModal.classList.add('hidden');
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.getElementById('chat-modal').classList.add('hidden');
            document.getElementById('share-modal').classList.add('hidden');
        }
        
        // Number keys to switch platforms
        if (e.key >= '1' && e.key <= '5') {
            const platforms = ['all', 'leetcode', 'codeforces', 'hackerrank', 'codechef'];
            const platform = platforms[parseInt(e.key) - 1];
            if (platform) {
                switchPlatform(platform);
            }
        }
    });
}

// Error Handling
window.addEventListener('error', (e) => {
    console.error('CodeTrackPro Error:', e.error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Something went wrong. Please refresh the page.</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
});

// Performance Monitoring
function initPerformanceMonitoring() {
    // Monitor page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`📊 Page loaded in ${loadTime.toFixed(2)}ms`);
        
        // Log to analytics (mock)
        if (loadTime > 3000) {
            console.warn('⚠️ Slow page load detected');
        }
    });
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
                console.warn('⚠️ High memory usage detected');
            }
        }, 60000); // Check every minute
    }
}

// Initialize performance monitoring
initPerformanceMonitoring();

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Theme Toggle (for future dark/light mode)
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
}

// Initialize theme
loadTheme();
