/**
 * main.js — Game loop principal y coordinación de todos los módulos
 * CASTORES — 80 años de impacto
 * 
 * Orden de ejecución:
 * 1. Usuario hace clic en "Comenzar"
 * 2. Se inicializa el AudioContext (requiere gesto del usuario)
 * 3. Se crea el mapa, los árboles y el estado inicial
 * 4. Comienza el game loop (requestAnimationFrame)
 * 5. El jugador añade castores haciendo clic
 * 6. Los castores actúan automáticamente
 * 7. Al 80% de deterioro → pantalla final
 */

'use strict';

// ─── Referencias globales al canvas ───────────────────────────
let canvas, ctx;
let animFrameId = null;

// ─── Inicialización al cargar el DOM ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Canvas principal
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');

  // Adaptar tamaño del canvas al contenedor
  handleResize();
  window.addEventListener('resize', handleResize);

  // Botones de la pantalla de inicio
  const btnStart = document.getElementById('btn-start');
  btnStart.addEventListener('click', startGame);

  // Botón de reinicio
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', restartGame);
  }

  // Botón de agregar castor
  const btnAddBeaver = document.getElementById('btn-add-beaver');
  if (btnAddBeaver) {
    btnAddBeaver.addEventListener('click', handleAddBeaver);
    // También con Enter/Space para accesibilidad
    btnAddBeaver.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') handleAddBeaver();
    });
  }

  // Cerrar modal de créditos haciendo clic fuera
  const creditsModal = document.getElementById('credits-modal');
  if (creditsModal) {
    creditsModal.addEventListener('click', e => {
      if (e.target === creditsModal) creditsModal.classList.add('hidden');
    });
  }
});

/**
 * Adapta el canvas al tamaño del contenedor manteniendo la proporción.
 */
function handleResize() {
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;

  // Mantener resolución interna fija, escalar via CSS
  canvas.style.width  = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
}

// ═══════════════════════════════════════════════════════════════
//  INICIO DEL JUEGO
// ═══════════════════════════════════════════════════════════════

/**
 * Inicia el juego: inicializa módulos y comienza el loop.
 */
function startGame() {
  // Inicializar audio (requiere gesto del usuario)
  AudioSystem.init();

  // Resetear estado global
  GameState.reset();

  // Inicializar módulos
  initMap(canvas);
  createInitialTrees();
  initEvents();
  initUI();
  initSoundButton();

  // Mostrar el wrapper del juego
  document.getElementById('start-overlay').classList.add('hidden');
  document.getElementById('game-wrapper').classList.remove('hidden');

  // Guardar snapshot del mapa ANTES
  // (lo generamos en drawComparisonSnapshot al final)

  // Iniciar el game loop
  GameState.running  = true;
  GameState.startTime = performance.now();
  GameState.lastTime  = GameState.startTime;
  animFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Reinicia el juego desde cero.
 */
function restartGame() {
  // Detener loop anterior
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  // Ocultar overlay final
  document.getElementById('end-overlay').classList.add('hidden');

  // Limpiar eventos narrativos
  resetEvents();

  // Iniciar de nuevo
  GameState.reset();
  initMap(canvas);
  createInitialTrees();
  initEvents();
  initUI();

  GameState.running   = true;
  GameState.startTime = performance.now();
  GameState.lastTime  = GameState.startTime;
  animFrameId = requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════════
//  INTERACCIÓN DEL JUGADOR
// ═══════════════════════════════════════════════════════════════

/**
 * Maneja el clic en "Agregar Castor".
 */
function handleAddBeaver() {
  if (!GameState.running || GameState.ended) return;

  // Inicializar audio si no lo está (primer clic)
  if (!AudioSystem.isInitialized) {
    AudioSystem.init();
  }

  const beaver = spawnBeaver();
  if (!beaver) return;

  // Efecto visual de spawn
  showSpawnIndicator();

  // Feedback de celebración de castores cercanos
  GameState.beavers
    .filter(b => {
      const dx = b.x - SPAWN.x;
      const dy = b.y - SPAWN.y;
      return Math.sqrt(dx*dx + dy*dy) < 100 && b.state !== 'cutting';
    })
    .slice(0, 2)
    .forEach(b => {
      b.state = 'celebrating';
      b.celebTimer = 0.5;
      spawnCelebrationParticles(b.x, b.y);
    });

  // Sonido breve de spawn
  AudioSystem.playCelebrate();
}

// ═══════════════════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════════════════

/**
 * Loop principal del juego (60fps con requestAnimationFrame).
 * @param {number} timestamp - Tiempo actual en ms
 */
function gameLoop(timestamp) {
  if (!GameState.running) return;

  // Calcular delta time (limitado a 100ms para evitar saltos)
  const rawDt = (timestamp - GameState.lastTime) / 1000;
  GameState.deltaTime = Math.min(rawDt, 0.1);
  GameState.lastTime  = timestamp;
  const dt = GameState.deltaTime;

  // ── 1. Actualizar estado del juego ──
  update(dt);

  // ── 2. Renderizar ──
  render(ctx, dt);

  // ── 3. Continuar loop ──
  if (!GameState.ended) {
    animFrameId = requestAnimationFrame(gameLoop);
  }
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════════════════════

/**
 * Actualiza toda la lógica del juego.
 */
function update(dt) {
  // Actualizar todos los castores (IA)
  updateBeaverAI(dt);

  // Actualizar animaciones de los castores
  GameState.beavers.forEach(b => b.update(dt));

  // Actualizar árboles
  GameState.trees.forEach(t => t.update(dt));

  // Actualizar diques
  updateDams(dt);

  // Actualizar árboles inundados
  updateFloodedTrees();

  // Recalcular deterioro
  GameState.updateDeterioration();
  GameState.updateYear();

  // Verificar y disparar eventos narrativos
  checkAndFireEvents();

  // Actualizar HUD
  updateUI();

  // Verificar condición de fin
  if (!GameState.endingStarted && GameState.deterioration >= THRESHOLDS.END) {
    GameState.endingStarted = true;
    triggerEnding();
  }
}

// ═══════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════

/**
 * Renderiza todo el frame.
 */
function render(ctx, dt) {
  // Limpiar canvas
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Capa 1: Mapa base (pasto, senderos, río)
  drawMap(ctx, dt);

  // Capa 2: Diques
  drawDams(ctx);

  // Capa 3: Árboles (ordenados por Y para profundidad)
  const sortedTrees = [...GameState.trees].sort((a, b) => a.y - b.y);
  sortedTrees.forEach(tree => tree.draw(ctx));

  // Capa 4: Castores (ordenados por Y)
  const sortedBeavers = [...GameState.beavers].sort((a, b) => a.y - b.y);
  sortedBeavers.forEach(beaver => beaver.draw(ctx));

  // Capa 5: Partículas (encima de todo)
  updateAndDrawParticles(ctx, dt);

  // Capa 6: Overlay de deterioro (velo oscuro creciente)
  if (GameState.deterioration > THRESHOLDS.MODERATE) {
    const alpha = (GameState.deterioration - THRESHOLDS.MODERATE) * 0.35;
    ctx.fillStyle = `rgba(30, 10, 0, ${Math.min(alpha, 0.25)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Capa 7: HUD del canvas (punto de spawn, número de castores)
  drawCanvasHUD(ctx);
}

/**
 * Dibuja elementos HUD superpuestos en el canvas del juego.
 */
function drawCanvasHUD(ctx) {
  // Indicador de punto de spawn
  const t = performance.now() / 1000;
  const pulse = Math.sin(t * 3) * 0.3 + 0.7;

  ctx.save();
  ctx.globalAlpha = pulse * 0.6;
  ctx.fillStyle   = '#FFD54F';
  ctx.beginPath();
  ctx.arc(SPAWN.x, SPAWN.y, 8, 0, Math.PI*2);
  ctx.fill();

  ctx.globalAlpha = pulse * 0.3;
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(SPAWN.x, SPAWN.y, 14 + pulse * 4, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Etiqueta del punto de spawn
  ctx.fillStyle  = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(SPAWN.x - 42, SPAWN.y + 16, 84, 18, 4);
  ctx.fill();
  ctx.fillStyle  = '#FFD54F';
  ctx.font       = 'bold 10px Atkinson Hyperlegible, sans-serif';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PUNTO DE LIBERACIÓN', SPAWN.x, SPAWN.y + 25);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  FINAL DEL JUEGO
// ═══════════════════════════════════════════════════════════════

/**
 * Inicia la secuencia de fin del juego.
 * Los castores se ralentizan y luego aparece la pantalla final.
 */
function triggerEnding() {
  // Los castores se detienen progresivamente (manejado en ai.js con speedMultiplier)
  // Después de 4 segundos, mostrar pantalla final
  setTimeout(() => {
    GameState.running = false;
    GameState.ended   = true;

    // Renderizar un frame final
    render(ctx, 0);

    // Mostrar pantalla final
    showEndScreen();

    // Detener el loop
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }, 4000);
}
