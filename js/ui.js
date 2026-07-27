/**
 * ui.js — Actualización del HUD (contadores, timeline, año, indicador de spawn)
 * CASTORES — 80 años de impacto
 */

'use strict';

// ─── Referencias al DOM ────────────────────────────────────────
let _elBeavers, _elTrees, _elDams, _elWater, _elYear;
let _ecoFill, _ecoStatus;
let _timelineProgress;
let _nodeEls = {};
let _spawnIndicator;

// Valores anteriores para animación de pulso
let _prevBeavers = 0;
let _prevDams    = 0;

/**
 * Inicializa todas las referencias del DOM.
 */
function initUI() {
  _elBeavers  = document.getElementById('val-beavers');
  _elTrees    = document.getElementById('val-trees');
  _elDams     = document.getElementById('val-dams');
  _elWater    = document.getElementById('val-water');
  _elYear     = document.getElementById('val-year');
  _ecoFill    = document.getElementById('eco-fill');
  _ecoStatus  = document.getElementById('eco-status');
  _timelineProgress = document.getElementById('timeline-progress');
  _spawnIndicator   = document.getElementById('spawn-indicator');

  // Nodos de la línea de tiempo
  [1946, 1958, 1975, 1998, 2026].forEach(year => {
    _nodeEls[year] = document.getElementById(`node-${year}`);
  });
}

/**
 * Actualiza todos los elementos del HUD.
 * Se llama desde el game loop en cada frame.
 */
function updateUI() {
  const s = GameState;

  // ── Contadores ──
  const beaverCount = s.beavers.length;
  const treeCount   = s.aliveTreeCount;
  const damCount    = s.totalDams;
  const waterPct    = Math.round(s.waterLevel * 33.3);  // 0-100%

  if (_elBeavers) _elBeavers.textContent = beaverCount;
  if (_elTrees)   _elTrees.textContent   = treeCount;
  if (_elDams)    _elDams.textContent    = damCount;
  if (_elWater)   _elWater.textContent   = `${Math.min(100, waterPct)}%`;
  if (_elYear)    _elYear.textContent    = s.currentYear;

  // Pulso en el contador cuando cambia
  if (beaverCount !== _prevBeavers) {
    pulse('counter-beavers');
    _prevBeavers = beaverCount;
  }
  if (damCount !== _prevDams) {
    pulse('counter-dams');
    _prevDams = damCount;
  }

  // ── Timeline ──
  updateTimeline(s.yearProgress, s.currentYear);

  // ── Barra de ecosistema ──
  updateEcoBar(s.deterioration);

  // ── Audio ──
  if (window.AudioSystem && AudioSystem.isInitialized) {
    AudioSystem.updateAmbientForDeterioration(s.deterioration);
  }
}

/**
 * Actualiza la línea de tiempo y activa los nodos correspondientes.
 */
function updateTimeline(progress, year) {
  if (_timelineProgress) {
    _timelineProgress.style.width = `${progress * 100}%`;
  }

  // Activar nodos hasta el año actual
  const years = [1946, 1958, 1975, 1998, 2026];
  years.forEach((y, i) => {
    const node = _nodeEls[y];
    if (!node) return;
    const nodeProgress = i / (years.length - 1);

    if (progress >= nodeProgress) {
      node.classList.add('reached');
      if (y === year) {
        node.classList.add('active');
      } else {
        node.classList.remove('active');
      }
    }
  });
}

/**
 * Actualiza la barra de estado del ecosistema.
 */
function updateEcoBar(d) {
  if (!_ecoFill || !_ecoStatus) return;

  _ecoFill.style.transform = `scaleX(${d})`;

  // Texto descriptivo del estado
  let statusText = '';
  if      (d < 0.05)              statusText = '🌿 Bosque sano';
  else if (d < THRESHOLDS.MILD)   statusText = '🌱 Primeros cambios';
  else if (d < THRESHOLDS.MODERATE) statusText = '⚠️ Deterioro visible';
  else if (d < THRESHOLDS.SEVERE) statusText = '🌊 Inundación avanzando';
  else if (d < THRESHOLDS.CRITICAL) statusText = '💀 Bosque en crisis';
  else                            statusText = '⛔ Ecosistema alterado';

  if (_ecoStatus.textContent !== statusText) {
    _ecoStatus.textContent  = statusText;
    _ecoStatus.style.animation = 'none';
    requestAnimationFrame(() => {
      _ecoStatus.style.animation = '';
    });
  }
}

/**
 * Anima un badge de contador con un pulso.
 * @param {string} id - ID del elemento badge
 */
function pulse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth; // reflow
  el.classList.add('pulse');
}

/**
 * Muestra el indicador visual de spawn sobre el canvas.
 */
function showSpawnIndicator() {
  if (!_spawnIndicator) return;
  _spawnIndicator.classList.remove('hidden');
  _spawnIndicator.style.animation = 'none';
  void _spawnIndicator.offsetWidth;
  _spawnIndicator.style.animation = '';

  setTimeout(() => {
    _spawnIndicator.classList.add('hidden');
  }, 800);
}

/**
 * Muestra el overlay del final del juego.
 */
function showEndScreen() {
  // Rellenar estadísticas finales
  const fBeavers = document.getElementById('final-beavers');
  const fDams    = document.getElementById('final-dams');
  const fTrees   = document.getElementById('final-trees');

  if (fBeavers) fBeavers.textContent = GameState.beavers.length;
  if (fDams)    fDams.textContent    = GameState.totalDams;
  if (fTrees)   fTrees.textContent   = GameState.damagedTreeCount;

  // Dibujar snapshots de comparación
  const canvasBefore = document.getElementById('canvas-before');
  const canvasAfter  = document.getElementById('canvas-after');
  if (canvasBefore) drawComparisonSnapshot(canvasBefore, true);
  if (canvasAfter)  drawComparisonSnapshot(canvasAfter,  false);

  // Mostrar overlay
  const endOverlay = document.getElementById('end-overlay');
  if (endOverlay) {
    endOverlay.classList.remove('hidden');
  }
}

/**
 * Inicializa el botón de sonido (si existe en el HTML).
 */
function initSoundButton() {
  const btn = document.getElementById('btn-sound');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const muted = AudioSystem.toggleMute();
    btn.textContent = muted ? '🔇' : '🔊';
  });
}
