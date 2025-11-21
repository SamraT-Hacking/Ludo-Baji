
import React, { useContext } from 'react';
import { LudoLogoSVG, BellIconSVG } from '../assets/icons';
import { AppConfigContext } from '../App';

interface HeaderProps {
    unreadCount: number;
    onBellClick: () => void;
    adminStatus: 'online' | 'offline';
}

const Header: React.FC<HeaderProps> = ({ unreadCount, onBellClick, adminStatus }) => {
    const { appTitle } = useContext(AppConfigContext);

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        height: '100%',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '1.25rem',
        fontWeight: 'bold',
        margin: 0,
    };
    
    const rightControlsStyle: React.CSSProperties = {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    };

    return (
        <header className="app-header">
            <div style={headerStyle}>
                <div dangerouslySetInnerHTML={{ __html: LudoLogoSVG(32) }} />
                <h1 style={titleStyle}>{appTitle}</h1>
            </div>
            
            <div style={rightControlsStyle}>
                <div className="admin-status-indicator">
                    <span className={`status-dot ${adminStatus}`}></span>
                    <span className="status-text">Admin</span>
                </div>
                <button className="notification-bell" onClick={onBellClick} aria-label={`Notifications (${unreadCount} unread)`}>
                    <div dangerouslySetInnerHTML={{ __html: BellIconSVG }} />
                    {unreadCount > 0 && <div className="notification-dot"></div>}
                </button>
            </div>
        </header>
    );
};

export default Header;
