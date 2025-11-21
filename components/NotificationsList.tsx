
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Notification } from '../types';

interface NotificationsListProps {
  onViewNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ onViewNotification, setUnreadCount }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const markAsRead = async (notificationsToMark: Notification[]) => {
        if (!supabase) return;
        const unreadIds = notificationsToMark.filter(n => !n.is_read).map(n => n.id);
        
        if (unreadIds.length > 0) {
            const { error } = await supabase.rpc('mark_notifications_as_read', {
                notification_ids: unreadIds
            });
            if (!error) {
                setUnreadCount(0);
            }
        } else {
             setUnreadCount(0);
        }
    };

    const fetchNotifications = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);

        const { data: { user } } = await (supabase.auth as any).getUser();
        if (!user) {
            setLoading(false);
            return;
        }
        const userId = user.id;

        const { data: allNotifications, error: notificationsError } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (notificationsError) {
            console.error("Error fetching notifications:", notificationsError);
            setLoading(false);
            return;
        }
        
        if (allNotifications.length === 0) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        const notificationIds = allNotifications.map(n => n.id);
        const { data: readStatuses, error: readStatusError } = await supabase
            .from('notification_read_status')
            .select('notification_id')
            .eq('user_id', userId)
            .in('notification_id', notificationIds);
        
        if (readStatusError) {
             console.error("Error fetching read statuses:", readStatusError);
        }

        const readNotificationIds = new Set(readStatuses?.map(s => s.notification_id) || []);

        const processedNotifications = allNotifications.map(n => ({
            ...n,
            is_read: readNotificationIds.has(n.id)
        }));

        processedNotifications.sort((a, b) => {
            if (a.is_read !== b.is_read) {
                return a.is_read ? 1 : -1; // unread (false) comes first
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setNotifications(processedNotifications);
        markAsRead(processedNotifications);
        setLoading(false);
    }, [setUnreadCount]);


    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const handleView = (notification: Notification) => {
        onViewNotification(notification);
    }

    const getTimeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="notification-modal-overlay" onClick={() => window.history.back()}>
            <div className="notification-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="notification-modal-header">
                    <span>Notifications</span>
                    <button onClick={() => window.history.back()} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>&times;</button>
                </div>
                <ul className="notification-list">
                    {loading && <li style={{padding: '1rem', textAlign: 'center'}}>Loading...</li>}
                    {!loading && notifications.length === 0 && (
                        <li style={{padding: '2rem', textAlign: 'center', color: '#666'}}>You have no notifications.</li>
                    )}
                    {notifications.map(n => (
                        <li key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleView(n)}>
                            <span className="notification-status-dot"></span>
                            <div className="notification-content-wrapper">
                                <div className="notification-title">{n.title}</div>
                                <div className="notification-time">{getTimeAgo(n.created_at)}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default NotificationsList;
