import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { optimizeProfilePhoto } from '../utils/imageOptimizer.js';
import { isVipUser, VipUniqueName } from '../utils/vip.js';
import { VipLoveAura, VipBadgeTag } from '../components/VipLoveAura.js';
import {
  Settings,
  Volume2,
  ShieldAlert,
  LogOut,
  Trash2,
  Check,
  Sparkles,
  Camera,
  Upload,
  User,
  Loader2,
  History,
} from 'lucide-react';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
}

const PRESET_AVATARS = [
  { label: '👑 Raja', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RajaGold' },
  { label: '✨ Rani', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RaniRoyal' },
  { label: '🛡️ Wazir', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=WazirCommander' },
  { label: '⚔️ Sipahi', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SipahiShield' },
  { label: '🌙 Chor', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ChorShadow' },
  { label: '🔥 Warrior', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=WarriorFire' },
  { label: '🦁 Sher', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LionRoar' },
  { label: '🦚 Peacock', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PeacockGrace' },
  { label: '⚡ Bolt', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SpeedBolt' },
  { label: '🐉 Dragon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DragonLord' },
  { label: '🦅 Falcon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FalconHunter' },
  { label: '🐺 Wolf', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShadowWolf' },
  { label: '💎 Diamond', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DiamondKnight' },
  { label: '🎭 Phantom', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PhantomMask' },
  { label: '🏹 Cupid', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CupidGolden' },
  { label: '🎴 Grandmaster', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Grandmaster16' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [volume, setVolume] = useState(sound.getVolume() * 100);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || PRESET_AVATARS[0].url);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'upload' | 'presets'>('upload');
  const [reducedMotion, setReducedMotion] = useState(
    localStorage.getItem('parchi_reduced_motion') === 'true'
  );
  const [avatarHistory, setAvatarHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isVip = isVipUser(user);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getAvatarHistory();
      if (res && Array.isArray(res.history)) {
        setAvatarHistory(res.history);
      }
    } catch (e) {
      console.warn('Failed to fetch avatar history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
    if (user?.avatarUrl) setSelectedAvatar(user.avatarUrl);
  }, [user]);

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

  /**
   * Instant Auto-Save Photo to Database
   */
  const handleAutoSavePhoto = async (avatarUrl: string, source: string, fileSize?: number) => {
    try {
      setUploadingPhoto(true);
      setSelectedAvatar(avatarUrl);

      // Save directly to database permanently
      const res = await api.updateProfile(undefined, avatarUrl, source, fileSize);
      if (res && res.user) {
        updateUser(res.user);
      }
      await refreshUser();
      await fetchHistory();

      sound.playClick();
      showToast('Profile photo uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Device File Select Handler with Canvas Auto-Crop & Instant Save
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      sound.playClick();

      // Compress and square-crop photo
      const result = await optimizeProfilePhoto(file, 280, 0.88);

      // Instantly save to database
      await handleAutoSavePhoto(result.dataUrl, 'CUSTOM_UPLOAD', result.fileSize);
    } catch (err: any) {
      showToast(err?.message || 'Failed to process selected photo', 'error');
      setUploadingPhoto(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Preset Avatar Click with Instant Save
   */
  const handlePresetSelect = async (presetUrl: string) => {
    sound.playClick();
    await handleAutoSavePhoto(presetUrl, 'PRESET_ROYAL');
  };

  /**
   * Save Display Name
   */
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      showToast('Display name cannot be empty', 'error');
      return;
    }
    if (cleanName === user.displayName) {
      showToast('Display name is already up to date', 'info');
      return;
    }

    setSavingName(true);
    sound.playClick();
    try {
      await api.updateProfile(cleanName);
      await refreshUser();
      showToast('Display name updated successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update display name', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you sure you want to permanently delete your account? All match records and friends will be deleted.'
      )
    ) {
      return;
    }
    sound.playClick();
    try {
      await api.deleteAccount();
      await logout();
      onNavigate('landing');
      showToast('Account permanently deleted', 'info');
    } catch (e) {
      showToast('Failed to delete account', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-ivory-100 flex items-center gap-3">
          <Settings className="w-8 h-8 text-gold-400" />
          <span>Game Settings & Profile</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Upload custom photos, select avatars, update display name, and manage audio
        </p>
      </div>

      {/* Profile Photo Studio */}
      <div className="p-6 rounded-3xl bg-table-surface border border-gold-500/40 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-table-border pb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-bold text-base text-ivory-100">
              Profile Photo
            </h3>
          </div>
          <span className="text-xs font-mono text-gold-300">
            {user.friendCode}
          </span>
        </div>

        {/* Current Avatar Hero Card */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-table-dark/70 border border-table-border">
          <div className="relative group shrink-0">
            {isVip ? (
              <VipLoveAura size="lg">
                <img
                  src={selectedAvatar}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)]"
                />
              </VipLoveAura>
            ) : (
              <img
                src={selectedAvatar}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-gold-400/60 shadow-gold-glow bg-emerald-950"
              />
            )}

            {/* Quick Upload Button on Avatar */}
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo from device"
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-gold-500 hover:bg-gold-400 text-table-dark shadow-lg transition-transform hover:scale-110 border-2 border-table-dark disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {isVip ? (
                <VipUniqueName name={displayName} className="text-lg" showTitle={false} />
              ) : (
                <span className="text-lg font-bold text-ivory-100">{displayName}</span>
              )}
              {isVip && <VipBadgeTag subtitle="Eternal Sovereign" />}
            </div>

            <div className="text-xs text-stone-400 font-mono">
              @{user.username} • {user.friendCode}
            </div>

            <p className="text-xs text-emerald-400 font-medium">
              {uploadingPhoto ? 'Saving photo to database...' : '✓ Photo is active and saved in database'}
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Tabs: Upload vs Royal Presets */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-table-border pb-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setAvatarTab('upload');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                avatarTab === 'upload'
                  ? 'bg-gold-500 text-table-dark shadow-gold-glow'
                  : 'text-stone-400 hover:text-ivory-100 hover:bg-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📁 Upload from Device</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setAvatarTab('presets');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                avatarTab === 'presets'
                  ? 'bg-gold-500 text-table-dark shadow-gold-glow'
                  : 'text-stone-400 hover:text-ivory-100 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>👑 Royal Presets (16)</span>
            </button>
          </div>

          {/* TAB 1: Upload from Phone / PC */}
          {avatarTab === 'upload' && (
            <>
              <div className="p-6 rounded-2xl border-2 border-dashed border-gold-500/30 hover:border-gold-400/60 bg-table-card/60 transition-all text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-ivory-100">
                    Select Any Photo from Your Phone or Computer
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                    Supports PNG, JPG, JPEG, and WEBP. As soon as you select a photo, it is automatically center-cropped and saved permanently in the database.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gold-500 hover:bg-gold-400 text-table-dark flex items-center gap-2 shadow-gold-glow transition-all mx-auto disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>{uploadingPhoto ? 'Uploading & Saving...' : 'Choose Photo from Device'}</span>
                  </button>
                </div>
              </div>

              {/* Saved Uploads History Gallery */}
              <div className="p-4 rounded-2xl bg-table-card/70 border border-table-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-200 flex items-center gap-2">
                    <History className="w-4 h-4 text-gold-400" />
                    <span>Aapki Saved Photos (Database History)</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                    {avatarHistory.length} photo{avatarHistory.length !== 1 ? 's' : ''} saved
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-stone-400">
                    <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                    <span>Database se photos load ho rahi hain...</span>
                  </div>
                ) : avatarHistory.length === 0 ? (
                  <div className="py-4 text-center text-xs text-stone-400 bg-black/20 rounded-xl border border-dashed border-white/10">
                    Abhi tak koi photo upload nahi ki gayi hai. Upar wale button se upload karein!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                    {avatarHistory.map((item) => {
                      const isActive = selectedAvatar === item.avatarUrl;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => handleAutoSavePhoto(item.avatarUrl, 'HISTORY_RESTORE', item.fileSize)}
                          className={`relative group rounded-xl p-1.5 border-2 transition-all flex flex-col items-center gap-1.5 text-center ${
                            isActive
                              ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_15px_rgba(52,211,153,0.4)] scale-105'
                              : 'border-white/10 hover:border-gold-400/70 bg-black/40 hover:bg-black/60'
                          }`}
                          title="Click to activate this photo"
                        >
                          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-900 border border-white/10">
                            <img
                              src={item.avatarUrl}
                              alt="Uploaded"
                              className="w-full h-full object-cover"
                            />
                            {isActive && (
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                <span className="p-1 rounded-full bg-emerald-500 text-black shadow-md">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="w-full">
                            <span className={`block text-[10px] font-bold truncate ${isActive ? 'text-emerald-400' : 'text-stone-300'}`}>
                              {isActive ? '✓ Active' : 'Tap to Use'}
                            </span>
                            <span className="block text-[9px] text-stone-500 font-mono truncate">
                              {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: Royal Presets Gallery (16) */}
          {avatarTab === 'presets' && (
            <div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.url;
                  return (
                    <button
                      key={av.url}
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => handlePresetSelect(av.url)}
                      className={`relative p-1 rounded-2xl border-2 transition-all group disabled:opacity-50 ${
                        isSelected
                          ? 'border-gold-400 bg-gold-500/20 shadow-gold-glow scale-105'
                          : 'border-table-border bg-table-card hover:border-stone-400'
                      }`}
                    >
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-full aspect-square rounded-xl object-cover bg-table-dark"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-400 text-table-dark flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <span className="block text-[9px] font-bold text-stone-300 truncate mt-1">
                        {av.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Display Name Section */}
        <form onSubmit={handleSaveName} className="pt-4 border-t border-table-border">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Display Name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              maxLength={30}
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your player name..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-table-card border border-table-border text-sm text-ivory-100 focus:outline-none focus:border-gold-400 font-bold"
            />
            <button
              type="submit"
              disabled={savingName || !displayName.trim() || displayName.trim() === user.displayName}
              className="gold-gradient-btn px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{savingName ? 'Updating...' : 'Update Name'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Audio & Sound Settings */}
      <div className="p-6 rounded-3xl bg-table-surface border border-table-border space-y-6">
        <h3 className="font-serif font-bold text-base text-ivory-100 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <span>Game Audio Settings</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-ivory-100">Sound Effects (SFX)</div>
            <div className="text-xs text-stone-400">Card slips, deal flips, timer ticks, victory fanfares</div>
          </div>
          <button
            onClick={handleMuteToggle}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              !isMuted ? 'bg-emerald-500' : 'bg-table-card border border-table-border'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-table-dark transition-transform ${
                !isMuted ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {!isMuted && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Volume</span>
              <span className="font-mono text-ivory-100">{Math.round(volume)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full accent-gold-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Visual Accessibility */}
      <div className="p-6 rounded-3xl bg-table-surface border border-table-border space-y-4">
        <h3 className="font-serif font-bold text-base text-ivory-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>Accessibility & Performance</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-ivory-100">Reduced Motion</div>
            <div className="text-xs text-stone-400">Minimize animations for cards and transitions</div>
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

      {/* Account Actions */}
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
