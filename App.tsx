
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

import { GameStatus, Tournament, Notification, Profile as ProfileType } from './types';
import { themes, ThemeName } from './themes';
import { supabase } from './utils/supabase';
import LoadingScreen from './components/LoadingScreen';
import ServerSetupGuide from './components/ServerSetupGuide';
import GameOverModal from './components/GameOverModal';
import SimpleMessageModal from './components/SimpleMessageModal';
import LicenseActivation from './components/LicenseActivation';
import MaintenancePage from './components/MaintenancePage';

// Import Language Provider
import { LanguageProvider } from './contexts/LanguageContext';
// FIX: Corrected import casing for cacheBuster.
import { checkAppVersion } from './utils/cacheBuster';
import Home from './components/Home';

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

// IMPORTANT: This should be configured by the buyer.
// It's the URL of their self-hosted licensing server.
const LICENSE_SERVER_URL = 'https://licensing-server-hg9l.onrender.com'; 

function App() {
  // State for license check
  const [isLicensed, setIsLicensed] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeName>('classic');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [currentView, setCurrentView] = useState<View>('tournaments');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [adminStatus, setAdminStatus] = useState<'online' | 'offline'>('offline');
  const [adminCommission, setAdminCommission] = useState(0);
  
  const [appConfig, setAppConfig] = useState({
      appTitle: 'Dream Ludo',
      currencySymbol: '৳',
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showLandingPage, setShowLandingPage] = useState(true);

  // Maintenance Mode State
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; mode: 'manual' | 'scheduled'; end_time: string | null }>({
      enabled: false,
      mode: 'manual',
      end_time: null
  });
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);

  // Version Check
  useEffect(() => {
      checkAppVersion();
  }, []);

  // License Check
  useEffect(() => {
      const verifyLicense = async () => {
          try {
              const response = await fetch(`${LICENSE_SERVER_URL}/api/check-domain`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ domain: window.location.hostname })
              });
              
              if (!response.ok) throw new Error('Server check failed');
              const data = await response.json();
              
              if (data.active) {
                  setIsLicensed(true);
              } else {
                  setIsLicensed(false);
                  setLicenseError(data.message || 'License not active.');
              }
          } catch (err) {
              console.error("License Check Failed:", err);
              // In production, strict mode would block access.
              // For now, if server is unreachable, we might allow access or block.
              // Here we assume strict: block if cannot verify.
              setIsLicensed(false);
              setLicenseError('Could not connect to licensing server.');
          } finally {
              setCheckingLicense(false);
          }
      };
      verifyLicense();
  }, []);

  // Initial Data Fetch (Session, Admin Status, Config, Maintenance)
  useEffect(() => {
    if (!supabase) return;

    const initData = async () => {
      const { data: { session } } = await (supabase.auth as any).getSession();
      setSession(session);
      if (session) {
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          if (data?.role === 'admin') setIsAdmin(true);
      }

      const { data: settingsData } = await supabase.from('app_settings').select('key, value');
      if (settingsData) {
          const getSetting = (key: string) => settingsData.find(s => s.key === key)?.value;
          
          const statusVal = getSetting('admin_status');
          if (statusVal) setAdminStatus(statusVal.status);
          
          const configVal = getSetting('app_config');
          if (configVal) setAppConfig(configVal);

          const commissionVal = getSetting('admin_commission_percent');
          if (commissionVal) setAdminCommission(commissionVal.percentage);

          const maintenanceVal = getSetting('maintenance_mode');
          if (maintenanceVal) setMaintenanceMode(maintenanceVal);
      }
      setLoadingMaintenance(false);
    };

    initData();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
          setShowLandingPage(false); // Auto-hide landing page on login
          // Re-check admin status on login
          supabase.from('profiles').select('role').eq('id', session.user.id).single()
            .then(({ data }) => {
                if (data?.role === 'admin') setIsAdmin(true);
                else setIsAdmin(false);
            });
      } else {
          setShowLandingPage(true);
          setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime Maintenance Mode Listener
  useEffect(() => {
      if (!supabase) return;

      const channel = supabase.channel('app-maintenance-updates')
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'app_settings', 
              filter: 'key=eq.maintenance_mode' 
          }, (payload) => {
              const newVal = payload.new as any;
              if (newVal && newVal.value) {
                  console.log("Maintenance mode updated:", newVal.value);
                  setMaintenanceMode(newVal.value);
              }
          })
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, []);

  // Unread Notifications Count
  useEffect(() => {
      if (!supabase || !session) return;
      const fetchUnread = async () => {
          const { data: allNotifications } = await supabase.from('notifications').select('id');
          if (allNotifications) {
              const { count } = await supabase
                  .from('notification_read_status')
                  .select('*', { count: 'exact', head: true })
                  .eq('user_id', session.user.id);
              const total = allNotifications.length;
              const read = count || 0;
              setUnreadCount(Math.max(0, total - read));
          }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 60000);
      return () => clearInterval(interval);
  }, [session]);

  // Theme Management
  const toggleAppTheme = useCallback(() => {
      const newTheme = theme === 'classic' ? 'dark' : 'classic'; // Assuming 'modern' maps to dark mode styles conceptually or we strictly use 'light'/'dark' naming in future
      // For now, let's stick to the ThemeName type but toggle between them.
      // Wait, index.html uses data-theme="dark".
      // Let's align React state with DOM attribute
      const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      setTheme(nextTheme === 'dark' ? 'modern' : 'classic'); // Mapping: classic->light, modern->dark
  }, [theme]);

  // Use Game Hook
  const { gameState, connectionStatus, error: gameError, startGame, rollDice, movePiece, leaveGame, sendChatMessage } = useGameServer(gameCode, session?.access_token);

  // Handle Game Server Errors
  useEffect(() => {
      if (gameError) setServerError(gameError);
  }, [gameError]);

  const handleJoinGame = (code: string) => {
      setGameCode(code);
  };

  const handleResetGame = () => {
      leaveGame();
      setGameCode(null);
  };

  const handleNavigateToLogin = () => {
      setShowLandingPage(false);
  };

  // --- RENDER LOGIC ---

  if (checkingLicense || loadingMaintenance) {
      return <LoadingScreen message="Initializing..." />;
  }

  if (!isLicensed) {
      return <LicenseActivation 
          onActivationSuccess={() => window.location.reload()} 
          initialError={licenseError}
          serverUrl={LICENSE_SERVER_URL}
      />;
  }

  // Maintenance Mode Check
  // If enabled AND user is NOT admin AND (manual mode OR scheduled time is in future)
  if (maintenanceMode.enabled && !isAdmin) {
      const isManual = maintenanceMode.mode === 'manual';
      const isFuture = maintenanceMode.end_time && new Date(maintenanceMode.end_time) > new Date();
      
      if (isManual || isFuture) {
          return <MaintenancePage endTime={maintenanceMode.end_time} />;
      }
  }

  if (!session) {
      if (showLandingPage) {
          return <AppConfigContext.Provider value={appConfig}>
                    <Home onNavigateToLogin={handleNavigateToLogin} />
                 </AppConfigContext.Provider>;
      }
      return <LanguageProvider><Auth /></LanguageProvider>;
  }

  if (serverError) {
      return <ServerSetupGuide error={serverError} onDismiss={() => setServerError(null)} />;
  }

  // If in a game
  if (gameCode && gameState) {
      return (
          <AppConfigContext.Provider value={appConfig}>
              <Game
                  state={gameState}
                  rollDice={rollDice}
                  movePiece={movePiece}
                  setAnimating={() => {}}
                  resetGame={handleResetGame}
                  playerId={session.user.id}
                  sendChatMessage={sendChatMessage}
              />
          </AppConfigContext.Provider>
      );
  }

  // If in Lobby
  if (gameCode && !gameState) {
       return (
           <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
               <div className="spinner"></div>
               <p style={{marginLeft: '1rem'}}>Connecting to game server...</p>
               <button onClick={() => setGameCode(null)} style={{marginLeft: '1rem', padding: '0.5rem 1rem', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px'}}>Cancel</button>
           </div>
       );
  }

  if (currentView === 'admin' && isAdmin) {
      return (
          <LanguageProvider>
              <AppConfigContext.Provider value={appConfig}>
                  <AdminPanel 
                      onExit={() => setCurrentView('dashboard')} 
                      onLogout={() => supabase?.auth.signOut()}
                      appTheme={theme === 'classic' ? 'light' : 'dark'}
                      toggleAppTheme={toggleAppTheme}
                  />
              </AppConfigContext.Provider>
          </LanguageProvider>
      );
  }

  const handleViewContest = (tournament: Tournament) => {
      setSelectedTournament(tournament);
  };

  if (selectedTournament) {
      return (
          <LanguageProvider>
              <AppConfigContext.Provider value={appConfig}>
                  <ContestDetails 
                      tournament={selectedTournament} 
                      onPlayNow={(code) => setGameCode(code)} 
                      userId={session.user.id}
                      adminCommission={adminCommission}
                  />
              </AppConfigContext.Provider>
          </LanguageProvider>
      );
  }

  const renderView = () => {
      switch (currentView) {
          case 'dashboard': return <Dashboard setView={setCurrentView} />;
          case 'tournaments': return <Tournaments userId={session.user.id} setView={setCurrentView} onViewContest={handleViewContest} />;
          case 'wallet': return <Wallet />;
          case 'leaderboard': return <Leaderboard />;
          case 'profile': return <Profile session={session} />;
          case 'transaction-history': return <TransactionHistory />;
          case 'how-to-play': return <HowToPlay />;
          case 'privacy-policy': return <PrivacyPolicy />;
          case 'faq': return <FAQ />;
          case 'support-chat': return <SupportChat />;
          case 'about-us': return <AboutUs />;
          case 'terms-and-conditions': return <TermsAndConditions />;
          case 'refer-and-earn': return <ReferAndEarn setView={setCurrentView} />;
          case 'refer-history': return <ReferHistory />;
          case 'refer-leaderboard': return <ReferLeaderboard />;
          case 'global-chat': return <GlobalChat />;
          default: return <Dashboard setView={setCurrentView} />;
      }
  };

  const getAppTheme = () => {
      // Map internal theme names to light/dark
      return theme === 'classic' ? 'light' : 'dark';
  }

  return (
    <LanguageProvider>
      <AppConfigContext.Provider value={appConfig}>
        <Header 
            unreadCount={unreadCount} 
            onBellClick={() => setShowNotifications(true)} 
            adminStatus={adminStatus} 
            appTheme={getAppTheme()}
            toggleAppTheme={toggleAppTheme}
        />
        
        <main className="main-content-area page-content">
            {renderView()}
        </main>

        <FooterNav 
            currentView={currentView} 
            setView={setCurrentView} 
            onMoreClick={() => setIsMoreMenuOpen(true)} 
        />

        {isMoreMenuOpen && (
            <MoreMenu 
                setView={(view) => { setCurrentView(view); setIsMoreMenuOpen(false); }} 
                onLogout={() => supabase?.auth.signOut()} 
                isAdmin={isAdmin}
                onEnterAdminView={() => { setCurrentView('admin'); setIsMoreMenuOpen(false); }}
                appTheme={getAppTheme()}
                toggleAppTheme={toggleAppTheme}
            />
        )}

        {showNotifications && (
            <NotificationsList 
                onViewNotification={(n) => { setSelectedNotification(n); setShowNotifications(false); }} 
                setUnreadCount={setUnreadCount}
            />
        )}

        {selectedNotification && (
            <NotificationDetails notification={selectedNotification} />
        )}

        <SupportChatWidget />
        
      </AppConfigContext.Provider>
    </LanguageProvider>
  );
}

export default App;
