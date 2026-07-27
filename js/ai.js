/**
 * ai.js — Inteligencia artificial de los castores (State Machine)
 * Cada castor ejecuta un ciclo automático: buscar árbol → cortar → cargar → construir dique
 * CASTORES — 80 años de impacto
 */

'use strict';

/**
 * Actualiza la IA de todos los castores del juego.
 * Se llama cada frame desde el game loop.
 * @param {number} dt - Delta time en segundos
 */
function updateBeaverAI(dt) {
  // Ralentizar castores cuando se acerca el final
  const slowdown = GameState.endingStarted
    ? Math.max(0, 1 - (GameState.deterioration - THRESHOLDS.END) * 10)
    : 1.0;

  GameState.beavers.forEach(beaver => {
    beaver.speedMultiplier = slowdown;
    updateSingleBeaver(beaver, dt);
  });
}

/**
 * Máquina de estados para un castor individual.
 * Estados posibles: idle → walking → cutting → carrying → building → wandering
 */
function updateSingleBeaver(beaver, dt) {
  switch (beaver.state) {
    case 'idle':
      handleIdle(beaver, dt);
      break;
    case 'walking':
      handleWalking(beaver, dt);
      break;
    case 'cutting':
      handleCutting(beaver, dt);
      break;
    case 'carrying':
      handleCarrying(beaver, dt);
      break;
    case 'building':
      handleBuilding(beaver, dt);
      break;
    case 'wandering':
      handleWandering(beaver, dt);
      break;
    case 'celebrating':
      // Se maneja en entities.js (solo cuenta regresiva)
      break;
  }
}

/**
 * Estado IDLE: el castor busca el árbol más cercano.
 * Si no hay árboles disponibles, pasa a wandering.
 */
function handleIdle(beaver, dt) {
  // Pequeña pausa antes de buscar (evita que todos salgan al mismo instante)
  beaver._idleTimer = (beaver._idleTimer || 0) - dt;
  if (beaver._idleTimer > 0) return;
  beaver._idleTimer = 0;

  // Buscar árbol sano más cercano
  const tree = findNearestTree(beaver.x, beaver.y);

  if (tree) {
    tree.reserved = true;
    beaver.targetTree = tree;
    beaver.state = 'walking';
  } else {
    // No hay árboles → deambular
    beaver.state = 'wandering';
    beaver._wanderTarget = getRandomWanderPoint();
    beaver._wanderTimer = 3 + Math.random() * 3;
  }
}

/**
 * Estado WALKING: el castor camina hacia su árbol objetivo.
 */
function handleWalking(beaver, dt) {
  const tree = beaver.targetTree;

  // El árbol puede haber sido cortado por otro castor
  if (!tree || tree.state !== 'healthy') {
    beaver.targetTree = null;
    beaver.state = 'idle';
    beaver._idleTimer = 0.3;
    return;
  }

  // Desplazarse hacia el árbol
  const arrived = beaver.moveTo(tree.x, tree.y, beaver.speed, dt);

  if (arrived) {
    // ¡Llegó al árbol! Empezar a cortar
    beaver.state   = 'cutting';
    beaver.cutTimer = 0;
    tree.state     = 'being_cut';
    tree.beingCutBy = beaver;
    // Emitir partículas de inicio de corte
    spawnChipParticles(tree.x, tree.y);
    // Sonido de hacha
    if (window.AudioSystem) AudioSystem.playChop();
  }
}

/**
 * Estado CUTTING: el castor corta el árbol durante CUT_TIME ms.
 */
function handleCutting(beaver, dt) {
  const tree = beaver.targetTree;
  if (!tree) { beaver.state = 'idle'; return; }

  beaver.cutTimer += dt;
  tree.cutProgress = Math.min(1, beaver.cutTimer / (CUT_TIME / 1000));

  // Partículas ocasionales mientras corta
  if (Math.random() < 0.15) {
    spawnChipParticles(tree.x, tree.y);
  }

  // Emitir sonido rítmico
  if (Math.floor(beaver.cutTimer * 3) > Math.floor((beaver.cutTimer - dt) * 3)) {
    if (window.AudioSystem) AudioSystem.playChop();
  }

  if (tree.cutProgress >= 1) {
    // Árbol cortado → se convierte en tocón
    tree.state     = 'stump';
    tree.reserved  = false;
    tree.beingCutBy = null;

    // Partículas de caída del árbol
    spawnTreeFallParticles(tree.x, tree.y, tree.radius);

    // Sonido de árbol cayendo
    if (window.AudioSystem) AudioSystem.playTreeFall();

    // Iniciar degradación progresiva del árbol (stump → dead → flooded)
    scheduleTreeDegradation(tree);

    // El castor ahora lleva troncos
    beaver.carryLog  = true;
    beaver.state     = 'carrying';
    beaver.targetTree = null;

    // Decidir a dónde llevar los troncos
    beaver.damPosition = findDamPosition();

    // Celebrar brevemente
    if (Math.random() < 0.3) {
      beaver.state      = 'celebrating';
      beaver.celebTimer = 0.8;
      // Después de celebrar, irá a "carrying" (se maneja en el timer)
      beaver._afterCelebState = 'carrying';
    }
  }
}

/**
 * Estado CARRYING: el castor lleva troncos hacia el río.
 */
function handleCarrying(beaver, dt) {
  if (!beaver.damPosition) {
    beaver.damPosition = findDamPosition();
  }

  const target = beaver.damPosition;
  const arrived = beaver.moveTo(target.x, target.y, beaver.carrySpd, dt);

  if (arrived) {
    // Llegó al río con los troncos
    beaver.carryLog = false;
    beaver.state    = 'building';
    beaver.buildTimer = 0;

    // Crear objeto dique si no existe en esa posición
    const existingDam = GameState.dams.find(d =>
      Math.abs(d.x - target.x) < 30 && Math.abs(d.y - target.y) < 30
    );

    if (!existingDam) {
      const dam = new Dam(target.x, target.y);
      GameState.dams.push(dam);
      beaver._targetDam = dam;
    } else {
      beaver._targetDam = existingDam;
    }

    // Sonido de construcción
    if (window.AudioSystem) AudioSystem.playSplash();
  }
}

/**
 * Estado BUILDING: el castor construye el dique durante BUILD_TIME ms.
 */
function handleBuilding(beaver, dt) {
  beaver.buildTimer += dt;
  const progress = Math.min(1, beaver.buildTimer / (BUILD_TIME / 1000));

  // Actualizar progreso del dique
  if (beaver._targetDam) {
    beaver._targetDam.buildProgress = Math.max(
      beaver._targetDam.buildProgress,
      progress
    );
  }

  // Partículas de agua
  if (Math.random() < 0.1 && beaver.damPosition) {
    spawnWaterParticles(beaver.damPosition.x, beaver.damPosition.y);
  }

  if (progress >= 1) {
    // Dique terminado
    if (beaver._targetDam) {
      beaver._targetDam.buildProgress = 1;
      beaver._targetDam.update(0);
    }

    beaver._targetDam  = null;
    beaver.damPosition = null;
    beaver.state       = 'idle';
    beaver._idleTimer  = 0.5 + Math.random();

    // Pequeña celebración
    if (Math.random() < 0.4) {
      beaver.state      = 'celebrating';
      beaver.celebTimer = 0.6;
    }
  }
}

/**
 * Estado WANDERING: deambula cuando no hay árboles que cortar.
 */
function handleWandering(beaver, dt) {
  beaver._wanderTimer = (beaver._wanderTimer || 0) - dt;

  if (!beaver._wanderTarget || beaver._wanderTimer <= 0) {
    // Ver si aparecieron nuevos árboles
    const tree = findNearestTree(beaver.x, beaver.y);
    if (tree) {
      beaver.state = 'idle';
      return;
    }
    beaver._wanderTarget = getRandomWanderPoint();
    beaver._wanderTimer  = 2 + Math.random() * 3;
  }

  beaver.moveTo(
    beaver._wanderTarget.x,
    beaver._wanderTarget.y,
    beaver.speed * 0.5,
    dt
  );
}

/**
 * Genera un punto de deambulación aleatorio en la zona del mapa.
 */
function getRandomWanderPoint() {
  return {
    x: 50 + Math.random() * (RIVER.left - 80),
    y: 40 + Math.random() * (CANVAS_H - 80),
  };
}

/**
 * Programa la degradación progresiva de un árbol cortado.
 * stump → (8s) → dead → (12s) → flooded (si hay agua)
 */
function scheduleTreeDegradation(tree) {
  // Stump → Dead
  setTimeout(() => {
    if (tree.state === 'stump') {
      tree.state = 'dead';
    }
  }, 7000 + Math.random() * 5000);

  // Dead → Flooded (solo si hay suficiente agua)
  setTimeout(() => {
    if (tree.state === 'dead' && GameState.waterLevel > 0.3) {
      tree.state = 'flooded';
    }
  }, 18000 + Math.random() * 8000);
}

/**
 * Actualiza el estado de los diques.
 */
function updateDams(dt) {
  GameState.dams.forEach(dam => dam.update(dt));
}

/**
 * Verifica y actualiza los árboles cercanos al agua para inundarlos.
 */
function updateFloodedTrees() {
  if (GameState.waterLevel < 0.3) return;

  GameState.trees.forEach(tree => {
    if (tree.state !== 'dead') return;
    const distToRiver = Math.abs(tree.x - RIVER.centerX);
    const floodRadius  = RIVER.width / 2 + GameState.waterLevel * 70;

    if (distToRiver < floodRadius) {
      tree.state = 'flooded';
    }
  });
}
