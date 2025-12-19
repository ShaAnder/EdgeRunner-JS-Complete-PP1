/**
 * main.js (entrypoint)
 * Loads helper modules and starts the game.
 *
 * This file is the only script referenced by index.html.
 */

import { createContext } from './modules/context.js';
import {
  isControlEvent,
  isTapJumpEvent,
  normalizeKey,
} from './modules/input.js';
import { clamp } from './modules/utils.js';
import {
  buildTrack,
  renderTrack,
  resetWorld,
  updateWorld,
} from './modules/track.js';
import {
  initParticleLayer,
  clearParticles,
  updateParticles,
} from './modules/particles.js';
import {
  updateBounds,
  resetRunner,
  resetDirectionalInput,
  paintRunner,
  applyLateralMovement,
  updateChargeRatio,
  processJumpQueue,
  applyVerticalMovement,
  updateSpin,
  finalizeCharge,
} from './modules/runner.js';
import {
  clearObstacles,
  updateObstacles,
  checkObstacleCollisions,
} from './modules/obstacles.js';
import {
  resetScore,
  onScore,
  resetSurvival,
  updateSurvival,
  updateHud,
} from './modules/hud.js';

const ctx = createContext();

// Particles need a layer inside the gameArea.
initParticleLayer(ctx);

// Initial layout.
updateBounds(ctx);
buildTrack(ctx);
resetWorld(ctx);
updateHud(ctx);

// Difficulty -> speed conversion.
function setGameSpeed(multiplier) {
  ctx.state.gameSpeed = clamp(multiplier, 0.25, 6);

  // Grid-world speed (px/sec). Base: 1 tile every baseTrackScrollDuration.
  const baseWorldSpeed =
    ctx.config.tileSize / ctx.config.baseTrackScrollDuration;
  ctx.state.worldScrollSpeedPxPerSec = baseWorldSpeed * ctx.state.gameSpeed;

  const gridDuration = clamp(
    ctx.config.baseGridScrollDuration / ctx.state.gameSpeed,
    0.2,
    30
  );

  document.documentElement.style.setProperty(
    '--grid-scroll-duration',
    `${gridDuration}s`
  );
}

function showStartModal(message = '') {
  if (ctx.ui.retryModal) ctx.ui.retryModal.classList.add('hidden');
  if (ctx.ui.startModal) ctx.ui.startModal.classList.remove('hidden');
  if (ctx.ui.startModalMessage) {
    ctx.ui.startModalMessage.textContent =
      message || ctx.ui.startModalMessage.textContent;
  }
}

function showRetryModal(message = '') {
  if (ctx.ui.startModal) ctx.ui.startModal.classList.add('hidden');
  if (ctx.ui.retryModal) ctx.ui.retryModal.classList.remove('hidden');
  if (ctx.ui.retryModalMessage) {
    ctx.ui.retryModalMessage.textContent =
      message || ctx.ui.retryModalMessage.textContent;
  }
}

function hideModals() {
  ctx.ui.startModal?.classList.add('hidden');
  ctx.ui.retryModal?.classList.add('hidden');
}

function startRun() {
  if (ctx.state.running) return;

  hideModals();
  resetRunner(ctx);
  resetScore(ctx);
  resetSurvival(ctx);
  clearObstacles(ctx);
  clearParticles(ctx);
  setGameSpeed(1);
  resetWorld(ctx);

  ctx.state.running = true;
  ctx.state.lastFrame = performance.now();
  ctx.state.tickId = requestAnimationFrame(gameLoop);
}

function stopRun(reason = 'crashed') {
  if (!ctx.state.running) return;

  ctx.state.running = false;
  resetDirectionalInput(ctx);

  if (reason === 'crashed') {
    showRetryModal("Oh no — you're dead! Try again?");
  } else {
    showStartModal("Run paused. Tap start whenever you're ready.");
  }

  cancelAnimationFrame(ctx.state.tickId);
  ctx.state.tickId = null;

  clearObstacles(ctx);
  clearParticles(ctx);
}

function handleInput() {
  if (!ctx.state.running) startRun();
}

function gameLoop(now) {
  const delta = now - ctx.state.lastFrame;
  ctx.state.lastFrame = now;

  tick(delta);

  if (ctx.state.running) {
    ctx.state.tickId = requestAnimationFrame(gameLoop);
  }
}

function tick(delta) {
  const step = delta / 16;

  updateChargeRatio(ctx);
  applyLateralMovement(ctx, step);
  processJumpQueue(ctx);
  applyVerticalMovement(ctx, step);
  updateSpin(ctx, step);

  updateWorld(ctx, delta);
  updateObstacles(ctx, delta, onScore);
  checkObstacleCollisions(ctx, stopRun);

  updateSurvival(ctx, delta, setGameSpeed);
  updateHud(ctx);

  paintRunner(ctx);
  updateParticles(ctx, delta);
  renderTrack(ctx);
}

// Input wiring
const controls = {
  onKeyDown(event) {
    if (event.repeat) return;

    if (isControlEvent(event)) {
      event.preventDefault();
      if (!ctx.state.running) startRun();
    }

    const key = normalizeKey(event);
    if (key === 'arrowleft' || key === 'a') ctx.state.input.left = true;
    if (key === 'arrowright' || key === 'd') ctx.state.input.right = true;

    // Unified jump: Space keydown begins charging (tap = quick release).
    if (
      isTapJumpEvent(event) &&
      ctx.state.runner.y === 0 &&
      !ctx.state.input.charging
    ) {
      ctx.state.input.charging = true;
      ctx.state.input.chargeStart = performance.now();
      ctx.state.input.chargeRatio = 0;
    }
  },

  onKeyUp(event) {
    if (isControlEvent(event)) event.preventDefault();

    const key = normalizeKey(event);
    if (key === 'arrowleft' || key === 'a') ctx.state.input.left = false;
    if (key === 'arrowright' || key === 'd') ctx.state.input.right = false;

    // Unified jump: Space keyup performs the jump.
    if (isTapJumpEvent(event)) finalizeCharge(ctx);
  },
};

function wireEvents() {
  ctx.ui.startBtn.addEventListener('click', startRun);
  ctx.ui.retryBtn?.addEventListener('click', startRun);
  ctx.ui.gameArea.addEventListener('pointerdown', handleInput);
  document.addEventListener('keydown', controls.onKeyDown);
  document.addEventListener('keyup', controls.onKeyUp);

  // If the tab loses focus, keyup may never fire; reset input to avoid stuck keys.
  window.addEventListener('blur', () => resetDirectionalInput(ctx));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') resetDirectionalInput(ctx);
  });

  window.addEventListener('resize', () => {
    updateBounds(ctx);
    buildTrack(ctx);
    resetWorld(ctx);
  });

  window.addEventListener('load', () => {
    requestAnimationFrame(() => {
      document.body.classList.remove('preload');
    });
  });
}

wireEvents();
setGameSpeed(1);

// Ensure the start modal is visible on first load.
showStartModal();
