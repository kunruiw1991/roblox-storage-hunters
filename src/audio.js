/**
 * Pure WebAudio SFX & Chill Lo-Fi / Funk-Town Synth Loop for Roblox Storage Hunters.
 * - Pure procedural WebAudio synth only (no TTS or spoken narration clips).
 * - Clean musicOn / sfxOn toggles; music fades/silences cleanly when turned off.
 */

const STEP_DURATION = 0.28; // ~107 BPM eighth notes (32 steps = 4 bars)

// Sunny lo-fi funk-town 4-bar chord progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
const CHORD_VOICINGS = [
  [349.23, 440.0, 523.25, 659.25], // Fmaj7
  [329.63, 392.0, 493.88, 587.33], // Em7
  [293.66, 349.23, 440.0, 523.25], // Dm7
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
];

// Bouncy funk bassline (Hz per 8th-note step; 0 = rest)
const BASS_PATTERN = [
  174.61, 0, 0, 174.61, 0, 220.0, 261.63, 0,
  164.81, 0, 0, 164.81, 0, 196.0, 246.94, 0,
  146.83, 0, 0, 146.83, 0, 174.61, 220.0, 0,
  130.81, 0, 164.81, 0, 196.0, 0, 164.81, 146.83,
];

// Gentle plucked Rhodes melody motif (sparse, non-fatiguing)
const MELODY_PATTERN = [
  0, 0, 659.25, 0, 587.33, 523.25, 0, 0,
  0, 0, 587.33, 0, 493.88, 0, 0, 0,
  0, 0, 523.25, 0, 440.0, 523.25, 0, 587.33,
  659.25, 0, 0, 523.25, 0, 0, 0, 0,
];

export class RobloxAudioManager {
  constructor() {
    this.musicOn = true;
    this.sfxOn = true;
    this._ctx = null;
    this._masterGain = null;
    this._sfxGain = null;
    this._musicGain = null;
    this._musicFilter = null;
    this._noiseBuffer = null;
    this._unlocked = false;
    this._musicAccum = 0;
    this._musicStep = 0;
    this._lastExternalStepMs = 0;
    this._fallbackTimer = null;
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);

      const sfx = ctx.createGain();
      sfx.gain.value = this.sfxOn ? 0.8 : 0.0;
      sfx.connect(master);

      const musicFilter = ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.value = 1850;
      musicFilter.Q.value = 0.7;

      const music = ctx.createGain();
      music.gain.value = this.musicOn ? 0.12 : 0.0;
      music.connect(musicFilter);
      musicFilter.connect(master);

      this._ctx = ctx;
      this._masterGain = master;
      this._sfxGain = sfx;
      this._musicGain = music;
      this._musicFilter = musicFilter;
      return ctx;
    } catch {
      return null;
    }
  }

  _getNoiseBuffer() {
    if (!this._ctx) return null;
    if (this._noiseBuffer) return this._noiseBuffer;
    const sampleRate = this._ctx.sampleRate || 44100;
    const len = Math.floor(sampleRate * 0.6);
    const buf = this._ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    let seed = 0x51a7beef;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 2147483648) - 1;
    }
    this._noiseBuffer = buf;
    return buf;
  }

  unlock() {
    const ctx = this._ensureContext();
    if (!ctx) return false;
    this._unlocked = true;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this._fallbackTimer && typeof setInterval === 'function') {
      this._fallbackTimer = setInterval(() => {
        if (!this.musicOn || !this._ctx || this._ctx.state !== 'running') return;
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (nowMs - this._lastExternalStepMs > 320) {
          this._advanceMusic(0.1);
        }
      }, 100);
    }
    return true;
  }

  setMusicOn(v) {
    this.musicOn = Boolean(v);
    if (this._ctx && this._musicGain) {
      const now = this._ctx.currentTime;
      this._musicGain.gain.cancelScheduledValues(now);
      this._musicGain.gain.setTargetAtTime(this.musicOn ? 0.12 : 0.0, now, 0.025);
    }
    if (!this.musicOn) {
      this._musicAccum = 0;
    }
  }

  setSfxOn(v) {
    this.sfxOn = Boolean(v);
    if (this._ctx && this._sfxGain) {
      const now = this._ctx.currentTime;
      this._sfxGain.gain.cancelScheduledValues(now);
      this._sfxGain.gain.setTargetAtTime(this.sfxOn ? 0.8 : 0.0, now, 0.015);
    }
  }

  getState() {
    return {
      musicOn: this.musicOn,
      sfxOn: this.sfxOn,
      unlocked: this._unlocked,
    };
  }

  stepMusic(dt = 0.016) {
    this._lastExternalStepMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._advanceMusic(dt);
  }

  _advanceMusic(dt) {
    if (!this.musicOn || !this._unlocked || !this._ctx) return;
    if (this._ctx.state !== 'running') return;
    const clamped = Math.min(Math.max(dt || 0, 0), 0.12);
    this._musicAccum += clamped;
    while (this._musicAccum >= STEP_DURATION) {
      this._musicAccum -= STEP_DURATION;
      this._triggerMusicStep(this._musicStep);
      this._musicStep = (this._musicStep + 1) % 32;
    }
  }

  _triggerMusicStep(step) {
    const ctx = this._ctx;
    if (!ctx || !this._musicGain || !this.musicOn) return;
    const now = ctx.currentTime + 0.01;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;

    // Warm electric-piano Rhodes chord on beat 0 and gentle syncopated stab on beat 5
    if (beatInBar === 0 || beatInBar === 5) {
      const chord = CHORD_VOICINGS[bar];
      const dur = beatInBar === 0 ? 1.15 : 0.48;
      const vol = beatInBar === 0 ? 0.18 : 0.11;
      for (const freq of chord) {
        this._musicTone(freq, 'triangle', now, dur, vol, 0.018);
      }
    }

    // Bouncy muted funk bass
    const bassFreq = BASS_PATTERN[step];
    if (bassFreq > 0) {
      this._musicTone(bassFreq, 'sine', now, 0.22, 0.34, 0.008);
      this._musicTone(bassFreq * 2, 'triangle', now, 0.14, 0.07, 0.006);
    }

    // Sparse chill melody pluck
    const melFreq = MELODY_PATTERN[step];
    if (melFreq > 0) {
      this._musicTone(melFreq, 'sine', now, 0.36, 0.17, 0.01);
    }

    // Soft lo-fi muted kick on steps 0 & 4 of each bar
    if (beatInBar === 0 || beatInBar === 4) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(g);
      g.connect(this._musicGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    // Subtle off-beat lo-fi brush hat on odd steps
    if (beatInBar % 2 === 1) {
      const buf = this._getNoiseBuffer();
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        src.connect(hp);
        hp.connect(g);
        g.connect(this._musicGain);
        src.start(now);
        src.stop(now + 0.055);
      }
    }
  }

  _musicTone(freq, type, startTime, dur, peak, attack = 0.01) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(g);
    g.connect(this._musicGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  // --- SFX Helpers ---
  _canSfx() {
    if (!this.sfxOn) return false;
    const ctx = this._ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return true;
  }

  _sfxTone({
    freq = 440,
    endFreq = null,
    type = 'triangle',
    delay = 0,
    dur = 0.12,
    gain = 0.25,
    attack = 0.005,
  }) {
    if (!this._ctx || !this._sfxGain) return;
    const now = this._ctx.currentTime + delay;
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  _sfxNoise({ delay = 0, dur = 0.08, gain = 0.2, filterType = 'bandpass', freq = 1200, q = 1.5 }) {
    if (!this._ctx || !this._sfxGain) return;
    const buf = this._getNoiseBuffer();
    if (!buf) return;
    const now = this._ctx.currentTime + delay;
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const flt = this._ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(freq, now);
    flt.Q.value = q;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this._sfxGain);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // --- 13 Crisp Roblox WebAudio Sound Effects ---

  playClick() {
    if (!this._canSfx()) return;
    this._sfxTone({ freq: 720, endFreq: 480, type: 'triangle', dur: 0.045, gain: 0.22, attack: 0.002 });
    this._sfxNoise({ dur: 0.02, gain: 0.08, filterType: 'highpass', freq: 2400, q: 1.0 });
  }

  playJump() {
    if (!this._canSfx()) return;
    this._sfxTone({ freq: 210, endFreq: 540, type: 'sine', dur: 0.14, gain: 0.24, attack: 0.006 });
    this._sfxTone({ freq: 320, endFreq: 680, type: 'triangle', dur: 0.11, gain: 0.10, attack: 0.008 });
  }

  playDiscover() {
    if (!this._canSfx()) return;
    const notes = [523.25, 659.25, 783.99, 1174.66]; // C5 E5 G5 D6 sparkle
    notes.forEach((f, idx) => {
      this._sfxTone({ freq: f, type: 'triangle', delay: idx * 0.065, dur: 0.26, gain: 0.22, attack: 0.006 });
      this._sfxTone({ freq: f * 2, type: 'sine', delay: idx * 0.065, dur: 0.20, gain: 0.07, attack: 0.008 });
    });
  }

  playBid() {
    if (!this._canSfx()) return;
    // Crisp auction paddle pop + upbeat fifth
    this._sfxTone({ freq: 587.33, type: 'triangle', delay: 0, dur: 0.09, gain: 0.24, attack: 0.003 });
    this._sfxTone({ freq: 880.0, type: 'sine', delay: 0.055, dur: 0.14, gain: 0.26, attack: 0.004 });
  }

  playRivalBid() {
    if (!this._canSfx()) return;
    // Distinct woody rival bid knock
    this._sfxTone({ freq: 330, endFreq: 260, type: 'triangle', delay: 0, dur: 0.08, gain: 0.20, attack: 0.003 });
    this._sfxTone({ freq: 392, type: 'sine', delay: 0.05, dur: 0.09, gain: 0.16, attack: 0.004 });
  }

  playGavelWon() {
    if (!this._canSfx()) return;
    // Double wooden gavel strike
    for (const d of [0, 0.15]) {
      this._sfxTone({ freq: 190, endFreq: 75, type: 'triangle', delay: d, dur: 0.08, gain: 0.36, attack: 0.002 });
      this._sfxNoise({ delay: d, dur: 0.05, gain: 0.26, filterType: 'bandpass', freq: 950, q: 2.2 });
    }
    // Celebratory sold fanfare triad
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, i) => {
      this._sfxTone({ freq: f, type: 'triangle', delay: 0.30 + i * 0.07, dur: 0.32, gain: 0.24, attack: 0.008 });
    });
  }

  playShutter() {
    if (!this._canSfx()) return;
    // Corrugated metal roller-door rattle ascending smoothly
    for (let i = 0; i < 8; i++) {
      const d = i * 0.062;
      this._sfxNoise({
        delay: d,
        dur: 0.055,
        gain: 0.16 - i * 0.01,
        filterType: 'bandpass',
        freq: 620 + i * 110,
        q: 2.8,
      });
      this._sfxTone({
        freq: 140 + i * 18,
        endFreq: 110 + i * 14,
        type: 'sawtooth',
        delay: d,
        dur: 0.04,
        gain: 0.06,
        attack: 0.003,
      });
    }
  }

  playLoadCar() {
    if (!this._canSfx()) return;
    // Trunk thump + positive slot confirmation
    this._sfxTone({ freq: 150, endFreq: 68, type: 'sine', delay: 0, dur: 0.11, gain: 0.32, attack: 0.003 });
    this._sfxNoise({ delay: 0, dur: 0.045, gain: 0.15, filterType: 'lowpass', freq: 520, q: 1.0 });
    this._sfxTone({ freq: 440, endFreq: 587.33, type: 'triangle', delay: 0.06, dur: 0.11, gain: 0.18, attack: 0.004 });
  }

  playChaChing() {
    if (!this._canSfx()) return;
    // Crisp mechanical drawer click + bright cash register bell harmonics
    this._sfxNoise({ delay: 0, dur: 0.04, gain: 0.18, filterType: 'bandpass', freq: 1800, q: 2.0 });
    this._sfxTone({ freq: 1567.98, type: 'sine', delay: 0.04, dur: 0.36, gain: 0.24, attack: 0.002 });
    this._sfxTone({ freq: 2093.0, type: 'sine', delay: 0.095, dur: 0.42, gain: 0.26, attack: 0.002 });
    this._sfxTone({ freq: 3135.96, type: 'triangle', delay: 0.10, dur: 0.28, gain: 0.11, attack: 0.003 });
  }

  playPlaceBuild() {
    if (!this._canSfx()) return;
    // Roblox brick/furniture snap thump
    this._sfxTone({ freq: 195, endFreq: 95, type: 'triangle', delay: 0, dur: 0.08, gain: 0.30, attack: 0.002 });
    this._sfxTone({ freq: 620, endFreq: 860, type: 'sine', delay: 0.02, dur: 0.065, gain: 0.18, attack: 0.002 });
  }

  playError() {
    if (!this._canSfx()) return;
    // Soft clear double low buzz
    this._sfxTone({ freq: 225, endFreq: 195, type: 'sawtooth', delay: 0, dur: 0.09, gain: 0.13, attack: 0.004 });
    this._sfxTone({ freq: 185, endFreq: 150, type: 'sawtooth', delay: 0.10, dur: 0.12, gain: 0.13, attack: 0.004 });
  }

  playBell() {
    if (!this._canSfx()) return;
    // Warm Pawn Shop door chime (two-tone brass storefront ding-dong!)
    this._sfxTone({ freq: 1318.51, type: 'sine', delay: 0, dur: 0.45, gain: 0.22, attack: 0.003 });
    this._sfxTone({ freq: 2637.02, type: 'sine', delay: 0, dur: 0.25, gain: 0.07, attack: 0.003 });
    this._sfxTone({ freq: 1046.5, type: 'sine', delay: 0.17, dur: 0.55, gain: 0.24, attack: 0.003 });
    this._sfxTone({ freq: 2093.0, type: 'sine', delay: 0.17, dur: 0.30, gain: 0.07, attack: 0.003 });
  }

  playUpgrade() {
    if (!this._canSfx()) return;
    const arp = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    arp.forEach((f, idx) => {
      this._sfxTone({ freq: f, type: 'triangle', delay: idx * 0.055, dur: 0.24, gain: 0.21, attack: 0.005 });
    });
  }

  dispose() {
    if (this._fallbackTimer) {
      clearInterval(this._fallbackTimer);
      this._fallbackTimer = null;
    }
    if (this._ctx && typeof this._ctx.close === 'function') {
      this._ctx.close().catch(() => {});
    }
    this._ctx = null;
    this._unlocked = false;
  }
}
