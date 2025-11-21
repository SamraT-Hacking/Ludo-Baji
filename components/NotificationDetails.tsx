import React from 'react';
import { Notification } from '../types';

interface NotificationDetailsProps {
    notification: Notification;
}

const NotificationDetails: React.FC<NotificationDetailsProps> = ({ notification }) => {
    return (
        <div className="notification-details-page page-content">
             <header className="contest-header" style={{top: 0, zIndex: 101, backgroundColor: 'var(--white)'}}>
                <button className="back-button" onClick={() => window.history.back()} aria-label="Go back">&larr;</button>
                <h1>Notification</h1>
            </header>
            <div className="notification-details-content">
                <h2 className="notification-details-title">{notification.title}</h2>
                <p className="notification-details-date">
                    {new Date(notification.created_at).toLocaleString()}
                </p>
                <div className="notification-details-body" dangerouslySetInnerHTML={{ __html: notification.content.replace(/\n/g, '<br />') }} />
            </div>
        </div>
    );
};

export default NotificationDetails;