import React from 'react';
import { View } from '../App';
import { 
    ProfileIconSVG, WalletIconSVG, TransactionHistoryIconSVG, LeaderboardIconSVG, 
    SupportChatIconSVG, FAQIconSVG, AboutUsIconSVG, UserGroupIconSVG,
    PrivacyPolicyIconSVG, TermsAndConditionsIconSVG, AdminPanelIconSVG, LogoutIconSVG,
    SunIconSVG, MoonIconSVG
} from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';

// Globe Icon
const GlobeIconSVG = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>
`;

interface MoreMenuProps {
    setView: (view: View) => void;
    onLogout: () => void;
    isAdmin: boolean;
    onEnterAdminView: () => void;
    appTheme: 'light' | 'dark';
    toggleAppTheme: () => void;
}

type MenuItem = { 
    id: View | 'admin' | 'logout' | 'theme' | 'language'; 
    label: string;
    icon: string;
    iconColor: string;
};

const MoreMenu: React.FC<MoreMenuProps> = ({ setView, onLogout, isAdmin, onEnterAdminView, appTheme, toggleAppTheme }) => {
    const { t, languages, currentLang, changeLanguage } = useLanguage();
    
    const menuItems: MenuItem[] = [
        { id: 'profile', label: t('menu_profile', 'Profile'), icon: ProfileIconSVG(), iconColor: '#4299e1' },
        { id: 'wallet', label: t('menu_wallet', 'My Wallet'), icon: WalletIconSVG(), iconColor: '#48bb78' },
        { id: 'transaction-history', label: t('menu_history', 'Transaction History'), icon: TransactionHistoryIconSVG(), iconColor: '#9f7aea' },
        { id: 'refer-and-earn', label: t('menu_refer', 'Refer & Earn'), icon: UserGroupIconSVG(), iconColor: '#fbbf24' },
        { id: 'leaderboard', label: t('menu_leaderboard', 'Leaderboard'), icon: LeaderboardIconSVG(), iconColor: '#ed8936' },
        { id: 'support-chat', label: t('menu_support', 'Support Chat'), icon: SupportChatIconSVG(), iconColor: '#38b2ac' },
        { id: 'faq', label: t('menu_faq', 'FAQ'), icon: FAQIconSVG(), iconColor: '#63b3ed' },
        { id: 'about-us', label: t('menu_about', 'About Us'), icon: AboutUsIconSVG(), iconColor: '#a3bffa' },
        { id: 'privacy-policy', label: t('menu_privacy', 'Privacy Policy'), icon: PrivacyPolicyIconSVG(), iconColor: '#a0aec0' },
        { id: 'terms-and-conditions', label: t('menu_terms', 'Terms & Conditions'), icon: TermsAndConditionsIconSVG(), iconColor: '#718096' },
        { 
            id: 'theme', 
            label: appTheme === 'light' ? t('menu_theme_dark', 'Dark Mode') : t('menu_theme_light', 'Light Mode'), 
            icon: appTheme === 'light' ? MoonIconSVG() : SunIconSVG(), 
            iconColor: '#555' 
        },
        {
            id: 'language',
            label: languages.find(l => l.code === currentLang)?.name || t('menu_language', 'Language'),
            icon: GlobeIconSVG(),
            iconColor: '#e91e63'
        }
    ];
    
    if (isAdmin) {
        menuItems.push({ id: 'admin', label: t('menu_admin', 'Admin Panel'), icon: AdminPanelIconSVG(), iconColor: '#2c5282' });
    }
    menuItems.push({ id: 'logout', label: t('menu_logout', 'Logout'), icon: LogoutIconSVG(), iconColor: '#e53e3e' });
    
    const handleClick = (id: View | 'admin' | 'logout' | 'theme' | 'language') => {
        if (id === 'admin') {
            onEnterAdminView();
        } else if (id === 'logout') {
            onLogout();
        } else if (id === 'theme') {
            toggleAppTheme();
        } else if (id === 'language') {
            const currentIndex = languages.findIndex(l => l.code === currentLang);
            const nextIndex = (currentIndex + 1) % languages.length;
            changeLanguage(languages[nextIndex].code);
        } else {
            setView(id as View);
        }
    }
    
    return (
        <div className="more-menu-overlay" onClick={() => window.history.back()}>
            <div className="more-menu-container" onClick={(e) => e.stopPropagation()}>
                {menuItems.map(item => (
                    <div key={item.id} className="more-menu-card">
                        <button
                            className="more-menu-item"
                            onClick={() => handleClick(item.id)}
                        >
                            <div className="more-menu-icon" style={{ backgroundColor: item.iconColor, color: '#fff' }}>
                                <div dangerouslySetInnerHTML={{ __html: item.icon }} />
                            </div>
                            <span className="more-menu-label" style={item.id === 'logout' ? { color: 'var(--primary-red)' } : {}}>
                                {item.label}
                            </span>
                            {item.id === 'language' && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>
                                    {languages.find(l => l.code === currentLang)?.flag_icon}
                                </span>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MoreMenu;
