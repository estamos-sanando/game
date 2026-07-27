/**
 * events.js — Sistema de tarjetas narrativas (eventos periodísticos)
 * Las tarjetas aparecen automáticamente según el avance del juego
 * CASTORES — 80 años de impacto
 */

'use strict';

// ─── Definición de todos los eventos narrativos ────────────────
const NARRATIVE_EVENTS = [
  {
    id:       'intro',
    year:     '1946',
    text:     'Argentina introdujo 20 castores canadienses en Tierra del Fuego para desarrollar una industria peletera que nunca prosperó.',
    type:     'info',
    trigger:  () => GameState.totalBeavers >= 1,
  },
  {
    id:       'no_predators',
    year:     '1950s',
    text:     'Los castores no tenían depredadores naturales en el sur de América. Ningún puma, ningún lince. Solo bosque y ríos libres.',
    type:     'info',
    trigger:  () => GameState.totalBeavers >= 4,
  },
  {
    id:       'population_growth',
    year:     '1960s',
    text:     'La población de castores comenzó a crecer exponencialmente. De 20 individuos pasaron a cientos en pocas décadas.',
    type:     'warning',
    trigger:  () => GameState.totalBeavers >= 8,
  },
  {
    id:       'first_dam',
    year:     'Proceso',
    text:     'Los castores construyen diques para crear estanques donde vivir con seguridad. Cada dique retiene agua y modifica el flujo del río.',
    type:     'info',
    trigger:  () => GameState.firstDamBuilt,
  },
  {
    id:       'flooding',
    year:     '1970s',
    text:     'Las inundaciones comienzan a afectar las especies nativas. La lenga y el guindo —árboles únicos de la Patagonia— no toleran el exceso de agua.',
    type:     'warning',
    trigger:  () => GameState.deterioration > THRESHOLDS.MILD,
  },
  {
    id:       'forest_loss',
    year:     '1980s',
    text:     'Los bosques de Tierra del Fuego comienzan a desaparecer. Las áreas inundadas crean "bosques fantasma": árboles muertos parados en el agua.',
    type:     'critical',
    trigger:  () => GameState.deterioration > THRESHOLDS.MODERATE,
  },
  {
    id:       'spread_chile',
    year:     '1990s',
    text:     'Los castores cruzaron el Canal de Beagle hacia Chile. El problema ya no era solo argentino: afectaba a toda la Patagonia austral.',
    type:     'warning',
    trigger:  () => GameState.deterioration > THRESHOLDS.SEVERE * 0.7,
  },
  {
    id:       'programs',
    year:     '1998',
    text:     'Argentina y Chile firmaron acuerdos para controlar la expansión del castor. Los programas de remoción comenzaron, pero la tarea era inmensa.',
    type:     'info',
    trigger:  () => GameState.deterioration > THRESHOLDS.SEVERE,
  },
  {
    id:       'scale',
    year:     '2000s',
    text:     'Se estimó que la población de castores superó los 100.000 individuos. El costo ambiental de los 20 castores originales era incalculable.',
    type:     'critical',
    trigger:  () => GameState.totalBeavers >= 25,
  },
  {
    id:       'recovery',
    year:     'Hoy',
    text:     'La recuperación del bosque nativo puede requerir décadas —incluso siglos— después de que se eliminen los diques. El suelo tarda generaciones en sanar.',
    type:     'critical',
    trigger:  () => GameState.deterioration > THRESHOLDS.CRITICAL,
  },
];

// ─── Referencia al contenedor de eventos ──────────────────────
let eventsFeed = null;
let emptyState = null;

/**
 * Inicializa el sistema de eventos.
 */
function initEvents() {
  eventsFeed = document.getElementById('events-feed');
  emptyState = eventsFeed.querySelector('.events-empty');
}

/**
 * Verifica si algún evento debe activarse en este frame.
 * Se llama desde el game loop.
 */
function checkAndFireEvents() {
  NARRATIVE_EVENTS.forEach(event => {
    if (GameState.shownEvents.has(event.id)) return;
    if (!event.trigger()) return;

    GameState.shownEvents.add(event.id);
    showEventCard(event);
  });
}

/**
 * Muestra una tarjeta de evento en el sidebar.
 * @param {Object} event - Objeto de evento narrativo
 */
function showEventCard(event) {
  if (!eventsFeed) return;

  // Ocultar estado vacío
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Crear tarjeta
  const card = document.createElement('div');
  card.className = `event-card event-${event.type}`;
  card.innerHTML = `
    <div class="event-year">${event.year}</div>
    <p class="event-text">${event.text}</p>
  `;

  // Insertar al inicio del feed (más reciente primero)
  eventsFeed.insertBefore(card, eventsFeed.firstChild);

  // Scroll al inicio
  eventsFeed.scrollTop = 0;

  // Sonido/feedback visual opcional
  card.addEventListener('click', () => {
    card.style.background = '#E8F5E9';
    setTimeout(() => { card.style.background = ''; }, 200);
  });
}

/**
 * Reinicia el feed de eventos.
 */
function resetEvents() {
  if (!eventsFeed) return;
  // Remover todas las tarjetas menos el empty state
  const cards = eventsFeed.querySelectorAll('.event-card');
  cards.forEach(c => c.remove());
  if (emptyState) emptyState.style.display = '';
}
