
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { PopupNotification } from '../types';

const GlobalPopup: React.FC = () => {
    const [activePopup, setActivePopup] = useState<PopupNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkPopupEligibility = (popup: PopupNotification): boolean => {
        // 1. Check Status
        if (!popup.is_active) return false;

        // 2. Check Schedule
        if (popup.trigger_type === 'SCHEDULE') {
            const now = new Date();
            if (popup.schedule_start && new Date(popup.schedule_start) > now) return false;
            if (popup.schedule_end && new Date(popup.schedule_end) < now) return false;
        }

        // 3. Check Local History
        const historyKey = `popup_history_${popup.id}`;
        const historyRaw = localStorage.getItem(historyKey);
        const history = historyRaw ? JSON.parse(historyRaw) : { count: 0, lastShown: 0 };
        const today = new Date().setHours(0,0,0,0);

        if (popup.trigger_type === 'ONCE_PER_USER') {
            if (history.count > 0) return false;
        } else if (popup.trigger_type === 'DAILY_LIMIT') {
            const lastShownDate = new Date(history.lastShown).setHours(0,0,0,0);
            if (lastShownDate === today) {
                if (history.count >= (popup.frequency_limit || 1)) return false;
            } else {
                // Reset for new day (logic handled in update)
            }
        }

        return true;
    };

    const updateHistory = (popup: PopupNotification) => {
        const historyKey = `popup_history_${popup.id}`;
        const historyRaw = localStorage.getItem(historyKey);
        let history = historyRaw ? JSON.parse(historyRaw) : { count: 0, lastShown: 0 };
        
        const today = new Date().setHours(0,0,0,0);
        const lastShownDate = new Date(history.lastShown).setHours(0,0,0,0);

        if (popup.trigger_type === 'DAILY_LIMIT' && lastShownDate !== today) {
            history.count = 1; // Reset for new day
        } else {
            history.count += 1;
        }
        
        history.lastShown = Date.now();
        localStorage.setItem(historyKey, JSON.stringify(history));
    };

    const fetchAndShowPopup = async () => {
        if (!supabase) return;
        
        // Fetch Active Popups
        const { data, error } = await supabase
            .from('popup_notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }); // Prioritize newest

        if (!error && data) {
            for (const popup of data) {
                if (checkPopupEligibility(popup)) {
                    setActivePopup(popup);
                    setIsVisible(true);
                    updateHistory(popup);
                    
                    // Auto Close Logic
                    if (popup.auto_close_ms > 0) {
                        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = setTimeout(() => {
                            handleClose();
                        }, popup.auto_close_ms);
                    }
                    break; // Show only one at a time
                }
            }
        }
    };

    useEffect(() => {
        // Initial Check
        fetchAndShowPopup();

        // Realtime Subscription
        if (!supabase) return;
        const channel = supabase.channel('global-popup-listener')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'popup_notifications' }, () => {
                // Re-evaluate when any popup changes (e.g. admin enables one)
                // Note: If a popup is currently showing, this might replace it if a newer one becomes active. 
                // For smoother UX, we could check if !isVisible before running.
                if (!isVisible) fetchAndShowPopup();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []); // Remove isVisible dependency to avoid loops, rely on internal state check inside listener if needed

    const handleClose = () => {
        setIsVisible(false);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setTimeout(() => setActivePopup(null), 300); // Wait for animation
    };

    const handleAction = () => {
        if (activePopup?.action_url) {
            window.open(activePopup.action_url, '_blank');
        }
        handleClose();
    };

    if (!activePopup) return null;

    return (
        <div className={`global-popup-overlay ${isVisible ? 'visible' : ''}`}>
            <div className="global-popup-content">
                {activePopup.image_url && (
                    <img src={activePopup.image_url} alt={activePopup.title} className="popup-image" />
                )}
                
                <div className="popup-body">
                    {activePopup.title && <h2 className="popup-title">{activePopup.title}</h2>}
                    
                    <div className="popup-actions">
                        {activePopup.action_btn_text && (
                            <button className="popup-action-btn" onClick={handleAction}>
                                {activePopup.action_btn_text}
                            </button>
                        )}
                    </div>
                </div>

                {activePopup.is_dismissible && (
                    <button className="popup-close-btn" onClick={handleClose}>&times;</button>
                )}
            </div>
        </div>
    );
};

export default GlobalPopup;
