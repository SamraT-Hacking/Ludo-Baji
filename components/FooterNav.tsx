import React from 'react';
import { View } from '../App';
import { GamepadIconSVG, PlayIconSVG, GridIconSVG, UsersIconSVG } from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';

interface FooterNavProps {
    currentView: View;
    setView: (view: View) => void;
    onMoreClick: () => void;
}

const FooterNav: React.FC<FooterNavProps> = ({ currentView, setView, onMoreClick }) => {
    const { t } = useLanguage();
    const gradientId = "nav-icon-gradient";

    const navContainerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        borderRadius: '20px 20px 0 0',
    };

    const navItemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        color: '#94a3b8',
        fontSize: '0.7rem',
        fontWeight: '600',
        flex: 1,
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        position: 'relative',
    };

    const activeNavItemStyle: React.CSSProperties = {
        color: '#e71e54',
        transform: 'translateY(-4px)',
    };

    const activeIndicatorStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '4px',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: `url(#${gradientId})`,
        opacity: 1,
        transition: 'opacity 0.3s',
    };

    const navItems = [
        { id: 'tournaments', label: t('nav_game', 'Game'), icon: GamepadIconSVG },
        { id: 'how-to-play', label: t('nav_how_to_play', 'How To Play'), icon: PlayIconSVG },
        { id: 'global-chat', label: t('nav_global_chat', 'Global Chat'), icon: UsersIconSVG },
        { id: 'more', label: t('nav_more', 'More'), icon: GridIconSVG },
    ];

    const handleClick = (id: View | 'more') => {
        if (id === 'more') {
            onMoreClick();
        } else {
            setView(id as View);
        }
    }

    return (
        <footer className="app-footer" style={{ background: 'transparent', boxShadow: 'none' }}>
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e71e54" />
                        <stop offset="50%" stopColor="#ff3c83" />
                        <stop offset="100%" stopColor="#4299e1" />
                    </linearGradient>
                </defs>
            </svg>

            <nav style={navContainerStyle}>
                {navItems.map(item => {
                    const isActive = currentView === item.id;
                    const iconHtml = typeof item.icon === 'function' ? item.icon(isActive) : item.icon;
                    const displayIcon = isActive
                        ? iconHtml.replace(/stroke="[^"]*"/g, `stroke="url(#${gradientId})"`)
                        : iconHtml;

                    return (
                        <button
                            key={item.id}
                            style={{ ...navItemStyle, ...(isActive && activeNavItemStyle) }}
                            onClick={() => handleClick(item.id as View | 'more')}
                        >
                            <div
                                dangerouslySetInnerHTML={{ __html: displayIcon }}
                                style={{
                                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(231, 30, 84, 0.3))' : 'none',
                                    transition: 'filter 0.3s ease'
                                }}
                            />
                            <span style={isActive ? { background: 'linear-gradient(45deg, #e71e54, #4299e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
                                {item.label}
                            </span>
                            {isActive && <div style={activeIndicatorStyle}></div>}
                        </button>
                    );
                })}
            </nav>
        </footer>
    );
};

export default FooterNav;
