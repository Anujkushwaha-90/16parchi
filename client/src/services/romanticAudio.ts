/**
 * Romantic Audio Synthesizer (Web Audio API)
 * Generates celestial, warm romantic chords and chimes without external audio assets.
 * Respects browser autoplay policies and stays muted by default.
 */

class RomanticAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private isPlayingAmbience: boolean = false;
  private ambientInterval: any = null;
  private haareyaAudio: HTMLAudioElement | null = null;
  private isHaareyaPlaying: boolean = false;
  private isSongMuted: boolean = false;

  constructor() {
    // Sound is strictly muted by default for general synthesizer
    const saved = localStorage.getItem('eternal_love_muted');
    this.isMuted = saved !== null ? saved === 'true' : true;
  }

  /**
   * Play Haareya romantic song softly for VIP Sovereign profile
   */
  public playHaareya() {
    if (this.isSongMuted) return;
    try {
      if (!this.haareyaAudio) {
        this.haareyaAudio = new Audio('/audio/haareya.mp3');
        this.haareyaAudio.loop = true;
        this.haareyaAudio.preload = 'auto';
      }
      this.haareyaAudio.volume = 0.45;
      this.haareyaAudio.currentTime = 0;
      const playPromise = this.haareyaAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isHaareyaPlaying = true;
          })
          .catch(() => {
            // Autoplay restriction fallback; wait for next user touch/click
            this.isHaareyaPlaying = false;
          });
      }
    } catch {
      // Audio playback silent fallback
    }
  }

  /**
   * Stop Haareya romantic song immediately when profile is closed
   */
  public stopHaareya() {
    if (this.haareyaAudio) {
      try {
        this.haareyaAudio.pause();
        this.haareyaAudio.currentTime = 0;
      } catch {}
    }
    this.isHaareyaPlaying = false;
  }

  /**
   * Toggle Haareya song play/pause
   */
  public toggleHaareya(): boolean {
    if (this.isHaareyaPlaying) {
      if (this.haareyaAudio) {
        this.haareyaAudio.pause();
      }
      this.isHaareyaPlaying = false;
      this.isSongMuted = true;
      return false;
    } else {
      this.isSongMuted = false;
      this.playHaareya();
      return true;
    }
  }

  public getHaareyaPlaying(): boolean {
    return this.isHaareyaPlaying;
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('eternal_love_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.initContext();
      this.playLoveChime();
      this.startAmbientArpeggio();
    } else {
      this.stopAmbientArpeggio();
    }
    return this.isMuted;
  }

  /**
   * Play celestial chord note
   */
  public playTone(freq: number, duration: number = 1.2, type: OscillatorType = 'sine', gainVal: number = 0.08) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio fallback silent
    }
  }

  /**
   * Magical Heart explosion chime
   */
  public playLoveChime() {
    if (this.isMuted) return;
    // Romantic ascending harp notes (Db5, F5, Ab5, C6, Eb6)
    const notes = [554.37, 659.25, 830.61, 1046.5, 1244.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.8, 'sine', 0.06);
      }, idx * 70);
    });
  }

  /**
   * Deep romantic heartbeat pulse sound
   */
  public playHeartbeat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(75, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);

      // Second pulse (lub-dub)
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(65, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + 0.15);

        gain2.gain.setValueAtTime(0, this.ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc2.start();
        osc2.stop(this.ctx.currentTime + 0.22);
      }, 140);
    } catch {}
  }

  /**
   * Ambient celestial chord loop
   */
  public startAmbientArpeggio() {
    if (this.isPlayingAmbience || this.isMuted) return;
    this.isPlayingAmbience = true;

    // Chord progressions in F# Major / Db Major (romantic ambient)
    const chords = [
      [369.99, 440.0, 554.37, 659.25], // F#m7
      [293.66, 369.99, 440.0, 587.33], // Dmaj7
      [329.63, 415.3, 493.88, 659.25], // Emaj7
      [277.18, 349.23, 415.3, 554.37], // C#m7
    ];

    let chordIdx = 0;
    this.ambientInterval = setInterval(() => {
      if (this.isMuted) {
        this.stopAmbientArpeggio();
        return;
      }
      const chord = chords[chordIdx % chords.length];
      chord.forEach((freq, noteIdx) => {
        setTimeout(() => {
          this.playTone(freq, 2.2, 'sine', 0.035);
        }, noteIdx * 180);
      });
      chordIdx++;
    }, 4500);
  }

  public stopAmbientArpeggio() {
    this.isPlayingAmbience = false;
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  public dispose() {
    this.stopAmbientArpeggio();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const romanticAudio = new RomanticAudioService();

