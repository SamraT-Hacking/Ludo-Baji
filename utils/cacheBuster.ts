
import { APP_VERSION } from '../config';

export const cleanupAndReload = () => {
    console.log("Cleaning up caches and storage due to version change or user request...");
    
    // 1. Unregister Service Workers
    if ('serviceWorker' in navigator) {
        try {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    console.log("Unregistering SW:", registration);
                    registration.unregister();
                }
            }).catch(err => console.warn("SW Unregister failed:", err));
        } catch (e) {
            console.warn("Error accessing serviceWorker:", e);
        }
    }

    // 2. Clear Cache API
    if ('caches' in window) {
        try {
            caches.keys().then((names) => {
                for (let name of names) {
                    caches.delete(name);
                }
            }).catch(err => console.warn("Cache clear failed:", err));
        } catch (e) {
            console.warn("Error accessing caches:", e);
        }
    }

    // 3. Clear Local Storage (Safely)
    // We attempt to preserve the Supabase session key to avoid logging users out if possible.
    // Supabase keys typically look like: sb-<project-ref>-auth-token
    const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    let sessionData = null;
    if (supabaseKey) {
        sessionData = localStorage.getItem(supabaseKey);
    }

    // Clear everything
    localStorage.clear();
    sessionStorage.clear();

    // Restore session if it existed
    if (supabaseKey && sessionData) {
        localStorage.setItem(supabaseKey, sessionData);
    }

    // 4. Update to new version
    localStorage.setItem('app_version', APP_VERSION);

    // 5. Force Reload from server (true)
    console.log("Reloading page...");
    window.location.reload();
};

export const checkAppVersion = () => {
    const storedVersion = localStorage.getItem('app_version');
    // If version mismatch or no version stored, trigger cleanup
    if (storedVersion !== APP_VERSION) {
        console.log(`Version mismatch: Stored ${storedVersion} vs Current ${APP_VERSION}`);
        cleanupAndReload();
    }
};

export const unregisterAllServiceWorkers = () => {
    if ('serviceWorker' in navigator) {
        try {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            }).catch(error => {
                console.warn("Service worker registration lookup failed:", error);
            });
        } catch (e) {
             console.warn("Service worker cleanup error:", e);
        }
    }
};
