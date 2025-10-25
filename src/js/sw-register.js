// Service Worker Registration

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New service worker found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            console.log('📦 New content available, please refresh');
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
} else {
    console.log('⚠️ Service Worker not supported');
}

// Listen for messages from service worker
navigator.serviceWorker?.addEventListener('message', (event) => {
    console.log('📨 Message from SW:', event.data);

    if (event.data && event.data.type === 'offline') {
        showOfflineMessage();
    }
});

// Show offline message
function showOfflineMessage() {
    const offlineBar = document.createElement('div');
    offlineBar.className = 'offline-bar';
    offlineBar.innerHTML = `
        <div class="offline-content">
            <span class="offline-icon">📡</span>
            <span class="offline-text">You're offline. Some features may be limited.</span>
        </div>
    `;
    document.body.insertBefore(offlineBar, document.body.firstChild);

    setTimeout(() => {
        offlineBar.classList.add('show');
    }, 100);
}

// Show update notification
function showUpdateNotification() {
    const updateBar = document.createElement('div');
    updateBar.className = 'update-bar';
    updateBar.innerHTML = `
        <div class="update-content">
            <span class="update-icon">✨</span>
            <span class="update-text">New version available. Refresh to update.</span>
            <button class="update-btn" onclick="location.reload()">Refresh</button>
        </div>
    `;
    document.body.insertBefore(updateBar, document.body.firstChild);

    setTimeout(() => {
        updateBar.classList.add('show');
    }, 100);
}


