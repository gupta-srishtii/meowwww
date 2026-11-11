/**
 * Clean multi-channel Web Audio + optional local Bhai Dooj track controller:
 * - Channel 1: Environmental ambience (mountain breeze, roadside kettle simmer, courtyard calm)
 * - Channel 2: Procedural soothing musical motifs tailored per story chapter (no overlapping tracks)
 * - Channel 3: User-supplied local Bhai Dooj audio (`URL.createObjectURL`, e.g., "Bhai Ni Beni Ladki")
 *   with smooth tilak fade-in, celebration hold, letter underscore fade-down, and procedural fallback
 * - Channel 4: Independently scalable SFX bus (temple bells, diyas, shutter click, traffic, chants)
 */

export type AmbientAudioMode =
  | 'kitaabi'
  | 'travel'
  | 'road'
  | 'viewpoint'
  | 'dhaba'
  | 'neelkanth'
  | 'baalkuwari_stairs'
  | 'baalkuwari_temple'
  | 'hotel_evening'
  | 'bhai_dooj'
  | 'off';

export type FinaleMusicPhase =
  | 'inactive'
  | 'kitaabi_callback'
  | 'arrival'
  | 'applying_tilak'
  | 'sweet_offer'
  | 'eating_together'
  | 'creator_letter'
  | 'ending';

interface AmbientState {
  muted: boolean;
  paused: boolean;
  mode: AmbientAudioMode;
  musicVolume?: number;
  sfxVolume?: number;
}

interface MusicMotifSpec {
  notes: readonly number[];
  intervalMs: number;
  durationSec: number;
  peak: number;
  wave: OscillatorType;
  droneHz?: number;
}

const MUSIC_MOTIFS: Partial<Record<AmbientAudioMode, MusicMotifSpec>> = {
  kitaabi: {
    notes: [261.63, 329.63, 392.0, 493.88, 349.23, 440.0],
    intervalMs: 2100,
    durationSec: 2.6,
    peak: 0.022,
    wave: 'sine',
  },
  travel: {
    notes: [293.66, 440.0, 369.99, 493.88],
    intervalMs: 1850,
    durationSec: 2.2,
    peak: 0.02,
    wave: 'triangle',
  },
  road: {
    notes: [392.0, 493.88, 587.33, 440.0, 523.25],
    intervalMs: 1750,
    durationSec: 2.1,
    peak: 0.017,
    wave: 'sine',
  },
  viewpoint: {
    notes: [392.0, 587.33, 659.25, 493.88],
    intervalMs: 2150,
    durationSec: 2.5,
    peak: 0.019,
    wave: 'sine',
  },
  dhaba: {
    notes: [349.23, 440.0, 523.25, 392.0],
    intervalMs: 1950,
    durationSec: 2.3,
    peak: 0.019,
    wave: 'triangle',
  },
  neelkanth: {
    notes: [293.66, 440.0, 587.33, 493.88, 369.99],
    intervalMs: 2300,
    durationSec: 2.8,
    peak: 0.018,
    wave: 'sine',
    droneHz: 146.83,
  },
  baalkuwari_stairs: {
    notes: [329.63, 415.3, 493.88, 659.25],
    intervalMs: 1750,
    durationSec: 2.0,
    peak: 0.017,
    wave: 'triangle',
  },
  baalkuwari_temple: {
    notes: [440.0, 554.37, 659.25, 880.0],
    intervalMs: 2350,
    durationSec: 2.9,
    peak: 0.018,
    wave: 'sine',
    droneHz: 220.0,
  },
  hotel_evening: {
    notes: [220.0, 329.63, 415.3, 493.88],
    intervalMs: 2200,
    durationSec: 2.7,
    peak: 0.019,
    wave: 'sine',
  },
  bhai_dooj: {
    notes: [261.63, 392.0, 523.25, 659.25, 587.33, 440.0],
    intervalMs: 1850,
    durationSec: 2.5,
    peak: 0.023,
    wave: 'sine',
  },
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

class AmbientAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private simmerGain: GainNode | null = null;
  private initialized = false;
  private userUnlocked = false;

  private motifTimerId: number | null = null;
  private motifStepIndex = 0;
  private lastMotifTickAt = 0;

  private customAudioEl: HTMLAudioElement | null = null;
  private customTrackUrl: string | null = null;
  private customTrackFailed = false;
  private customTrackBlocked = false;
  private customPlayRequest: { url: string } | null = null;
  private finalePhase: FinaleMusicPhase = 'inactive';
  private customVolumeActual = 0;
  private customVolumeTarget = 0;
  private customRampTimerId: number | null = null;

  private state: Required<AmbientState> = {
    muted: false,
    paused: false,
    mode: 'off',
    musicVolume: 0.7,
    sfxVolume: 0.85,
  };

  private ensureContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.initialized && this.ctx) return true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const musicGain = ctx.createGain();
      musicGain.gain.value = 0.7;
      const musicLowpass = ctx.createBiquadFilter();
      musicLowpass.type = 'lowpass';
      musicLowpass.frequency.value = 1350;
      musicLowpass.Q.value = 0.55;
      musicLowpass.connect(musicGain);
      musicGain.connect(master);

      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.85;
      sfxGain.connect(ctx.destination);

      // Shared 2-second soft pink-ish noise buffer for mountain breeze + kettle texture.
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
      }

      // Wind breeze bus
      const windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 340;
      windFilter.Q.value = 0.7;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();

      // Subtle warm kettle simmer / bazaar murmur bus
      const simmerSource = ctx.createBufferSource();
      simmerSource.buffer = buffer;
      simmerSource.loop = true;
      const simmerFilter = ctx.createBiquadFilter();
      simmerFilter.type = 'bandpass';
      simmerFilter.frequency.value = 1150;
      simmerFilter.Q.value = 1.8;
      const simmerGain = ctx.createGain();
      simmerGain.gain.value = 0;
      simmerSource.connect(simmerFilter);
      simmerFilter.connect(simmerGain);
      simmerGain.connect(master);
      simmerSource.start();

      // Store filter reference neatly via musicLowpass on musicGain node tag
      (musicGain as unknown as { __inputNode?: AudioNode }).__inputNode = musicLowpass;

      this.ctx = ctx;
      this.masterGain = master;
      this.musicGain = musicGain;
      this.sfxGain = sfxGain;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.simmerGain = simmerGain;
      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  private isCustomTrackOverriding(): boolean {
    return (
      this.customTrackUrl !== null &&
      !this.customTrackFailed &&
      this.customAudioEl !== null && !this.customAudioEl.paused &&
      this.state.mode === 'bhai_dooj' &&
      (this.finalePhase === 'applying_tilak' ||
        this.finalePhase === 'sweet_offer' ||
        this.finalePhase === 'eating_together' ||
        this.finalePhase === 'creator_letter' ||
        this.finalePhase === 'ending')
    );
  }

  private getCustomTrackDesiredVolume(): number {
    if (this.state.muted || this.state.paused || this.state.mode !== 'bhai_dooj') {
      return 0;
    }
    if (this.customTrackUrl === null || this.customTrackFailed) {
      return 0;
    }
    const vol = clamp01(this.state.musicVolume);
    switch (this.finalePhase) {
      case 'applying_tilak':
        return vol * 0.86;
      case 'sweet_offer':
      case 'eating_together':
        return vol * 0.78;
      case 'creator_letter':
        return vol * 0.28;
      case 'ending':
        return vol * 0.34;
      default:
        return 0;
    }
  }

  private updateCustomTrackElement(): void {
    if (typeof window === 'undefined') return;

    this.customVolumeTarget = this.getCustomTrackDesiredVolume();

    if (!this.customTrackUrl) {
      if (this.customAudioEl) {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      }
      this.customVolumeActual = 0;
      this.customPlayRequest = null;
      if (this.customRampTimerId !== null) window.clearInterval(this.customRampTimerId);
      this.customRampTimerId = null;
      return;
    }

    if (!this.customAudioEl) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.addEventListener('error', () => {
        this.failCustomTrack(false);
      });
      this.customAudioEl = audio;
    }

    if (this.customAudioEl.src !== this.customTrackUrl) {
      this.customTrackFailed = false;
      this.customTrackBlocked = false;
      this.customPlayRequest = null;
      this.customAudioEl.src = this.customTrackUrl;
      this.customAudioEl.currentTime = 0;
      this.customVolumeActual = 0;
      this.customAudioEl.volume = 0;
    }

    if (this.customVolumeTarget > 0.005 && this.userUnlocked && !this.customTrackFailed) {
      if (this.customAudioEl.paused && !this.customPlayRequest) {
        const request = { url: this.customTrackUrl };
        this.customPlayRequest = request;
        void this.customAudioEl.play().then(() => {
          if (this.customPlayRequest !== request) return;
          this.customPlayRequest = null;
          this.applyLevels();
        }).catch((error: unknown) => {
          if (this.customPlayRequest !== request) return;
          this.customPlayRequest = null;
          if (this.customTrackUrl !== request.url) return;
          const name = typeof error === 'object' && error !== null && 'name' in error
            ? error.name : '';
          if (name === 'AbortError' && this.getCustomTrackDesiredVolume() === 0) return;
          this.failCustomTrack(name === 'NotAllowedError');
        });
      }
    }

    if (this.customRampTimerId === null) {
      this.customRampTimerId = window.setInterval(() => {
        if (!this.customAudioEl) {
          if (this.customRampTimerId !== null) {
            window.clearInterval(this.customRampTimerId);
            this.customRampTimerId = null;
          }
          return;
        }
        const diff = this.customVolumeTarget - this.customVolumeActual;
        if (Math.abs(diff) <= 0.015) {
          this.customVolumeActual = this.customVolumeTarget;
        } else {
          this.customVolumeActual += diff * 0.14;
        }
        this.customAudioEl.volume = Math.max(0, Math.min(1, this.customVolumeActual));

        if (this.customVolumeTarget === 0 && this.customVolumeActual <= 0.01) {
          this.customAudioEl.pause();
          this.customVolumeActual = 0;
          if (this.customRampTimerId !== null) {
            window.clearInterval(this.customRampTimerId);
            this.customRampTimerId = null;
          }
        } else if (Math.abs(this.customVolumeTarget - this.customVolumeActual) <= 0.005) {
          if (this.customRampTimerId !== null) {
            window.clearInterval(this.customRampTimerId);
            this.customRampTimerId = null;
          }
        }
      }, 45);
    }
  }

  private failCustomTrack(blocked: boolean): void {
    this.customTrackFailed = true;
    this.customTrackBlocked = blocked;
    this.customPlayRequest = null;
    this.customVolumeTarget = 0;
    this.customVolumeActual = 0;
    if (this.customAudioEl) {
      this.customAudioEl.volume = 0;
      this.customAudioEl.pause();
    }
    this.applyLevels();
  }

  private scheduleNextMotifNote(): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    if (this.state.muted || this.state.paused || this.state.mode === 'off') return;
    if (this.isCustomTrackOverriding()) return;

    const spec = MUSIC_MOTIFS[this.state.mode];
    if (!spec) return;

    const nowMs = performance.now();
    if (nowMs - this.lastMotifTickAt < spec.intervalMs) return;
    this.lastMotifTickAt = nowMs;

    const inputNode =
      (this.musicGain as unknown as { __inputNode?: AudioNode }).__inputNode ?? this.musicGain;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const freq = spec.notes[this.motifStepIndex % spec.notes.length];
      this.motifStepIndex += 1;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.wave;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(spec.peak, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.durationSec);

      osc.connect(gain);
      gain.connect(inputNode);
      osc.start(now);
      osc.stop(now + spec.durationSec + 0.08);

      // Optional warm soft tanpura/fifth undertone every 2 notes for spiritual / summit serene spaces
      if (spec.droneHz && this.motifStepIndex % 2 === 1) {
        const drone = ctx.createOscillator();
        const droneGain = ctx.createGain();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(spec.droneHz, now);
        droneGain.gain.setValueAtTime(0.0001, now);
        droneGain.gain.exponentialRampToValueAtTime(spec.peak * 0.55, now + 0.55);
        droneGain.gain.exponentialRampToValueAtTime(0.0001, now + spec.durationSec + 0.6);
        drone.connect(droneGain);
        droneGain.connect(inputNode);
        drone.start(now);
        drone.stop(now + spec.durationSec + 0.65);
      }
    } catch {
      // Ignore oscillator cleanup issues cleanly
    }
  }

  private ensureMotifLoop(shouldRun: boolean): void {
    if (typeof window === 'undefined') return;
    if (!shouldRun) {
      if (this.motifTimerId !== null) {
        window.clearInterval(this.motifTimerId);
        this.motifTimerId = null;
      }
      return;
    }
    if (this.motifTimerId === null) {
      this.motifTimerId = window.setInterval(() => {
        this.scheduleNextMotifNote();
      }, 320);
    }
  }

  unlock(): void {
    this.userUnlocked = true;
    // A later permitted gesture may recover an autoplay rejection; media errors stay failed.
    if (this.customTrackBlocked) {
      this.customTrackBlocked = false;
      this.customTrackFailed = false;
    }
    if (!this.ensureContext() || !this.ctx) {
      this.updateCustomTrackElement();
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx
        .resume()
        .then(() => {
          this.applyLevels();
          this.updateCustomTrackElement();
        })
        .catch(() => {});
    } else {
      this.applyLevels();
      this.updateCustomTrackElement();
    }
  }

  setFinaleTrackUrl(url: string | null): void {
    if (this.customTrackUrl === url) return;
    this.customTrackUrl = url;
    this.customTrackFailed = false;
    this.customTrackBlocked = false;
    this.customPlayRequest = null;
    this.updateCustomTrackElement();
    this.applyLevels();
  }

  syncFinaleMusicPhase(phase: FinaleMusicPhase): void {
    if (this.finalePhase === phase) return;
    this.finalePhase = phase;
    this.updateCustomTrackElement();
    this.applyLevels();
  }

  syncState(next: AmbientState): void {
    const normalized: Required<AmbientState> = {
      muted: next.muted,
      paused: next.paused,
      mode: next.mode,
      musicVolume: clamp01(next.musicVolume ?? this.state.musicVolume),
      sfxVolume: clamp01(next.sfxVolume ?? this.state.sfxVolume),
    };
    const modeChanged = normalized.mode !== this.state.mode;
    const changed =
      normalized.muted !== this.state.muted ||
      normalized.paused !== this.state.paused ||
      modeChanged ||
      normalized.musicVolume !== this.state.musicVolume ||
      normalized.sfxVolume !== this.state.sfxVolume;

    this.state = normalized;
    if (modeChanged) {
      this.motifStepIndex = 0;
      this.lastMotifTickAt = 0;
    }
    if (!changed && !this.initialized) return;
    this.applyLevels();
    this.updateCustomTrackElement();
  }

  private getSfxOutput(): AudioNode | null {
    if (!this.ctx) return null;
    return this.sfxGain ?? this.ctx.destination;
  }

  private applyLevels(): void {
    if (
      !this.ctx ||
      !this.masterGain ||
      !this.musicGain ||
      !this.sfxGain ||
      !this.windGain ||
      !this.windFilter ||
      !this.simmerGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const silent = this.state.muted || this.state.paused || this.state.mode === 'off';
    const musicVol = clamp01(this.state.musicVolume);
    const sfxVol = clamp01(this.state.sfxVolume);

    this.sfxGain.gain.setTargetAtTime(
      this.state.muted || this.state.paused ? 0 : sfxVol,
      now,
      0.04
    );

    if (silent) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      this.ensureMotifLoop(false);
      return;
    }

    if (this.ctx.state === 'suspended') {
      return;
    }

    this.masterGain.gain.setTargetAtTime(0.75, now, 0.16);
    const overrideActive = this.isCustomTrackOverriding();
    this.musicGain.gain.setTargetAtTime(overrideActive ? 0 : musicVol, now, 0.25);
    this.ensureMotifLoop(!overrideActive && musicVol > 0.01);

    const ambientScale = musicVol === 0 ? 0 : 0.45 + 0.55 * musicVol;

    if (this.state.mode === 'kitaabi') {
      this.windFilter.frequency.setTargetAtTime(190, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.01 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'travel') {
      this.windFilter.frequency.setTargetAtTime(340, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.045 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'road') {
      this.windFilter.frequency.setTargetAtTime(420, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.075 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'viewpoint') {
      this.windFilter.frequency.setTargetAtTime(320, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.058 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'dhaba') {
      this.windFilter.frequency.setTargetAtTime(240, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.028 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0.036 * ambientScale, now, 0.2);
    } else if (this.state.mode === 'neelkanth') {
      this.windFilter.frequency.setTargetAtTime(290, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.036 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0.018 * ambientScale, now, 0.2);
    } else if (this.state.mode === 'baalkuwari_stairs') {
      this.windFilter.frequency.setTargetAtTime(360, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.048 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'baalkuwari_temple') {
      this.windFilter.frequency.setTargetAtTime(300, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.042 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0.01 * ambientScale, now, 0.2);
    } else if (this.state.mode === 'hotel_evening') {
      this.windFilter.frequency.setTargetAtTime(220, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.024 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0.01 * ambientScale, now, 0.2);
    } else if (this.state.mode === 'bhai_dooj') {
      this.windFilter.frequency.setTargetAtTime(175, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.006 * ambientScale, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.2);
    }
  }

  /**
   * Warm resonant brass temple bell chime with gentle harmonic decay (strictly respects mute & pause).
   */
  playTempleBell(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const partials: Array<[number, number, number]> = [
        [392, 0.12, 2.4],
        [786, 0.065, 1.85],
        [1184, 0.038, 1.35],
        [1592, 0.02, 0.9],
      ];

      for (const [freq, peak, duration] of partials) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + duration + 0.05);
      }
    } catch {
      // Ignore audio errors cleanly
    }
  }

  /**
   * Gentle soft golden shimmer chime when lighting a diya oil lamp.
   */
  playDiyaChime(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const notes = [587.33, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.055, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.75);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.8);
      });
    } catch {
      // Ignore audio errors cleanly
    }
  }

  /**
   * Subtle double-click camera shutter effect when snapping a Polaroid memory.
   */
  playShutterClick(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const triggerClick = (offset: number, freq: number, gainPeak: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(280, now + offset + 0.025);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(gainPeak, now + offset + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.032);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now + offset);
        osc.stop(now + offset + 0.04);
      };

      triggerClick(0, 1480, 0.08);
      triggerClick(0.048, 1120, 0.06);
    } catch {
      // Ignore audio edge failures cleanly
    }
  }

  /**
   * Subtle passing vehicle doppler breeze whoosh for mountain road traffic.
   */
  playTrafficPassWhoosh(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(78, now + 0.22);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignore audio edge failures cleanly
    }
  }

  /**
   * Light forgiving warning beep when brushing too close to mountain road traffic.
   */
  playTrafficHornWarn(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now + offset);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.035, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch {
      // Ignore audio edge failures cleanly
    }
  }

  /**
   * Original procedural devotional 'Har Har Mahadev!' chant motif:
   * combines warm conch/shankh resonance, 5-syllable devotional cadence choir hum,
   * and a soft temple bell (zero copyrighted samples; strictly honors mute/pause).
   */
  playHarHarMahadevChant(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      this.playTempleBell();

      const syllables: Array<[number, number, number]> = [
        [0.18, 220.0, 0.24],
        [0.48, 246.94, 0.24],
        [0.8, 261.63, 0.22],
        [1.06, 293.66, 0.25],
        [1.36, 261.63, 0.72],
      ];

      for (const [offset, baseFreq, dur] of syllables) {
        [1, 0.5, 1.5].forEach((mult, vIdx) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = vIdx === 1 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(baseFreq * mult, now + offset);

          filter.type = 'lowpass';
          filter.frequency.value = 720;
          filter.Q.value = 1.6;

          const peak = vIdx === 0 ? 0.042 : 0.022;
          gain.gain.setValueAtTime(0.0001, now + offset);
          gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(out);
          osc.start(now + offset);
          osc.stop(now + offset + dur + 0.06);
        });
      }
    } catch {
      // Ignore audio edge failures cleanly
    }
  }

  /**
   * Warm gentle three-note pentatonic chime for Bhai Dooj Tilak ceremony.
   */
  playTilakBlessingTone(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.055, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.15);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 1.2);
      });
    } catch {
      // Ignore audio edge failures cleanly
    }
  }

  /**
   * Soft warm chord motif when entering the cozy Bhai Dooj room & memory gallery.
   */
  playBhaiDoojChime(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;
    const out = this.getSfxOutput();
    if (!out) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.038, now + idx * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 1.4);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 1.45);
      });
    } catch {
      // Ignore audio edge failures cleanly
    }
  }
}

export const ambientAudio = new AmbientAudioController();

