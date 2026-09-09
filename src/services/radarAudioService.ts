import { Platform } from 'react-native';

class RadarAudioService {
  private audioCtx: any = null;
  private isMuted: boolean = false;
  private lastAlertTime: number = 0;
  private lastOverspeedTime: number = 0;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch (e) {
        // AudioContext not supported
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Plays a radar camera proximity alert chime.
   * Modulates pitch and repetition based on distance.
   */
  public playProximityChime(distanceMeters: number) {
    if (this.isMuted) return;
    const now = Date.now();
    // Throttle sound according to distance: closer = more frequent
    const interval = distanceMeters < 200 ? 1200 : 2500;
    if (now - this.lastAlertTime < interval) return;
    this.lastAlertTime = now;

    if (Platform.OS === 'web' && this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // High crystal sonar ping: 880Hz to 1320Hz
        const freq = distanceMeters < 200 ? 1320 : 880;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      } catch (e) {
        // Ignore audio playback errors
      }
    }
  }

  /**
   * Plays an urgent warning alarm when exceeding the speed limit.
   */
  public playOverspeedAlarm() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastOverspeedTime < 3000) return; // Repeat every 3s
    this.lastOverspeedTime = now;

    if (Platform.OS === 'web' && this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        // Dual urgent tone
        const playTone = (freq: number, delay: number) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + delay);

          gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioCtx.currentTime + delay + 0.15
          );

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(this.audioCtx.currentTime + delay);
          osc.stop(this.audioCtx.currentTime + delay + 0.15);
        };

        playTone(600, 0);
        playTone(900, 0.18);
      } catch (e) {
        // Ignore audio playback errors
      }
    }
  }
}

export const radarAudio = new RadarAudioService();
