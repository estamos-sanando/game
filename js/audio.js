/**
 * audio.js — Sistema de audio generativo con Web Audio API
 * Genera todos los sonidos del juego proceduralmente (sin archivos mp3)
 * CASTORES — 80 años de impacto
 */

'use strict';

const AudioSystem = (() => {
  let ctx = null;        // AudioContext
  let masterGain = null; // Ganancia maestra
  let muted = false;
  let initialized = false;

  // Nodos de audio ambiental
  let ambientNodes = {};

  /**
   * Inicializa el AudioContext. Debe llamarse tras un gesto del usuario.
   */
  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
      masterGain.connect(ctx.destination);
      initialized = true;
      startAmbient();
    } catch (e) {
      console.warn('Web Audio API no disponible:', e);
    }
  }

  // ─── Utilidades ──────────────────────────────────────────────

  /**
   * Crea un oscilador simple con envolvente ADSR.
   */
  function createTone(freq, type, attack, decay, sustain, release, gainVal) {
    if (!ctx) return null;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const now  = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + attack);
    gain.gain.linearRampToValueAtTime(sustain * gainVal, now + attack + decay);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + attack + decay + release);

    gain.gain.setValueAtTime(sustain * gainVal, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + attack + decay + release);

    return { osc, gain };
  }

  /**
   * Crea un buffer de ruido blanco.
   */
  function createNoiseBuffer(seconds) {
    if (!ctx) return null;
    const sampleRate   = ctx.sampleRate;
    const bufferLength = sampleRate * seconds;
    const buffer       = ctx.createBuffer(1, bufferLength, sampleRate);
    const data         = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Crea ruido filtrado (para viento, agua, etc.)
   */
  function createFilteredNoise(bufferSec, filterFreq, filterType, gainVal) {
    if (!ctx) return null;
    const buffer = createNoiseBuffer(bufferSec);
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain   = ctx.createGain();

    source.buffer = buffer;
    source.loop   = true;

    filter.type            = filterType || 'lowpass';
    filter.frequency.value = filterFreq || 400;

    gain.gain.value = gainVal || 0.1;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    return { source, filter, gain };
  }

  // ─── Sonidos de ambiente ─────────────────────────────────────

  /**
   * Inicia todos los sonidos ambientales en bucle.
   */
  function startAmbient() {
    startWaterSound();
    startWindSound();
    startBirdsSound();
    startAmbientMusic();
  }

  /** Sonido de agua (río) */
  function startWaterSound() {
    const water = createFilteredNoise(4, 600, 'bandpass', 0.04);
    if (!water) return;
    water.filter.Q.value = 0.8;
    water.source.start();
    ambientNodes.water = water;

    // LFO para simular movimiento del agua
    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.3;
    lfoGain.gain.value  = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(water.filter.frequency);
    lfo.start();
    ambientNodes.waterLFO = lfo;
  }

  /** Sonido de viento */
  function startWindSound() {
    const wind = createFilteredNoise(8, 200, 'lowpass', 0.02);
    if (!wind) return;
    wind.source.start();
    ambientNodes.wind = wind;

    // Variación del viento
    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value  = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(wind.gain.gain);
    lfo.start();
  }

  /** Sonido de pájaros (trinos sintéticos) */
  function startBirdsSound() {
    scheduleBirdCall();
  }

  function scheduleBirdCall() {
    if (!ctx || !initialized) return;
    const delay = 2000 + Math.random() * 5000;
    setTimeout(() => {
      playBirdCall();
      scheduleBirdCall();
    }, delay);
  }

  function playBirdCall() {
    if (!ctx || muted) return;
    // Trino: 2-3 notas rápidas ascendentes
    const notes  = 2 + Math.floor(Math.random() * 3);
    const baseHz = 1800 + Math.random() * 600;

    for (let i = 0; i < notes; i++) {
      setTimeout(() => {
        if (!ctx) return;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const now  = ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseHz + i * 150, now);
        osc.frequency.exponentialRampToValueAtTime(baseHz + i * 200, now + 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
      }, i * 80);
    }
  }

  /** Música ambiental relajante (acordes lentos) */
  function startAmbientMusic() {
    playMusicChord();
  }

  function playMusicChord() {
    if (!ctx || !initialized) return;

    // Acorde de Do mayor (C-E-G) en octava baja, muy suave
    const chords = [
      [130.81, 164.81, 196.00],  // C3-E3-G3
      [146.83, 185.00, 220.00],  // D3-F#3-A3
      [174.61, 220.00, 261.63],  // F3-A3-C4
      [196.00, 246.94, 293.66],  // G3-B3-D4
    ];
    const chord = chords[Math.floor(Math.random() * chords.length)];

    chord.forEach(freq => {
      if (!ctx) return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const now  = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.8);
      gain.gain.setValueAtTime(0.025, now + 3.5);
      gain.gain.linearRampToValueAtTime(0, now + 5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 5.5);
    });

    // Próximo acorde en 6-8 segundos
    setTimeout(() => playMusicChord(), 5500 + Math.random() * 3000);
  }

  // ─── Efectos de sonido ───────────────────────────────────────

  /**
   * Sonido de hacha cortando madera.
   */
  function playChop() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    // Impacto seco
    const buffer = createNoiseBuffer(0.08);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain   = ctx.createGain();

    source.buffer       = buffer;
    filter.type         = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value      = 2;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);
  }

  /**
   * Sonido de árbol cayendo.
   */
  function playTreeFall() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    // Crujido descendente
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();

    // Distorsión suave
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
    }
    dist.curve = curve;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(dist);
    dist.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.8);

    // Ruido de impacto en el suelo
    setTimeout(() => {
      if (!ctx) return;
      const n   = ctx.createBufferSource();
      const g   = ctx.createGain();
      const f   = ctx.createBiquadFilter();
      n.buffer  = createNoiseBuffer(0.3);
      f.type    = 'lowpass';
      f.frequency.value = 200;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      n.connect(f); f.connect(g); g.connect(masterGain);
      n.start();
    }, 500);
  }

  /**
   * Sonido de splash al construir dique.
   */
  function playSplash() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    const buffer = createNoiseBuffer(0.2);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain   = ctx.createGain();

    source.buffer      = buffer;
    filter.type        = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value     = 0.5;

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);

    // Gotitas secundarias
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!ctx) return;
        createTone(
          800 + Math.random() * 400,
          'sine',
          0.005, 0.05, 0, 0.1,
          0.04
        );
      }, i * 60 + 30);
    }
  }

  /**
   * Sonido de celebración (fanfarria pequeña).
   */
  function playCelebrate() {
    if (!ctx || muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        createTone(freq, 'triangle', 0.01, 0.05, 0.3, 0.2, 0.08);
      }, i * 80);
    });
  }

  // ─── Control de volumen ───────────────────────────────────────

  function toggleMute() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.1);
    }
    return muted;
  }

  function setVolume(val) {
    if (masterGain) {
      masterGain.gain.setTargetAtTime(val, ctx.currentTime, 0.05);
    }
  }

  /**
   * Ajusta el ambiente según el nivel de deterioro.
   * Más deterioro → menos pájaros, más agua.
   */
  function updateAmbientForDeterioration(d) {
    if (!initialized || !ambientNodes.water) return;
    // Agua más intensa con más diques
    const waterGain = 0.04 + d * 0.06;
    ambientNodes.water.gain.gain.setTargetAtTime(waterGain, ctx.currentTime, 1);
  }

  return {
    init,
    playChop,
    playTreeFall,
    playSplash,
    playCelebrate,
    toggleMute,
    setVolume,
    updateAmbientForDeterioration,
    get isInitialized() { return initialized; },
    get isMuted() { return muted; },
  };
})();
