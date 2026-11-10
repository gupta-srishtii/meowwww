/**
 * Lightweight, procedural Web Audio ambient controller for mountain breeze,
 * roadside kettle simmer, and Polaroid shutter click feedback.
 * Zero external audio assets required; respects user gesture unlock, pause, and mute state.
 */

export type AmbientAudioMode = 'road' | 'viewpoint' | 'dhaba' | 'neelkanth' | 'off';

interface AmbientState {
  muted: boolean;
  paused: boolean;
  mode: AmbientAudioMode;
}

class AmbientAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private simmerGain: GainNode | null = null;
  private initialized = false;
  private state: AmbientState = {
    muted: false,
    paused: false,
    mode: 'off',
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

      // Subtle warm kettle simmer + stove hum bus (Dhaba only)
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

      this.ctx = ctx;
      this.masterGain = master;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.simmerGain = simmerGain;
      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  unlock(): void {
    if (!this.ensureContext() || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.applyLevels()).catch(() => {});
    } else {
      this.applyLevels();
    }
  }

  syncState(next: AmbientState): void {
    const changed =
      next.muted !== this.state.muted ||
      next.paused !== this.state.paused ||
      next.mode !== this.state.mode;
    this.state = next;
    if (!changed && !this.initialized) return;
    this.applyLevels();
  }

  private applyLevels(): void {
    if (!this.ctx || !this.masterGain || !this.windGain || !this.windFilter || !this.simmerGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const silent = this.state.muted || this.state.paused || this.state.mode === 'off';

    if (silent) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    if (this.ctx.state === 'suspended') {
      return;
    }

    this.masterGain.gain.setTargetAtTime(0.65, now, 0.14);

    if (this.state.mode === 'road') {
      this.windFilter.frequency.setTargetAtTime(420, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.085, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'viewpoint') {
      this.windFilter.frequency.setTargetAtTime(320, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.068, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0, now, 0.15);
    } else if (this.state.mode === 'dhaba') {
      this.windFilter.frequency.setTargetAtTime(240, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.035, now, 0.2);
      this.simmerGain.gain.setTargetAtTime(0.045, now, 0.2);
    } else if (this.state.mode === 'neelkanth') {
      this.windFilter.frequency.setTargetAtTime(290, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.044, now, 0.2);
      // Soft peaceful courtyard crowd murmur warmth
      this.simmerGain.gain.setTargetAtTime(0.022, now, 0.2);
    }
  }

  /**
   * Warm resonant brass temple bell chime with gentle harmonic decay (strictly respects mute & pause).
   */
  playTempleBell(): void {
    if (this.state.muted || this.state.paused) return;
    if (!this.ensureContext() || !this.ctx || this.ctx.state !== 'running') return;

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
        gain.connect(ctx.destination);
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
        gain.connect(ctx.destination);
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
        gain.connect(ctx.destination);
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
      gain.connect(ctx.destination);
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
        gain.connect(ctx.destination);
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
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + dur + 0.06);
        });
      }
    } catch {
      // Ignore audio edge failures cleanly
    }
  }
}

export const ambientAudio = new AmbientAudioController();

