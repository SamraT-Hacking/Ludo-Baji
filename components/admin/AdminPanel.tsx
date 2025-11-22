


import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import UserDetails from './UserDetails'; // New Import
import MatchManagement from './MatchManagement';
import MatchDetails from './MatchDetails';
import ChatManagement from './ChatManagement';
import FinancialManagement from './FinancialManagement'; // Now Transaction Logs
import DepositManagement from './DepositManagement'; // New
import WithdrawManagement from './WithdrawManagement'; // New
import NotificationManagement from './NotificationManagement';
import Settings from './Settings';
import { Tournament } from '../../types';
import { supabase } from '../../utils/supabase';
import SupportManagement from './SupportManagement';
import GlobalChatManagement from './GlobalChatManagement'; // New
import LanguageManagement from './LanguageManagement'; // New Import

interface AdminPanelProps {
    onExit: () => void;
    onLogout: () => void;
    appTheme: 'light' | 'dark';
    toggleAppTheme: () => void;
}

export type AdminView = 'dashboard' | 'users' | 'matches' | 'chat' | 'transactions' | 'deposits' | 'withdrawals' | 'notifications' | 'settings' | 'support' | 'global-chat' | 'languages';

const viewComponents: Record<AdminView, React.FC<any>> = {
    dashboard: AdminDashboard,
    users: UserManagement,
    matches: MatchManagement,
    chat: ChatManagement,
    transactions: FinancialManagement,
    deposits: DepositManagement,
    withdrawals: WithdrawManagement,
    notifications: NotificationManagement,
    settings: Settings,
    support: SupportManagement,
    'global-chat': GlobalChatManagement,
    languages: LanguageManagement, // Registered
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit, onLogout, appTheme, toggleAppTheme }) => {
    const [view, setView] = useState<AdminView>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Tournament | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // New State
    const [underReviewCount, setUnderReviewCount] = useState(0);

    // Handle URL based navigation (Browser Back Button support)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            // Expected format: #/admin/dashboard, #/admin/users, etc.
            if (hash.startsWith('#/admin/')) {
                const path = hash.replace('#/admin/', '');
                // Remove query params if any
                const cleanPath = path.split('?')[0];
                
                if (cleanPath in viewComponents) {
                    setView(cleanPath as AdminView);
                    setSelectedMatch(null); // Close details when navigating via URL
                    setSelectedUserId(null); // Close user details
                }
            } else if (hash === '#/admin' || hash === '#/admin/') {
                // Default to dashboard
                history.replaceState(null, '', '#/admin/dashboard');
                setView('dashboard');
            }
        };

        // Initial check
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleSetView = (newView: AdminView) => {
        // Update URL hash to trigger state change via effect
        window.location.hash = `/admin/${newView}`;
        setIsSidebarOpen(false);
    };

    const fetchUnderReviewCount = useCallback(async () => {
        if (!supabase) return;
        const { count, error } = await supabase
            .from('tournaments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'UNDER_REVIEW');
        
        if (count !== null) {
            setUnderReviewCount(count);
        }
    }, []);

    useEffect(() => {
        fetchUnderReviewCount();
        if (!supabase) return;

        const channel = supabase.channel('admin-panel-tournaments-under-review')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournaments',
                filter: 'status=eq.UNDER_REVIEW'
            }, () => fetchUnderReviewCount())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchUnderReviewCount]);


    const mainStyle: React.CSSProperties = {
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)', // Use CSS variable for theme support
        color: 'var(--text-main)',
        transition: 'background-color 0.3s ease, color 0.3s ease',
    };

    const headerStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'var(--bg-header)', // Use CSS variable
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        zIndex: 1000,
        boxShadow: '0 2px 4px var(--shadow-color)',
        color: 'var(--text-main)'
    };
    
    const titleStyle: React.CSSProperties = {
        fontSize: '1.4rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        marginLeft: '1rem',
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        padding: '1rem',
        paddingTop: 'calc(60px + 1rem)', // Account for header height
    };
    
    const menuButtonStyle: React.CSSProperties = {
        background: 'transparent',
        color: 'var(--text-main)',
        border: 'none',
        borderRadius: '8px',
        width: '44px',
        height: '44px',
        cursor: 'pointer',
        fontSize: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
    };
    
    const renderView = () => {
        if (selectedMatch) {
            return <MatchDetails match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
        }

        if (selectedUserId) {
            return <UserDetails userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
        }

        const Component = viewComponents[view] || AdminDashboard;
        const props: any = {
            setView: handleSetView // Pass setView to all components (Dashboard needs it)
        };
        
        if (view === 'matches') {
            props.onViewDetails = setSelectedMatch;
        }
        
        if (view === 'users') {
            props.onSelectUser = setSelectedUserId;
        }

        return <Component {...props} />;
    };
    
    const handleExit = () => {
        onExit();
    }

    return (
        <div style={mainStyle}>
             <header style={headerStyle}>
                <button style={menuButtonStyle} onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation menu">
                    {/* Vertical ellipsis for "3 dots" */}
                    &#8942;
                </button>
                <h1 style={titleStyle}>Admin Control</h1>
            </header>
            
            <AdminSidebar 
                currentView={view} 
                setView={handleSetView} 
                onExit={handleExit} 
                onLogout={onLogout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                appTheme={appTheme}
                toggleAppTheme={toggleAppTheme}
            />

            <main style={contentStyle} className="admin-panel-content">
                {underReviewCount > 0 && (
                    <div className="admin-alert-box">
                        You have {underReviewCount} {underReviewCount === 1 ? 'match' : 'matches'} waiting for admin review.
                    </div>
                )}
                {renderView()}
            </main>
        </div>
    );
};

export default AdminPanel;
