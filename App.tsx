

import React, { useState, useEffect, useCallback } from 'react';
import { useGameServer } from './hooks/useGameServer';
import Game from './components/Game';
import Lobby from './components/Lobby';
import Auth from './components/Auth';
import Header from './components/Header';
import FooterNav from './components/FooterNav';
import MoreMenu from './components/MoreMenu';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Wallet from './components/Wallet';
import Leaderboard from './components/Leaderboard';
import Tournaments from './components/Tournaments';
import ContestDetails from './components/ContestDetails';
import AdminPanel from './components/admin/AdminPanel';
import NotificationsList from './components/NotificationsList';
import NotificationDetails from './components/NotificationDetails';
import HowToPlay from './components/HowToPlay';
import TransactionHistory from './components/TransactionHistory';
import PrivacyPolicy from './components/PrivacyPolicy';
import FAQ from './components/FAQ';
import SupportChat from './components/SupportChat';
import AboutUs from './components/AboutUs';
import TermsAndConditions from './components/TermsAndConditions';
import ReferAndEarn from './components/ReferAndEarn';
import ReferHistory from './components/ReferHistory';
import ReferLeaderboard from './components/ReferLeaderboard';
import SupportChatWidget from './components/SupportChatWidget';
import GlobalChat from './components/GlobalChat';
import { isIncognito } from './utils/security';
import { GameStatus, Tournament, Notification, Profile as ProfileType, SecurityConfig } from './types';
import { themes, ThemeName } from './themes';
import { supabase } from './utils/supabase';
import LoadingScreen from './components/LoadingScreen';
import ServerSetupGuide from './components/ServerSetupGuide';
import GameOverModal from './components/GameOverModal';
import SimpleMessageModal from './components/SimpleMessageModal';

// Import Language Provider
import { LanguageProvider } from './contexts/LanguageContext';
import { checkAppVersion } from './utils/cacheBuster';

// Updated View type to include 'admin' base route and 'global-chat'
export type View = 
  | 'dashboard' | 'tournaments' | 'wallet' | 'leaderboard' | 'profile' | 'how-to-play'
  | 'transaction-history' | 'privacy-policy' | 'faq' 
  | 'support-chat' | 'about-us' | 'terms-and-conditions'
  | 'refer-and-earn' | 'refer-history' | 'refer-leaderboard' | 'admin' | 'global-chat';

// Global Context for App Configuration
export const AppConfigContext = React.createContext({
  appTitle: 'Dream Ludo',
  currencySymbol: '৳',
});

function App() {
  const [theme, setTheme] = useState<ThemeName>('classic');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [currentView, setCurrentView] = useState<View>('tournaments');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [adminStatus, setAdminStatus] = useState<'online' | 'offline'>('offline');
  const [adminCommission, setAdminCommission] = useState(0);
  
  // App Configuration State
  const [appConfig, setAppConfig] = useState({
      appTitle: 'Dream Ludo',
      currencySymbol: '৳'
  });
  
  // Theme State (App Mode: Light/Dark) - Default to Light
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');

  // Notification state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Loading state for initial session check
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  // Security State
  const [isBlockedBySecurity, setIsBlockedBySecurity] = useState(false);
  const [securityBlockMessage, setSecurityBlockMessage] = useState('');

  const playerName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Player';
  const playerId = session?.user?.id || null;
  const sessionToken = session?.access_token || null;

  const { gameState, connectionStatus, error, startGame, rollDice, movePiece, leaveGame, sendChatMessage } = useGameServer(gameCode, sessionToken);
  
  // 1. VERSION CHECK & CACHE CLEANUP ON MOUNT
  useEffect(() => {
      checkAppVersion();
  }, []);

  // 2. Security Checks on Mount
  useEffect(() => {
    const runSecurityChecks = async () => {
        if (!supabase) return;
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'security_config').single();
        if (data?.value) {
            const config = data.value as SecurityConfig;
            if (config.incognitoBlockEnabled) {
                const isPrivate = await isIncognito();
                if (isPrivate) {
                    setSecurityBlockMessage('Access from incognito or private browsing mode is not permitted.');
                    setIsBlockedBySecurity(true);
                }
            }
        }
    };
    runSecurityChecks();
  }, []);

  // Initialize App Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') as 'light' | 'dark';
    if (savedTheme) {
        setAppTheme(savedTheme);
    } else {
        // Force default to light if no preference saved
        setAppTheme('light');
        localStorage.setItem('appTheme', 'light');
    }
  }, []);

  // Apply App Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
    localStorage.setItem('appTheme', appTheme);
  }, [appTheme]);

  const toggleAppTheme = () => {
      setAppTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Inactivity Timer (1 Hour)
  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            console.log("User inactive for 1 hour. Refreshing session...");
            // Clear app-specific temporary storage
            try {
                sessionStorage.removeItem('ludoGameCode');
                sessionStorage.removeItem('pendingTransactionId');
            } catch (e) {
                console.warn("Could not clear session storage", e);
            }
            // Reload to refresh data and state, but keep auth cookie (handled by Supabase/Browser)
            window.location.reload();
        }, 3600000); // 1 hour in ms
    };

    // Listen for activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetInactivityTimer));

    // Start timer
    resetInactivityTimer();

    return () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        events.forEach(event => document.removeEventListener(event, resetInactivityTimer));
    };
  }, []);

  // Fetch App Config (Title, Currency)
  useEffect(() => {
      if (!supabase) return;
      const fetchConfig = async () => {
          const { data, error } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'app_config')
              .single();
          
          if (data && data.value) {
              const { title, currencySymbol } = data.value as any;
              setAppConfig({
                  appTitle: title || 'Dream Ludo',
                  currencySymbol: currencySymbol || '৳'
              });
          }
      };
      fetchConfig();
      
      // Update document title
      document.title = appConfig.appTitle;

      // Subscribe to changes
      const channel = supabase.channel('public:app_settings:config')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: "key=eq.app_config" }, payload => {
            const newVal = payload.new as any;
            if (newVal && newVal.value) {
                 setAppConfig({
                    appTitle: newVal.value.title || 'Dream Ludo',
                    currencySymbol: newVal.value.currencySymbol || '৳'
                });
            }
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
  }, [appConfig.appTitle]); // Re-run if title changes to update document.title

  // Re-update title when state changes effectively
  useEffect(() => {
      document.title = appConfig.appTitle;
  }, [appConfig.appTitle]);


  const fetchUnreadCount = useCallback(async () => {
    if (!supabase || !playerId) return;

    // Get IDs of notifications the user has read
    const { data: readStatuses, error: readError } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('user_id', playerId);

    if (readError) {
        console.error("Error fetching read statuses:", readError);
        return;
    }
    const readNotificationIds = readStatuses.map(s => s.notification_id);

    // Count all notifications that are NOT in the read list
    let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true });

    if (readNotificationIds.length > 0) {
        query = query.not('id', 'in', `(${readNotificationIds.join(',')})`);
    }
    
    const { count, error: unreadError } = await query;
        
    if (!unreadError) {
        setUnreadCount(count || 0);
    } else {
        console.error("Error fetching unread count:", unreadError);
    }
  }, [playerId]);
  
  const setView = (view: View) => {
    // If switching to admin, we let AdminPanel handle the sub-route default
    const path = view === 'admin' ? '/admin/dashboard' : `/${view}`;
    history.pushState({ view }, '', `/#${path}`);
    setCurrentView(view);
    setIsMoreMenuOpen(false);
    setIsNotificationsOpen(false);
    setSelectedTournament(null);
    setSelectedNotification(null);
  };

  useEffect(() => {
    if (!supabase) return;

    const checkAdminRole = async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.rpc('is_admin');
            if (error) throw error;
            const adminStatus = !!data;
            setIsAdmin(adminStatus);
            
            if (adminStatus) {
                const hash = window.location.hash;
                if (!hash || hash === '#/' || hash === '') {
                    setView('admin');
                }
            }
            return adminStatus;
        } catch (error: any) {
            console.error('Error checking admin role:', error.message || error);
            setIsAdmin(false);
            return false;
        }
    };
    
    const getSession = async () => {
        try {
            const { data, error } = await (supabase.auth as any).getSession();
            if (error) {
                console.error("Error fetching session:", error);
                setIsSessionLoading(false);
                return;
            }
            
            const currentSession = data.session;
            setSession(currentSession);
            if (currentSession?.user) {
                await checkAdminRole();
                await fetchUnreadCount();
            }
        } catch (e) {
            console.error("Unexpected session check error", e);
        } finally {
            setIsSessionLoading(false);
        }
    }
    
    const sessionTimeout = setTimeout(() => {
        if (isSessionLoading) {
            setIsSessionLoading(false);
        }
    }, 3000); 
    
    getSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
        setSession(session);
        if (_event === 'SIGNED_IN' && session?.user) {
            checkAdminRole().then(isAdmin => {
                const hash = window.location.hash;
                if (!hash || hash === '#/' || hash === '') {
                    if (!isAdmin) {
                        setView('tournaments');
                    }
                }
            });
            fetchUnreadCount();
        }
        if (_event === 'SIGNED_OUT') {
            setGameCode(null);
            setView('tournaments');
            setIsAdmin(false);
            try {
                sessionStorage.removeItem('ludoGameCode');
            } catch (e) {
                console.warn("Could not access sessionStorage to clear game code on logout.", e);
            }
        }
    });
    
    const notificationsChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
        clearTimeout(sessionTimeout);
        subscription.unsubscribe();
        supabase.removeChannel(notificationsChannel);
    };
  }, [fetchUnreadCount]);
  
    // BROWSER HISTORY NAVIGATION
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const hash = window.location.hash.replace(/^#\//, '');
            // Split by ? to ignore query params when determining view
            const [path] = hash.split('?');
            const [viewStr, overlay] = path.split('/');
            
            const view = (viewStr as View) || 'tournaments';

            setCurrentView(view);
            setIsMoreMenuOpen(overlay === 'more');
            setIsNotificationsOpen(overlay === 'notifications');
            
            if (overlay !== 'contest') {
                setSelectedTournament(null);
            }
            if (overlay !== 'notification') {
                setSelectedNotification(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        handlePopState({} as PopStateEvent); // Handle initial load

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    const openMoreMenu = () => {
        history.pushState({ view: currentView, modal: 'more' }, '', `/#/${currentView}/more`);
        setIsMoreMenuOpen(true);
    };

    const openNotifications = () => {
        history.pushState({ view: currentView, modal: 'notifications' }, '', `/#/${currentView}/notifications`);
        setIsNotificationsOpen(true);
    };

    const viewContest = (tournament: Tournament) => {
        history.pushState({ view: currentView, detail: 'contest', detailId: tournament.id }, '', `/#/${currentView}/contest/${tournament.id}`);
        setSelectedTournament(tournament);
    };

    const viewNotification = (notification: Notification) => {
        history.pushState({ view: currentView, detail: 'notification', detailId: notification.id }, '', `/#/${currentView}/notification/${notification.id}`);
        setSelectedNotification(notification);
    };

  // Admin status subscription
    useEffect(() => {
        if (!supabase) return;
        
        const fetchAppSettings = async () => {
            const { data, error } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['admin_status', 'admin_commission_percent']);
            
            if (data) {
                const statusSetting = data.find(s => s.key === 'admin_status');
                if (statusSetting && statusSetting.value && typeof (statusSetting.value as any).status === 'string') {
                    setAdminStatus((statusSetting.value as any).status);
                }

                const commissionSetting = data.find(s => s.key === 'admin_commission_percent');
                if (commissionSetting && commissionSetting.value && typeof (commissionSetting.value as any).percentage === 'number') {
                    setAdminCommission((commissionSetting.value as any).percentage);
                }
            }
        };
        
        fetchAppSettings();

        const channel = supabase
          .channel('public:app_settings')
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'app_settings',
            }, 
            payload => {
                const record = payload.new as any;
                if (record.key === 'admin_status') {
                    const newStatus = record?.value?.status;
                     if (newStatus === 'online' || newStatus === 'offline') {
                        setAdminStatus(newStatus);
                    }
                } else if (record.key === 'admin_commission_percent') {
                     const newCommission = record?.value?.percentage;
                     if (typeof newCommission === 'number') {
                         setAdminCommission(newCommission);
                     }
                }
            }
          )
          .subscribe();
          
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    
  // Effect to manage root padding for fullscreen game view
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      if (gameCode) {
        rootElement.style.paddingTop = '0';
      } else {
        rootElement.style.paddingTop = '';
      }
    }
    return () => {
      if (rootElement) {
        rootElement.style.paddingTop = '';
      }
    };
  }, [gameCode]);

  const handleJoinGame = (code: string) => {
    try {
        sessionStorage.setItem('ludoGameCode', code);
    } catch (e) {
        console.warn("Could not access sessionStorage. Game state will not be preserved across reloads.", e);
    }
    setGameCode(code);
    setSelectedTournament(null);
  };
  
  const handleLeaveGame = () => {
      leaveGame();
      setGameCode(null);
      try {
          sessionStorage.removeItem('ludoGameCode');
      } catch (e) {
          console.warn("Could not access sessionStorage to clear game code.", e);
      }
  }

  const handleLogout = useCallback(async () => {
    if (supabase) {
        setIsMoreMenuOpen(false);
        await (supabase.auth as any).signOut();
    }
  }, []);

  // Realtime subscription to force logout if user is banned
  useEffect(() => {
    if (!supabase || !playerId) return;

    const profileChannel = supabase.channel(`profile-changes-for-${playerId}`)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${playerId}`
        }, (payload) => {
            if ((payload.new as ProfileType).is_banned) {
                alert('Your account has been suspended by an administrator.');
                handleLogout(); 
            }
        })
        .subscribe();
    return () => { supabase.removeChannel(profileChannel); };
  }, [playerId, handleLogout]);
  
  const handleEnterAdminView = () => {
      setView('admin');
  }

  const appStyle: React.CSSProperties = {
    minHeight: '100vh',
    transition: 'background-color 0.3s ease',
  };

  const renderCurrentView = () => {
    let content;
    switch (currentView) {
        case 'dashboard':
            content = <Dashboard setView={setView} />;
            break;
        case 'tournaments':
            content = playerId ? <Tournaments userId={playerId} setView={setView} onViewContest={viewContest} /> : null;
            break;
        case 'wallet':
            content = <Wallet />;
            break;
        case 'leaderboard':
            content = <Leaderboard />;
            break;
        case 'profile':
            content = session ? <Profile key={session.user.id} session={session} /> : <div>Loading...</div>;
            break;
        case 'how-to-play':
            content = <HowToPlay />;
            break;
        case 'refer-and-earn':
            content = <ReferAndEarn setView={setView} />;
            break;
        case 'refer-history':
            content = <ReferHistory />;
            break;
        case 'refer-leaderboard':
            content = <ReferLeaderboard />;
            break;
        case 'transaction-history':
            content = <TransactionHistory />;
            break;
        case 'privacy-policy':
            content = <PrivacyPolicy />;
            break;
        case 'faq':
            content = <FAQ />;
            break;
        case 'support-chat':
            content = <SupportChat />;
            break;
        case 'about-us':
            content = <AboutUs />;
            break;
        case 'terms-and-conditions':
            content = <TermsAndConditions />;
            break;
        case 'global-chat':
            content = <GlobalChat />;
            break;
        default:
            content = playerId ? <Tournaments userId={playerId} setView={setView} onViewContest={viewContest} /> : null;
            break;
    }
    
    // Only wrap in page-content for specific views to handle scrolling properly within the component
    if (currentView !== 'tournaments' && currentView !== 'global-chat') {
        return <div className="page-content">{content}</div>;
    }
    return content;
  }

  const renderContent = () => {
    if (isBlockedBySecurity) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem', textAlign: 'center' }}>
                <h1 style={{ color: 'var(--primary-red)'}}>Access Denied</h1>
                <p>{securityBlockMessage}</p>
                <p>Please use a standard browser window to use this application.</p>
            </div>
        )
    }

    if (isSessionLoading) {
        return <LoadingScreen message="Loading..." />;
    }

    if (!session) {
        return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)'}}><Auth /></div>;
    }
    
    if (gameCode) {
        if (connectionStatus === 'connecting') {
            return <LoadingScreen message="Connecting to Game Server..." />;
        }
        if (connectionStatus === 'reconnecting') {
            return <LoadingScreen message="Connection lost. Reconnecting..." />;
        }
        
        if (connectionStatus === 'disconnected' && gameState && gameState.gameStatus === GameStatus.Finished) {
            return (
                <GameOverModal
                    winner={gameState.winner}
                    players={gameState.players}
                    onReset={() => { setGameCode(null); try { sessionStorage.removeItem('ludoGameCode'); } catch (e) { console.warn("Could not access sessionStorage.", e); } }}
                    isArchived={true}
                    gameId={gameState.gameId}
                />
            );
        }

        if (connectionStatus === 'disconnected' && error) {
            if (error.includes('This game has already been played.')) {
                return (
                    <SimpleMessageModal
                        title="Match Over"
                        message={error}
                        onClose={() => { setGameCode(null); try { sessionStorage.removeItem('ludoGameCode'); } catch (e) { console.warn("Could not access sessionStorage.", e); } }}
                    />
                );
            }
            return (
                <ServerSetupGuide 
                    error={error}
                    onDismiss={() => { setGameCode(null); try { sessionStorage.removeItem('ludoGameCode'); } catch (e) { console.warn("Could not access sessionStorage.", e); } }}
                />
            )
        }
    }

    if (gameCode && gameState && connectionStatus === 'connected') {
        if (gameState.gameStatus === GameStatus.Setup) {
            return <Lobby gameId={gameCode} gameState={gameState} onStartGame={startGame} playerId={playerId} onLeave={handleLeaveGame} />;
        }
        return (
          <Game 
            state={gameState} 
            rollDice={rollDice} 
            movePiece={movePiece} 
            setAnimating={() => {}} 
            resetGame={handleLeaveGame}
            playerId={playerId}
            forceSync={() => {}}
            sendChatMessage={sendChatMessage}
          />
        );
    }
    
    if (isAdmin && currentView === 'admin') {
        return (
            <AdminPanel 
                onExit={() => setView('dashboard')} 
                onLogout={handleLogout} 
                appTheme={appTheme}
                toggleAppTheme={toggleAppTheme}
            />
        );
    }
    
    if (selectedTournament && playerId) {
        return (
            <>
                <Header unreadCount={unreadCount} onBellClick={openNotifications} adminStatus={adminStatus} />
                <ContestDetails
                    tournament={selectedTournament}
                    onPlayNow={handleJoinGame}
                    userId={playerId}
                    adminCommission={adminCommission}
                />
            </>
        );
    }

    if (selectedNotification) {
        return (
            <>
                <Header unreadCount={unreadCount} onBellClick={openNotifications} adminStatus={adminStatus} />
                <NotificationDetails notification={selectedNotification} />
            </>
        );
    }

    return (
        <>
            <Header unreadCount={unreadCount} onBellClick={openNotifications} adminStatus={adminStatus} />
            <main className="main-content-area">
                {renderCurrentView()}
            </main>
            <FooterNav
                currentView={currentView}
                setView={setView}
                onMoreClick={openMoreMenu}
            />
            {isMoreMenuOpen && (
                <MoreMenu
                    setView={setView}
                    onLogout={handleLogout}
                    isAdmin={isAdmin}
                    onEnterAdminView={handleEnterAdminView}
                    appTheme={appTheme}
                    toggleAppTheme={toggleAppTheme}
                />
            )}
            {isNotificationsOpen && (
                <NotificationsList
                    onViewNotification={viewNotification}
                    setUnreadCount={setUnreadCount}
                />
            )}
            {session && (
                <>
                    <SupportChatWidget />
                </>
            )}
        </>
    )
  };

  return (
    <LanguageProvider>
      <div style={appStyle}>
        <AppConfigContext.Provider value={appConfig}>
          {renderContent()}
        </AppConfigContext.Provider>
      </div>
    </LanguageProvider>
  );
}

export default App;