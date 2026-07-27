/**
 * game.js — Estado global del juego, constantes y configuración
 * CASTORES — 80 años de impacto
 */

'use strict';

// ─── Constantes del mapa ───────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 520;

// Zona del río (rectángulo aproximado)
const RIVER = {
  // Puntos del centro del río para pathfinding
  centerX: 620,
  width: 70,
  // Límites
  get left()  { return this.centerX - this.width / 2; },
  get right() { return this.centerX + this.width / 2; },
};

// Zona de spawn de castores
const SPAWN = { x: 440, y: 430 };

// Número máximo de castores
const MAX_BEAVERS = 60;

// Cuántos árboles comienzan en el mapa
const INITIAL_TREES = 58;

// Tiempo para cortar árbol (ms)
const CUT_TIME    = 3200;
const BUILD_TIME  = 2800;
const CARRY_SPEED = 38;
const WALK_SPEED  = 52;

// Umbrales de deterioro del ecosistema
const THRESHOLDS = {
  MILD:     0.15,
  MODERATE: 0.30,
  SEVERE:   0.55,
  CRITICAL: 0.75,
  END:      0.82,
};

// Años de la línea de tiempo
const TIMELINE_YEARS = [1946, 1958, 1975, 1998, 2026];

// ─── Estado global del juego ───────────────────────────────────
const GameState = {
  // Ciclo de juego
  running:    false,
  ended:      false,
  startTime:  0,
  lastTime:   0,
  deltaTime:  0,

  // Entidades
  beavers:    [],   // Array de objetos Beaver
  trees:      [],   // Array de objetos Tree
  dams:       [],   // Array de objetos Dam
  particles:  [],   // Array de partículas

  // Métricas
  totalBeavers:    0,
  totalDams:       0,
  initialTreeCount: 0,

  // Nivel de agua / inundación [0..1]
  waterLevel:       0,
  waterExpansion:   [],   // zonas de agua expandida

  // Deterioro del ecosistema [0..1]
  deterioration:    0,

  // Timeline
  currentYear:      1946,
  yearProgress:     0,  // [0..1] dentro de la línea de tiempo

  // Eventos narrativos ya mostrados
  shownEvents:      new Set(),

  // ID del castor siendo generado (para animación spawn)
  spawnAnimating:   false,

  // Imagen del mapa (snapshot inicial para comparación)
  snapshotBefore:   null,

  // Flags de deterioro
  firstDamBuilt:    false,
  endingStarted:    false,

  // Conteo de árboles vivos
  get aliveTreeCount() {
    return GameState.trees.filter(t => t.state === 'healthy' || t.state === 'growing').length;
  },

  get damagedTreeCount() {
    return GameState.trees.filter(t => t.state !== 'healthy' && t.state !== 'growing').length;
  },

  // Deterioro basado en árboles + agua
  updateDeterioration() {
    const totalTrees = GameState.initialTreeCount;
    if (totalTrees === 0) return;
    const damaged = GameState.damagedTreeCount;
    const treeRatio = damaged / totalTrees;
    const waterRatio = Math.min(GameState.waterLevel / 3.0, 0.4);
    GameState.deterioration = Math.min(1, treeRatio * 0.65 + waterRatio * 0.35);
  },

  // Año actual basado en deterioro
  updateYear() {
    const d = GameState.deterioration;
    if      (d < 0.05) { GameState.currentYear = 1946; GameState.yearProgress = 0; }
    else if (d < 0.25) { GameState.currentYear = 1958; GameState.yearProgress = 0.25; }
    else if (d < 0.50) { GameState.currentYear = 1975; GameState.yearProgress = 0.50; }
    else if (d < 0.75) { GameState.currentYear = 1998; GameState.yearProgress = 0.75; }
    else               { GameState.currentYear = 2026; GameState.yearProgress = 1.0; }
  },

  reset() {
    GameState.running         = false;
    GameState.ended           = false;
    GameState.startTime       = 0;
    GameState.lastTime        = 0;
    GameState.deltaTime       = 0;
    GameState.beavers         = [];
    GameState.trees           = [];
    GameState.dams            = [];
    GameState.particles       = [];
    GameState.totalBeavers    = 0;
    GameState.totalDams       = 0;
    GameState.initialTreeCount= 0;
    GameState.waterLevel      = 0;
    GameState.waterExpansion  = [];
    GameState.deterioration   = 0;
    GameState.currentYear     = 1946;
    GameState.yearProgress    = 0;
    GameState.shownEvents     = new Set();
    GameState.spawnAnimating  = false;
    GameState.snapshotBefore  = null;
    GameState.firstDamBuilt   = false;
    GameState.endingStarted   = false;
  }
};

// ─── Paleta de colores del juego (usada por el renderer) ──────
const PALETTE = {
  // Terreno
  grass1:    '#3E7B27',
  grass2:    '#4A8E2F',
  grass3:    '#56A136',
  grassDark: '#2D5A1B',
  dirt:      '#8B6914',
  dirtLight: '#A07820',
  path:      '#C4973A',
  mud:       '#5C4016',

  // Agua
  water1:    '#1565C0',
  water2:    '#1976D2',
  water3:    '#2196F3',
  waterShim: '#42A5F5',
  waterFlood:'rgba(33,150,243,0.45)',

  // Árboles
  treeTrunk: '#5D4037',
  treeCanopy:'#2E7D32',
  treeCanM:  '#388E3C',
  treeCanL:  '#43A047',
  treeCanHL: '#66BB6A',
  treeDead:  '#546E7A',
  treeStump: '#6D4C41',

  // Castor
  beaverBody:'#7B4F2E',
  beaverBelly:'#C49A6C',
  beaverEye: '#1A1A1A',
  beaverTail:'#5C3D1E',

  // Dique
  damWood:   '#795548',
  damLog:    '#6D4C41',

  // Estructuras
  cabinRoof: '#8B2500',
  cabinWall: '#D4A45A',
  cabinDoor: '#5D2E00',
  rock:      '#78909C',
  rockDark:  '#546E7A',
  sign:      '#D4AC60',
  signPost:  '#8B6914',
};
