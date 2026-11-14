import { sound } from './sound.js';

export interface VoiceTaunt {
  id: string;
  label: string;
  dialogue: string;
  character: string;
  emoji: string;
  pitch: number;
  rate: number;
}

export const VOICE_TAUNTS: VoiceTaunt[] = [
  {
    id: 'panvel',
    label: 'Panvel Nikalna Hai',
    dialogue: 'Jaldi pass kar bhai, kal subah Panvel nikalna hai!',
    character: 'Vasooli Bhai',
    emoji: '⏳',
    pitch: 1.05,
    rate: 1.15,
  },
  {
    id: 'baburao',
    label: 'Aye Chup Kar Re',
    dialogue: 'Aye chup kar re baba, dimaag ki dahi mat kar!',
    character: 'Babu Rao',
    emoji: '🤡',
    pitch: 1.35,
    rate: 1.2,
  },
  {
    id: 'bhidu',
    label: 'Abhi Maza Aayega',
    dialogue: 'Abhi maza aayega na bhidu, parchi aane do!',
    character: 'Jaggu Dada',
    emoji: '👑',
    pitch: 0.85,
    rate: 1.05,
  },
  {
    id: 'bawaal',
    label: 'Bawaal Chiz Hai',
    dialogue: 'Ye kya bawaal bana diye ho babu!',
    character: 'Panchayat',
    emoji: '😱',
    pitch: 1.15,
    rate: 1.1,
  },
  {
    id: 'gaddari',
    label: 'Gaddari Karbe',
    dialogue: 'Gaddari karbe tor baap ke...',
    character: 'Desi Meme',
    emoji: '💥',
    pitch: 0.95,
    rate: 1.1,
  },
  {
    id: 'parchi_de',
    label: 'Parchi De Re Baba',
    dialogue: 'Parchi de re baba, der mat kar!',
    character: 'Raju',
    emoji: '🎯',
    pitch: 1.25,
    rate: 1.2,
  },
];

export interface ThrowItem {
  id: string;
  label: string;
  emoji: string;
  sfx: 'splat' | 'slap' | 'crack' | 'kiss' | 'squish';
}

export const THROW_ITEMS: ThrowItem[] = [
  { id: 'tomato', label: 'Tamatar', emoji: '🍅', sfx: 'splat' },
  { id: 'chappal', label: 'Chappal', emoji: '🩴', sfx: 'slap' },
  { id: 'egg', label: 'Anda', emoji: '🥚', sfx: 'crack' },
  { id: 'heart', label: 'Pyaar', emoji: '❤️', sfx: 'kiss' },
  { id: 'poop', label: 'Gobar', emoji: '💩', sfx: 'squish' },
];

class TauntService {
  private areTauntsMuted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('parchi_taunts_muted');
    this.areTauntsMuted = saved === 'true';
  }

  public getTauntsMuted(): boolean {
    return this.areTauntsMuted;
  }

  public setTauntsMuted(muted: boolean): void {
    this.areTauntsMuted = muted;
    localStorage.setItem('parchi_taunts_muted', muted ? 'true' : 'false');
  }

  public toggleTauntsMuted(): boolean {
    const next = !this.areTauntsMuted;
    this.setTauntsMuted(next);
    return next;
  }

  /**
   * Play Voice Taunt using Cartoon Horn + Expressive Speech
   */
  public playVoiceTaunt(tauntId: string): void {
    if (this.areTauntsMuted) return;

    const taunt = VOICE_TAUNTS.find((t) => t.id === tauntId);
    if (!taunt) return;

    // 1. Unlock audio context and play comedic cartoon horn intro
    sound.unlock();
    sound.playCartoonHorn(true);

    // 2. Play vocal dialogue via speech synthesis if available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(taunt.dialogue);
        utterance.pitch = taunt.pitch;
        utterance.rate = taunt.rate;
        utterance.volume = Math.max(0.6, sound.getVolume());

        // Prefer Hindi or Indian English voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.includes('hi') ||
            v.lang.includes('IN') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('hindi')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis notice:', err);
      }
    }
  }

  /**
   * Play Throw Item SFX
   */
  public playThrowSfx(sfxType: ThrowItem['sfx']): void {
    if (this.areTauntsMuted) return;
    sound.unlock();

    switch (sfxType) {
      case 'splat':
        sound.playSplat();
        break;
      case 'slap':
        sound.playSlap();
        break;
      case 'crack':
        sound.playEggCrack();
        break;
      case 'kiss':
        sound.playKiss();
        break;
      case 'squish':
        sound.playSquish();
        break;
      default:
        sound.playClick();
        break;
    }
  }
}

export const tauntService = new TauntService();

