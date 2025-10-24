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
                            // Could show a notification to user here
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
});


