import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { CardTheme, CustomParchiItem } from '../types/index.js';
import {
  Swords,
  PlusCircle,
  LogIn,
  Clock,
  Sparkles,
  Bot,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Type,
  Hash,
} from 'lucide-react';

interface RoomSelectScreenProps {
  onRoomCreatedOrJoined: (roomCode: string) => void;
}

export const RoomSelectScreen: React.FC<RoomSelectScreenProps> = ({
  onRoomCreatedOrJoined,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('royals');
  const [turnTimer, setTurnTimer] = useState<number>(20);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [deckMode, setDeckMode] = useState<'default' | 'custom'>('default');
  const [joinCode, setJoinCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Custom parchi names editable list
  const defaultCustomNames: CustomParchiItem[] = [
    { name: 'RAJA', count: 4, title: 'Raja (King)' },
    { name: 'RANI', count: 4, title: 'Rani (Queen)' },
    { name: 'CHOR', count: 4, title: 'Chor (Thief)' },
    { name: 'SIPAHI', count: 4, title: 'Sipahi (Guard)' },
    { name: 'VAZIR', count: 4, title: 'Vazir (Minister)' },
    { name: 'SENAPATI', count: 4, title: 'Senapati (General)' },
    { name: 'KHANSAAMA', count: 4, title: 'Khansaama (Chef)' },
    { name: 'JAASOOS', count: 4, title: 'Jaasoos (Spy)' },
  ];

  const [customItems, setCustomItems] = useState<CustomParchiItem[]>(
    defaultCustomNames.slice(0, 4)
  );

  // Sync custom items count when player count increases if using default seed
  useEffect(() => {
    if (customItems.length < playerCount) {
      const needed = playerCount - customItems.length;
      const additional = defaultCustomNames
        .slice(customItems.length, customItems.length + needed)
        .map((item, idx) => ({
          name: item?.name || `PARCHI ${customItems.length + idx + 1}`,
          count: 4,
          title: item?.title || `Slip ${customItems.length + idx + 1}`,
        }));
      setCustomItems((prev) => [...prev, ...additional]);
    }
  }, [playerCount]);

  const themes: Array<{
    id: CardTheme;
    title: string;
    description: string;
    identities: string[];
  }> = [
    {
      id: 'royals',
      title: '👑 Royal Court (Classic)',
      description: 'The authentic Indian 16 Parchi set (expanded up to 10 players)',
      identities: ['Raja', 'Rani', 'Chor', 'Sipahi', 'Vazir', 'Senapati', 'Khansaama', 'Jaasoos'],
    },
    {
      id: 'seasons',
      title: '🌸 Indian Seasons',
      description: 'Basant, Grishma, Sharad, Hemant, Varsha...',
      identities: ['Spring', 'Summer', 'Autumn', 'Winter', 'Monsoon', 'Blossom'],
    },
    {
      id: 'elements',
      title: '🔥 Primal Elements',
      description: 'Agni, Jal, Prithvi, Vayu, Aakash, Prakash...',
      identities: ['Fire', 'Water', 'Earth', 'Air', 'Ether', 'Light'],
    },
    {
      id: 'animals',
      title: '🦁 Jungle Beasts',
      description: 'Sher, Garuda, Baagh, Haathi, Ghora, Mor...',
      identities: ['Lion', 'Eagle', 'Tiger', 'Elephant', 'Horse', 'Peacock'],
    },
  ];

  // Validation computations
  const requiredParchis = 4 * playerCount;
  const currentTotalParchis = customItems.reduce((acc, it) => acc + (Number(it.count) || 0), 0);
  const trimmedNames = customItems.map((it) => (it.name || '').trim());
  const hasEmptyName = trimmedNames.some((n) => n.length === 0);
  const nameSet = new Set(trimmedNames.map((n) => n.toLowerCase()));
  const hasDuplicateName = trimmedNames.length !== nameSet.size;
  const hasEnoughUnique = nameSet.size >= playerCount;
  const hasEnoughCards = currentTotalParchis >= requiredParchis;
  const isCustomValid = !hasEmptyName && !hasDuplicateName && hasEnoughUnique && hasEnoughCards;

  const handleAddCustomRow = () => {
    sound.playClick();
    setCustomItems((prev) => [
      ...prev,
      {
        name: `PARCHI ${prev.length + 1}`,
        count: 4,
      },
    ]);
  };

  const handleRemoveCustomRow = (index: number) => {
    if (customItems.length <= 4) {
      showToast('Minimum 4 parchi names are required.', 'info');
      return;
    }
    sound.playClick();
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCustomName = (index: number, name: string) => {
    setCustomItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name } : item))
    );
  };

  const handleUpdateCustomCount = (index: number, countDelta: number) => {
    sound.playClick();
    setCustomItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newCount = Math.max(1, Math.min(12, (item.count || 4) + countDelta));
        return { ...item, count: newCount };
      })
    );
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    if (deckMode === 'custom' && !isCustomValid) {
      showToast('Please fix custom deck validation errors before starting.', 'error');
      return;
    }

    setLoading(true);
    try {
      const customDeckPayload =
        deckMode === 'custom'
          ? {
              isCustom: true,
              items: customItems.map((it) => ({
                name: it.name.trim(),
                count: Number(it.count) || 4,
                title: it.title || it.name.trim(),
              })),
            }
          : undefined;

      const res = await api.createRoom(
        deckMode === 'custom' ? 'custom' : selectedTheme,
        turnTimer,
        playerCount,
        customDeckPayload
      );

      if (res.room && res.room.code) {
        showToast(`Room ${res.room.code} created for ${playerCount} players!`, 'success');
        onRoomCreatedOrJoined(res.room.code);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      showToast('Please enter a valid room code', 'error');
      return;
    }
    sound.playClick();
    setLoading(true);
    try {
      const res = await api.joinRoom(clean);
      if (res.room && res.room.code) {
        showToast(`Joined Room ${res.room.code}!`, 'success');
        onRoomCreatedOrJoined(res.room.code);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to join room', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 mb-3 shadow-gold-glow">
          <Swords className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-black text-ivory-100">Multiplayer Tables</h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Play classic 4-player 16 Parchi or expand up to 8 players with custom Hindi & English parchi names!
        </p>
      </div>

      {/* Selector Tabs */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-table-surface border border-table-border">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('create');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-gold-500 text-table-dark shadow-gold-glow font-black'
                : 'text-stone-400 hover:text-ivory-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Host Private Room</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('join');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'join'
                ? 'bg-gold-500 text-table-dark shadow-gold-glow font-black'
                : 'text-stone-400 hover:text-ivory-100'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Join Existing Room</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Create Room */}
      {activeTab === 'create' ? (
        <form
          onSubmit={handleCreateRoom}
          className="p-6 sm:p-8 rounded-3xl bg-table-surface border border-table-border shadow-xl space-y-8"
        >
          {/* 1. Player Count Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-400" />
                <span>1. Table Player Capacity (Min: 4)</span>
              </label>
              <span className="text-xs font-mono font-bold text-gold-400">
                Dealing {playerCount * 4} total parchis (4 per player)
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {[4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPlayerCount(count);
                  }}
                  className={`py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                    playerCount === count
                      ? 'border-gold-500 bg-gold-500/10 text-gold-300 ring-2 ring-gold-400/40 shadow-gold-glow'
                      : 'border-table-border bg-table-card text-stone-400 hover:border-stone-500'
                  }`}
                >
                  <span className="text-base sm:text-lg font-black">{count}</span>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Players</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Deck Mode Toggle (Default Themes vs Custom Names) */}
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gold-400" />
              <span>2. Choose Parchi Names & Cards</span>
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setDeckMode('default');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  deckMode === 'default'
                    ? 'border-gold-500 bg-gold-500/10 text-gold-300 ring-2 ring-gold-400/30'
                    : 'border-table-border bg-table-card text-stone-400 hover:border-stone-500'
                }`}
              >
                <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <span>Option 1: Default Themes</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Automatic classic sets (Royal Court, Seasons, Elements, Animals)
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setDeckMode('custom');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  deckMode === 'custom'
                    ? 'border-gold-500 bg-gold-500/10 text-gold-300 ring-2 ring-gold-400/30'
                    : 'border-table-border bg-table-card text-stone-400 hover:border-stone-500'
                }`}
              >
                <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                  <Type className="w-4 h-4 text-gold-400" />
                  <span>Option 2: Custom Parchi Names</span>
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Enter your own words, Hindi, English, and custom quantities
                </div>
              </button>
            </div>

            {/* Sub-view: Default Themes */}
            {deckMode === 'default' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {themes.map((th) => (
                  <div
                    key={th.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedTheme(th.id);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedTheme === th.id
                        ? 'border-gold-500 bg-gold-500/10 shadow-gold-glow ring-2 ring-gold-400/30'
                        : 'border-table-border bg-table-card hover:border-stone-500'
                    }`}
                  >
                    <div className="text-sm font-bold text-ivory-100 mb-1">{th.title}</div>
                    <div className="text-xs text-stone-400 mb-2">{th.description}</div>
                    <div className="flex flex-wrap gap-1">
                      {th.identities.slice(0, playerCount).map((item, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-black/40 text-stone-300 border border-white/5"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-view: Custom Parchi Names */}
            {deckMode === 'custom' && (
              <div className="space-y-4 p-5 rounded-2xl bg-table-card border border-table-border">
                <div className="flex items-center justify-between border-b border-table-border pb-3">
                  <div>
                    <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gold-400" />
                      <span>Custom Parchi Deck Configuration</span>
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Enter words (Hindi/English), set counts (standard 4 copies each), and preview your deck.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomRow}
                    className="px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Word</span>
                  </button>
                </div>

                {/* Editable items list */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {customItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-table-surface border border-table-border/80"
                    >
                      <span className="text-xs font-mono font-bold text-stone-400 w-6 text-center">
                        #{idx + 1}
                      </span>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateCustomName(idx, e.target.value)}
                          placeholder="e.g. राजा, Tesla, Batman, Mango"
                          className="w-full bg-black/40 border border-table-border rounded-lg px-3 py-1.5 text-xs font-bold text-ivory-100 focus:outline-none focus:border-gold-400"
                        />
                      </div>

                      {/* Quantity selector */}
                      <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1 border border-white/5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCount(idx, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs text-stone-400 hover:text-white hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-black text-gold-300">
                          {item.count}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCount(idx, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs text-stone-400 hover:text-white hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomRow(idx)}
                        disabled={customItems.length <= 4}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-stone-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live Validation Pill */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    isCustomValid
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {isCustomValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}

                  <div className="flex-1">
                    {hasEmptyName && <span>Parchi names cannot be empty.</span>}
                    {!hasEmptyName && hasDuplicateName && (
                      <span>Duplicate parchi name detected. Each parchi name must be unique.</span>
                    )}
                    {!hasEmptyName && !hasDuplicateName && !hasEnoughUnique && (
                      <span>
                        Need at least {playerCount} unique parchi names for {playerCount} players (currently{' '}
                        {nameSet.size}).
                      </span>
                    )}
                    {!hasEmptyName && !hasDuplicateName && hasEnoughUnique && !hasEnoughCards && (
                      <span>
                        Need at least {requiredParchis} total parchis to deal 4 each to {playerCount}{' '}
                        players (currently {currentTotalParchis}).
                      </span>
                    )}
                    {isCustomValid && (
                      <span>
                        Deck Valid! Dealing 4 parchis to each of the {playerCount} players ({currentTotalParchis}{' '}
                        total parchis in deck).
                      </span>
                    )}
                  </div>

                  <span className="font-mono font-black text-xs">
                    {currentTotalParchis}/{requiredParchis} Cards
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Turn Time Limit */}
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-400" />
              <span>3. Turn Time Limit</span>
            </label>
            <div className="flex items-center gap-3">
              {[15, 20, 30].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTurnTimer(seconds);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    turnTimer === seconds
                      ? 'border-gold-500 bg-gold-500/10 text-gold-300 ring-2 ring-gold-400/30'
                      : 'border-table-border bg-table-card text-stone-400 hover:text-ivory-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{seconds} Seconds</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Bot feature reminder */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <Bot className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300">
              <span className="font-bold text-emerald-300">Smart AI Bots Supported:</span> You can invite your friends, or add instant AI bot players in the lobby to fill any open seat with one click!
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (deckMode === 'custom' && !isCustomValid)}
            className="gold-gradient-btn w-full py-4 rounded-2xl text-sm font-black shadow-gold-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PlusCircle className="w-5 h-5" />
            <span>
              {loading
                ? 'Creating Table...'
                : `Host Private Room for ${playerCount} Players (${
                    deckMode === 'custom' ? currentTotalParchis : playerCount * 4
                  } Parchis)`}
            </span>
          </button>
        </form>
      ) : (
        /* Tab 2: Join Room */
        <form
          onSubmit={handleJoinRoom}
          className="p-6 sm:p-8 rounded-3xl bg-table-surface border border-table-border shadow-xl space-y-6"
        >
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7X8K2P"
              className="w-full bg-table-card border border-table-border rounded-2xl px-5 py-3.5 text-center font-mono text-2xl font-black text-gold-300 tracking-widest focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || joinCode.trim().length < 4}
            className="gold-gradient-btn w-full py-3.5 rounded-2xl text-sm font-bold shadow-gold-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Joining Table...' : 'Join Game Room'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
