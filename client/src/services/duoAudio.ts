/**
 * Dynamic Duo Romantic Audio Service
 * Plays Ed Sheeran - Perfect softly when viewing Ayush or Palak's profiles
 */
class DuoAudioService {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;

  public playDuoSong() {
    if (this.isMuted) return;
    try {
      if (!this.audio) {
        this.audio = new Audio('/audio/duo_perfect.mp3');
        this.audio.loop = true;
        this.audio.preload = 'auto';
      }
      if (!this.audio.paused) {
        return;
      }
      this.audio.volume = 0.42;
      this.audio.currentTime = 0;
      const promise = this.audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            this.isPlaying = true;
          })
          .catch(() => {
            this.isPlaying = false;
          });
      }
    } catch {
      // Audio playback silent fallback
    }
  }

  public stopDuoSong() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {}
    }
    this.isPlaying = false;
  }

  public toggleDuoSong(): boolean {
    if (this.isPlaying) {
      if (this.audio) {
        this.audio.pause();
      }
      this.isPlaying = false;
      this.isMuted = true;
      return false;
    } else {
      this.isMuted = false;
      this.playDuoSong();
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const duoAudio = new DuoAudioService();

