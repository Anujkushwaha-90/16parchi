import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { Settings, Volume2, VolumeX, ShieldAlert, LogOut, Trash2, User, Check } from 'lucide-react';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [volume, setVolume] = useState(sound.getVolume() * 100);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    localStorage.getItem('parchi_reduced_motion') === 'true'
  );

  if (!user) return null;

  const handleMuteToggle = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
    if (!next) sound.playClick();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    sound.setVolume(val / 100);
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    localStorage.setItem('parchi_reduced_motion', next ? 'true' : 'false');
    showToast(next ? 'Reduced motion enabled' : 'Full animations enabled', 'info');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingProfile(true);
    sound.playClick();
    try {
      await api.updateProfile(displayName.trim());
      await refreshUser();
      showToast('Profile updated successfully!', 'success');
    } catch (e: any) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? All match records and friends will be permanently deleted.')) {
      return;
    }
    sound.playClick();
    try {
      await api.deleteAccount();
      await logout();
      onNavigate('landing');
      showToast('Account deleted', 'info');
    } catch (e) {
      showToast('Failed to delete account', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-ivory-100 flex items-center gap-3">
          <Settings className="w-8 h-8 text-gold-400" />
          <span>Game Settings & Account</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Audio effects, visual accessibility, and account management
        </p>
      </div>

      {/* Audio & Sound Settings */}
      <div className="p-6 rounded-3xl bg-table-surface border border-table-border space-y-6">
        <h3 className="font-serif font-bold text-base text-ivory-100 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <span>Synthesized Web Audio Settings</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-ivory-100">Sound Effects (SFX)</div>
            <div className="text-xs text-stone-400">Card slips, deal flips, timer ticks, victory fanfares</div>
          </div>
          <button
            onClick={handleMuteToggle}
            className={`p-3 rounded-2xl border transition-all ${
              !isMuted
                ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400 shadow-emerald-glow'
                : 'bg-red-950/40 border-red-500/50 text-red-400'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-stone-300 mb-2">
            <span>Volume Level</span>
            <span className="font-mono">{Math.round(volume)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-gold-500"
          />
        </div>
      </div>

      {/* Accessibility & Visual Settings */}
      <div className="p-6 rounded-3xl bg-table-surface border border-table-border space-y-4">
        <h3 className="font-serif font-bold text-base text-ivory-100 flex items-center gap-2">
          <span>Accessibility & Performance</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-ivory-100">Reduced Motion</div>
            <div className="text-xs text-stone-400">Minimize animations for cards and background transitions</div>
          </div>
          <button
            onClick={handleToggleReducedMotion}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              reducedMotion ? 'bg-gold-500' : 'bg-table-card border border-table-border'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-table-dark transition-transform ${
                reducedMotion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Profile & Display Name */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-table-surface border border-table-border space-y-4">
        <h3 className="font-serif font-bold text-base text-ivory-100 flex items-center gap-2">
          <User className="w-5 h-5 text-gold-400" />
          <span>Profile Details</span>
        </h3>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-table-card border border-table-border text-sm text-ivory-100 focus:outline-none focus:border-gold-400"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="gold-gradient-btn px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Account Management & Deletion */}
      <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 space-y-4">
        <h3 className="font-serif font-bold text-base text-red-200 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <span>Account Actions</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            onClick={() => {
              sound.playClick();
              logout();
              onNavigate('landing');
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow"
          >
            <Trash2 className="w-4 h-4" />
            <span>Permanently Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
