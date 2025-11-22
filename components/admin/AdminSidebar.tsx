
import React from 'react';
import { AdminView } from './AdminPanel';
import { 
    UserGroupIconSVG, TotalMatchesIconSVG, WalletIconSVG, 
    AdminPendingIconSVG, TransactionHistoryIconSVG, LeaderboardIconSVG,
    SupportChatIconSVG, FAQIconSVG, AdminPanelIconSVG, AdminCalendarIconSVG,
    GlobalChatIconSVG, SunIconSVG, MoonIconSVG, PlayIconSVG
} from '../../assets/icons';

// Globe Icon for Languages
const GlobeIconSVG = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>
`;

// Megaphone Icon for Popups
const MegaphoneIconSVG = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m3 11 18-5v12L3 14v-3z"></path>
  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
</svg>
`;

interface AdminSidebarProps {
  currentView: AdminView;
  setView: (view: AdminView) => void;
  onExit: () => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  appTheme: 'light' | 'dark';
  toggleAppTheme: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, setView, onExit, onLogout, isOpen, onClose, appTheme, toggleAppTheme }) => {
    
    const sidebarStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-card)', // Follow app theme
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        zIndex: 1002,
        transform: isOpen ? 'translateX(0)' : 'translateX(calc(-1 * var(--sidebar-width)))',
        transition: 'transform 0.3s ease-in-out, background-color 0.3s ease, color 0.3s ease',
        boxShadow: '3px 0 15px var(--shadow-color)',
        overflowY: 'auto',
        borderRight: '1px solid var(--border-color)'
    };
    
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1001,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.3s ease-in-out',
        backdropFilter: 'blur(2px)'
    };

    const headerStyle: React.CSSProperties = {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    };
    
    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: 'var(--text-main)',
        fontSize: '2rem',
        cursor: 'pointer',
        lineHeight: 1,
        padding: '0 0.5rem'
    };

    const navStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        overflowY: 'auto',
    };

    const navItemStyle: React.CSSProperties = {
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        fontSize: '1rem',
        textTransform: 'capitalize',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: 'var(--text-secondary)'
    };
    
    const exitButtonStyle: React.CSSProperties = {
        ...navItemStyle,
        backgroundColor: 'var(--bg-main)',
        marginTop: '1rem',
        justifyContent: 'center',
        fontWeight: 'bold',
        flexShrink: 0,
        color: 'var(--text-main)',
        border: '1px solid var(--border-color)'
    };
    
    const logoutButtonStyle: React.CSSProperties = {
        ...exitButtonStyle,
        backgroundColor: '#c53030',
        marginTop: '0.5rem',
        color: 'white',
        border: 'none'
    };

    const themeToggleStyle: React.CSSProperties = {
        ...navItemStyle,
        marginTop: 'auto',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem',
        borderRadius: 0,
        color: 'var(--text-main)'
    };

    const navItems: { view: AdminView; label: string; icon: string; color: string }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: AdminCalendarIconSVG(), color: '#a0aec0' },
        { view: 'users', label: 'Users', icon: UserGroupIconSVG(), color: '#4299e1' },
        { view: 'matches', label: 'Matches', icon: TotalMatchesIconSVG(), color: '#f56565' },
        { view: 'deposits', label: 'Deposits', icon: WalletIconSVG(), color: '#48bb78' },
        { view: 'withdrawals', label: 'Withdrawals', icon: AdminPendingIconSVG(), color: '#ed8936' },
        { view: 'transactions', label: 'History', icon: TransactionHistoryIconSVG(), color: '#9f7aea' },
        { view: 'notifications', label: 'Notify', icon: LeaderboardIconSVG(), color: '#38b2ac' },
        { view: 'popups', label: 'Popups', icon: MegaphoneIconSVG(), color: '#e53e3e' }, // New
        { view: 'chat', label: 'Game Chat', icon: SupportChatIconSVG(), color: '#ed64a6' },
        { view: 'global-chat', label: 'Global Chat', icon: GlobalChatIconSVG(), color: '#667eea' },
        { view: 'languages', label: 'Languages', icon: GlobeIconSVG(), color: '#00b5d8' }, 
        { view: 'videos', label: 'Videos', icon: PlayIconSVG(false), color: '#dd6b20' },
        { view: 'support', label: 'Support', icon: FAQIconSVG(), color: '#0bc5ea' },
        { view: 'settings', label: 'Settings', icon: AdminPanelIconSVG(), color: '#718096' }
    ];
    
    const handleNavItemClick = (view: AdminView) => {
        setView(view);
        onClose();
    };

    return (
        <>
            <div style={overlayStyle} onClick={onClose} />
            <div style={sidebarStyle}>
                <div style={headerStyle}>
                    <span>Admin Panel</span>
                    <button onClick={onClose} style={closeButtonStyle} aria-label="Close navigation menu">&times;</button>
                </div>
                <nav style={navStyle}>
                    {navItems.map(item => {
                        const isActive = currentView === item.view;
                        return (
                            <div
                                key={item.view}
                                style={{
                                    ...navItemStyle,
                                    backgroundColor: isActive ? 'var(--bg-main)' : 'transparent',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                                    boxShadow: isActive ? '0 2px 4px var(--shadow-color)' : 'none'
                                }}
                                onClick={() => handleNavItemClick(item.view)}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-main)' }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    backgroundColor: item.color, display: 'flex',
                                    justifyContent: 'center', alignItems: 'center', color: 'white',
                                    flexShrink: 0
                                }}>
                                    <div dangerouslySetInnerHTML={{ __html: item.icon }} style={{ width: '18px', height: '18px' }} />
                                </div>
                                <span>{item.label}</span>
                            </div>
                        );
                    })}
                </nav>
                
                <div 
                    style={themeToggleStyle}
                    onClick={toggleAppTheme}
                >
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        backgroundColor: 'var(--bg-main)', display: 'flex',
                        justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)',
                        flexShrink: 0, border: '1px solid var(--border-color)'
                    }}>
                         <div dangerouslySetInnerHTML={{ __html: appTheme === 'light' ? MoonIconSVG() : SunIconSVG() }} style={{ width: '18px', height: '18px' }} />
                    </div>
                    <span>{appTheme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>

                <div 
                    style={exitButtonStyle} 
                    onClick={onExit}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                >
                    Exit Admin View
                </div>
                 <div 
                    style={logoutButtonStyle}
                    onClick={onLogout}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9b2c2c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c53030'}
                >
                    Logout
                </div>
            </div>
        </>
    );
};

export default AdminSidebar;
