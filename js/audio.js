/**
 * Pure Web Audio API retro-futuristic SFX & subtle synthwave bassline pulse engine.
 * Zero external audio files required.
 */
export class SynthAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.muted = false;

    // Synthwave pulse state
    this.pulseActive = false;
    this.pulseTimer = null;
    this.nextStepTime = 0;
    this.stepIndex = 0;
    this.currentSpeedNorm = 0;

    // Classic synthwave bassline progression in A minor (Hz): A1, F1, G1, E1
    this.bassPattern = [
      55.0, 55.0, 55.0, 55.0, 55.0, 55.0, 55.0, 65.41,
      43.65, 43.65, 43.65, 43.65, 43.65, 43.65, 43.65, 49.0,
      49.0, 49.0, 49.0, 49.0, 49.0, 49.0, 49.0, 55.0,
      41.2, 41.2, 41.2, 41.2, 41.2, 41.2, 49.0, 41.2,
    ];

    // Pentatonic synth chime notes for orb streak combo
    this.orbScale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);
      this._createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _createNoiseBuffer() {
    const length = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setSpeedFactor(norm) {
    this.currentSpeedNorm = Math.max(0, Math.min(1, norm));
  }

  startPulse() {
    this.unlock();
    if (!this.ctx || this.pulseActive) return;
    this.pulseActive = true;
    this.stepIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    this.pulseTimer = window.setInterval(() => {
      if (!this.pulseActive || !this.ctx || this.ctx.state !== 'running') return;
      while (this.nextStepTime < this.ctx.currentTime + 0.14) {
        this._scheduleBassStep(this.nextStepTime, this.stepIndex);
        // Slightly tighten tempo with speed (116 -> 130 BPM 8th notes)
        const bpm = 116 + this.currentSpeedNorm * 14;
        const eighthDur = 60 / bpm / 2;
        this.nextStepTime += eighthDur;
        this.stepIndex = (this.stepIndex + 1) % this.bassPattern.length;
      }
    }, 45);
  }

  stopPulse() {
    this.pulseActive = false;
    if (this.pulseTimer !== null) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  _scheduleBassStep(time, idx) {
    const freq = this.bassPattern[idx];
    const accent = idx % 4 === 0 ? 1.0 : 0.68;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const baseCutoff = 260 + this.currentSpeedNorm * 240;
    filter.frequency.setValueAtTime(baseCutoff * (accent > 0.8 ? 1.55 : 1.05), time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.19);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.085 * accent, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  playStart() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  playLaneSwitch(dir = 1) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Filtered air whoosh
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(dir > 0 ? 700 : 1200, now);
      filter.frequency.exponentialRampToValueAtTime(dir > 0 ? 1500 : 650, now + 0.11);
      filter.Q.value = 2.4;

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.13);
    }

    // Subtle synth glide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(dir > 0 ? 250 : 360, now);
    osc.frequency.exponentialRampToValueAtTime(dir > 0 ? 440 : 210, now + 0.09);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playJump() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playSlide(isQuickDrop = false) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isQuickDrop ? 420 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + (isQuickDrop ? 0.14 : 0.2));

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isQuickDrop ? 0.2 : 0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playOrb(streak = 0) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = this.orbScale[streak % this.orbScale.length];

    // Primary bell tone + octave shimmer
    [1, 2].forEach((mult, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * mult, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.06, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx === 0 ? 0.22 : 0.14));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    });
  }

  playPowerUp(type) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chord =
      type === 'shield'
        ? [392.0, 493.88, 587.33, 783.99]
        : [329.63, 440.0, 554.37, 659.25];

    chord.forEach((freq, i) => {
      const t = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.35);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  playShieldBreak() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Resonant energy shatter descending sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.34);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.38);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.2, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      noise.connect(hp);
      hp.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.27);
    }
  }

  playCrash() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Deep sub-bass impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(125, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 0.48);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.55);

    // Filtered noise crash burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1600, now);
      lp.frequency.exponentialRampToValueAtTime(140, now + 0.42);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      noise.connect(lp);
      lp.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.48);
    }
  }
}
