import React from 'react';
import { View } from '../App';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onLogout: () => void;
  playerName: string;
  isAdmin: boolean;
  onEnterAdminView: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, playerName, isAdmin, onEnterAdminView, isOpen, onClose }) => {
  const sidebarStyle: React.CSSProperties = {
    width: 'var(--sidebar-width)',
    backgroundColor: '#1a202c',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    textAlign: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid #4a5568'
  };
  
  const navStyle: React.CSSProperties = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
  };

  const navItemStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontSize: '1.1rem',
    textTransform: 'capitalize'
  };
  
  const adminButtonStyle: React.CSSProperties = {
      ...navItemStyle,
      backgroundColor: '#c53030',
      marginTop: '1rem',
      textAlign: 'center',
      fontWeight: 'bold'
  };

  const footerStyle: React.CSSProperties = {
    borderTop: '1px solid #4a5568',
    paddingTop: '1rem',
    textAlign: 'center',
  };
  
  const logoutButtonStyle: React.CSSProperties = {
      background: 'none',
      border: '1px solid #f44336',
      color: '#f44336',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      cursor: 'pointer',
      width: '100%',
      fontSize: '1rem'
  }

  const navItems: View[] = ['dashboard', 'tournaments', 'wallet', 'leaderboard', 'profile'];
  
  const handleNavClick = (view: View) => {
      setView(view);
      onClose();
  };
  
  const handleAdminClick = () => {
      onEnterAdminView();
      onClose();
  }

  return (
    <div style={sidebarStyle} className={`sidebar ${isOpen ? 'open' : ''}`}>
      <h1 style={headerStyle}>Dream Ludo</h1>
      <nav style={navStyle}>
        {navItems.map(view => (
          <div
            key={view}
            style={{
              ...navItemStyle,
              backgroundColor: currentView === view ? '#4a5568' : 'transparent',
            }}
            onClick={() => handleNavClick(view)}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = currentView !== view ? '#2d3748' : '#4a5568'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = currentView === view ? '#4a5568' : 'transparent'}
          >
            {view}
          </div>
        ))}
        {isAdmin && (
            <div 
                style={adminButtonStyle}
                onClick={handleAdminClick}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#9b2c2c'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#c53030'}
            >
                Admin Panel
            </div>
        )}
      </nav>
      <div style={footerStyle}>
          <p style={{margin: '0 0 1rem 0', wordBreak: 'break-word'}}>Hi, {playerName}</p>
          <button onClick={onLogout} style={logoutButtonStyle}>Logout</button>
      </div>
    </div>
  );
};

export default Sidebar;