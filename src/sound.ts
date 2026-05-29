// Web Audio API Procedural Synthesizer for Arcade FPS Horror Game
// Keeps footprint tiny and prevents web latency loading issues.

class SoundSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  
  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.5;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // Start gentle procedural background music drone
      this.startAmbientMusic();
    } catch (e) {
      console.warn("Failed to initialize Web Audio API", e);
    }
  }

  setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  setSFXVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.1);
    }
  }

  setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.1);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Procedure for Pistol Fire: Fast high-frequency transient + envelope decay
  playPistol() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    
    // Crack noise
    const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 3;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // Deep thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    
    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Procedure for Shotgun Fire: Huge transient, thunder noise + heavy mechanical shock
  playShotgun() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    
    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.35; // 350ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // Bass Thud
    const osc1 = this.ctx.createOscillator();
    const oscGain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.linearRampToValueAtTime(35, now + 0.2);
    oscGain1.gain.setValueAtTime(1.5, now);
    oscGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(oscGain1);
    oscGain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.28);
    
    // Mechanical click/shell out after 0.5 sec
    setTimeout(() => this.playReloadClick(0.6), 400);
    setTimeout(() => this.playReloadClick(0.4), 600);
  }

  // Click sounds for weapons reloading
  playReloadClick(pitchMult: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(400 * pitchMult, now + 0.05);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Cash Register / buy confirmation ding
  playBuy() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.setValueAtTime(1600, now + 0.04);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.setValueAtTime(2400, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  }

  // Hitmarker "Tink" sound
  playHitmarker() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, now);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Solid thud when hitting zombie / player getting hit
  playHitImpact() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Deep creepy wave start chime (Tense bell)
  playWaveStart() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const oscBell = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscBell.type = 'sine';
    oscBell.frequency.setValueAtTime(140, now);
    // Vibrato
    oscBell.frequency.linearRampToValueAtTime(135, now + 1.2);

    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(65, now);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    // Apply distortion filter
    const dist = this.ctx.createBiquadFilter();
    dist.type = 'lowpass';
    dist.frequency.value = 280;

    oscBell.connect(dist);
    oscSub.connect(dist);
    dist.connect(gain);
    gain.connect(this.sfxGain);

    oscBell.start(now);
    oscSub.start(now);
    oscBell.stop(now + 2.6);
    oscSub.stop(now + 2.6);
  }

  // Zombie growl synth: Low-pitch sawtooth with vibrato and bandpass filter modulation
  playZombieGrowl() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const vibrato = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90 + Math.random() * 30, now);
    osc.frequency.linearRampToValueAtTime(50 + Math.random() * 15, now + 0.8);

    vibrato.frequency.setValueAtTime(12, now); // vibrato rate
    vibGain.gain.setValueAtTime(15, now); // vibrato depth

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.8);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    vibrato.start(now);
    osc.start(now);
    vibrato.stop(now + 0.85);
    osc.stop(now + 0.85);
  }

  // Tense, crawling ambient horror dark drone playing in background continuously
  private startAmbientMusic() {
    if (!this.ctx || !this.musicGain) return;
    
    const loop = () => {
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now); // A1
      osc1.frequency.linearRampToValueAtTime(54, now + 8);
      
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(82.4, now); // E2
      osc2.frequency.linearRampToValueAtTime(83, now + 8);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(90, now);
      filter.frequency.linearRampToValueAtTime(120, now + 4);
      filter.frequency.linearRampToValueAtTime(90, now + 8);
      filter.Q.value = 4.0;
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 2);
      gain.gain.setValueAtTime(0.18, now + 6);
      gain.gain.linearRampToValueAtTime(0.0, now + 8);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 8.1);
      osc2.stop(now + 8.1);
      
      // Schedule next phrase
      setTimeout(loop, 7800);
    };
    
    loop();
  }
}

export const sound = new SoundSynth();
