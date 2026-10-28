import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider, useGameSocket } from './context/SocketContext.js';
import { Navbar } from './components/Navbar.js';
import { LandingScreen } from './screens/LandingScreen.js';
import { AuthModal } from './screens/AuthModal.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { FriendsScreen } from './screens/FriendsScreen.js';
import { RoomSelectScreen } from './screens/RoomSelectScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { GameTableScreen } from './screens/GameTableScreen.js';
import { RankingsScreen } from './screens/RankingsScreen.js';
import { MatchHistoryScreen } from './screens/MatchHistoryScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';

function MainApp() {
  const { user, loading } = useAuth();
  const { publicState } = useGameSocket();
  const [currentScreen, setCurrentScreen] = useState<string>('landing');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Auto-redirect to dashboard when authenticated on landing page
  useEffect(() => {
    if (user && currentScreen === 'landing') {
      setCurrentScreen('dashboard');
    }
  }, [user]);

  // Check URL params for direct room link (e.g. ?room=PR8K2M)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setActiveRoomCode(roomParam.toUpperCase());
      if (user) {
        setCurrentScreen('lobby');
      } else {
        setIsAuthModalOpen(true);
      }
    }
  }, [user]);

  // If socket reveals an active or dealing game, auto switch to table
  useEffect(() => {
    if (
      publicState &&
      (publicState.status === 'ACTIVE' || publicState.status === 'DEALING') &&
      currentScreen !== 'table'
    ) {
      setCurrentScreen('table');
    }
  }, [publicState?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-table-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-400 rounded-full animate-spin mb-4 mx-auto" />
          <h2 className="text-lg font-serif font-black text-ivory-100">16 PARCHI</h2>
          <p className="text-xs text-stone-400 mt-1">Preparing gaming table...</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (screen: string) => {
    if (!user && screen !== 'landing') {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentScreen(screen);
  };

  const handleRoomCreatedOrJoined = (code: string) => {
    setActiveRoomCode(code);
    setCurrentScreen('lobby');
  };

  return (
    <div className="min-h-screen flex flex-col bg-table-dark text-ivory-100">
      <Navbar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        {currentScreen === 'landing' && (
          <LandingScreen
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentScreen === 'dashboard' && (
          <DashboardScreen
            onNavigate={handleNavigate}
            onJoinRoomByCode={(code) => handleRoomCreatedOrJoined(code)}
          />
        )}

        {currentScreen === 'friends' && (
          <FriendsScreen />
        )}

        {currentScreen === 'rooms' && (
          <RoomSelectScreen
            onRoomCreatedOrJoined={handleRoomCreatedOrJoined}
          />
        )}

        {currentScreen === 'lobby' && activeRoomCode && (
          <LobbyScreen
            roomCode={activeRoomCode}
            onMatchStarted={() => setCurrentScreen('table')}
            onLeaveLobby={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'table' && (
          <GameTableScreen
            onMatchFinished={() => setCurrentScreen('rankings')}
            onExitToLobby={() => setCurrentScreen('lobby')}
          />
        )}

        {currentScreen === 'rankings' && (
          <RankingsScreen
            onReturnToLobby={() => setCurrentScreen('lobby')}
            onReturnToDashboard={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'history' && (
          <MatchHistoryScreen />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen onNavigate={handleNavigate} />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          if (activeRoomCode) {
            setCurrentScreen('lobby');
          } else {
            setCurrentScreen('dashboard');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <MainApp />
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
