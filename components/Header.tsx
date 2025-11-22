
import React, { useContext } from 'react';
import { LudoLogoSVG, BellIconSVG, MoonIconSVG, SunIconSVG } from '../assets/icons';
import { AppConfigContext } from '../App';

interface HeaderProps {
    unreadCount: number;
    onBellClick: () => void;
    adminStatus: 'online' | 'offline';
    appTheme: 'light' | 'dark';
    toggleAppTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ unreadCount, onBellClick, adminStatus, appTheme, toggleAppTheme }) => {
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
        gap: '0.75rem',
    };

    return (
        <header className="app-header">
            <div style={headerStyle}>
                <div dangerouslySetInnerHTML={{ __html: LudoLogoSVG(32) }} />
                <h1 style={titleStyle}>{appTitle}</h1>
                
                <button 
                    onClick={toggleAppTheme}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                    }}
                    title={appTheme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                    <div dangerouslySetInnerHTML={{ __html: appTheme === 'light' ? MoonIconSVG() : SunIconSVG() }} style={{ width: '20px', height: '20px' }} />
                </button>
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
