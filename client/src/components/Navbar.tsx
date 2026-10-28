import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { Volume2, VolumeX, Users, Swords, History, Settings, LogOut, Copy, Check, Menu, X, Crown } from 'lucide-react';

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  pendingInvitesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  pendingInvitesCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
    if (!next) sound.playClick();
    showToast(next ? 'Sound Muted' : 'Sound Enabled', 'info');
  };

  const copyFriendCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.friendCode);
    setCopiedCode(true);
    sound.playClick();
    showToast('Friend code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Crown },
    { id: 'rooms', label: 'Rooms', icon: Swords },
    { id: 'friends', label: 'Friends', icon: Users, badge: pendingInvitesCount },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-table-surface/90 backdrop-blur-md border-b border-table-border shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('dashboard');
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-amber-700 flex items-center justify-center shadow-gold-glow group-hover:scale-105 transition-transform border border-gold-300/40">
            <span className="font-serif font-black text-table-dark text-lg tracking-tighter">16</span>
          </div>
          <div>
            <div className="font-serif font-black text-lg tracking-wider text-ivory-100 flex items-center gap-1.5">
              <span>PARCHI</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold">
                Online
              </span>
            </div>
            <div className="text-[10px] text-stone-400 tracking-wider">Multiplayer Table</div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        {user && (
          <nav className="hidden md:flex items-center gap-1.5 bg-table-dark/60 p-1.5 rounded-2xl border border-table-border">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.playClick();
                    onNavigate(item.id);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gold-500 text-table-dark shadow-gold-glow font-bold'
                      : 'text-stone-300 hover:text-ivory-100 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full font-bold animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-xl border border-table-border bg-table-card hover:bg-white/5 text-stone-300 hover:text-gold-400 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Friend Code Badge */}
              <button
                onClick={copyFriendCode}
                title="Click to copy friend code"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-table-card border border-gold-500/30 text-xs font-mono text-gold-300 hover:border-gold-400 transition-colors"
              >
                <span>{user.friendCode}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
              </button>

              {/* Profile Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-table-border">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full border border-gold-400/50 object-cover bg-emerald-950"
                />
                <span className="hidden lg:inline text-xs font-bold text-ivory-100 max-w-[100px] truncate">
                  {user.displayName}
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    logout();
                    onNavigate('landing');
                  }}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="gold-gradient-btn px-4 py-1.5 rounded-xl text-xs font-bold shadow-md"
            >
              Sign In
            </button>
          )}

          {/* Mobile Menu Toggle */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-table-border bg-table-card text-stone-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-table-border bg-table-surface px-4 py-3 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold ${
                  isActive ? 'bg-gold-500 text-table-dark' : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div className="pt-2 border-t border-table-border flex items-center justify-between text-xs text-stone-400">
            <span>Friend Code: <span className="font-mono text-gold-300">{user.friendCode}</span></span>
            <button onClick={copyFriendCode} className="text-gold-400 font-semibold">Copy</button>
          </div>
        </div>
      )}
    </header>
  );
};
