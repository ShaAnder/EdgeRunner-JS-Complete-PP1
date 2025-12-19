/**
 * main.js (entrypoint)
 * Loads helper modules and starts the game.
 *
 * This file is the only script referenced by index.html.
 */

import { createContext } from "./modules/context.js?v=20251219";
import {
	isControlEvent,
	isStandardJumpEvent,
	isChargeJumpEvent,
	normalizeKey,
} from "./modules/input.js?v=20251219";
import { clamp } from "./modules/utils.js?v=20251219";
import {
	buildTrack,
	renderTrack,
	resetWorld,
	updateWorld,
} from "./modules/track.js?v=20251219";
import {
	initParticleLayer,
	clearParticles,
	updateParticles,
} from "./modules/particles.js?v=20251219";
import {
	updateBounds,
	resetRunner,
	resetDirectionalInput,
	paintRunner,
	performJump,
	applyLateralMovement,
	updateChargeRatio,
	processJumpQueue,
	applyVerticalMovement,
	updateSpin,
	finalizeCharge,
} from "./modules/runner.js?v=20251219";
import {
	clearObstacles,
	updateObstacles,
	checkObstacleCollisions,
} from "./modules/obstacles.js?v=20251219";
import {
	resetScore,
	onScore,
	resetSurvival,
	updateSurvival,
	updateHud,
} from "./modules/hud.js?v=20251219";

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
		"--grid-scroll-duration",
		`${gridDuration}s`
	);
}

function showStartModal(message = "") {
	if (ctx.ui.retryModal) ctx.ui.retryModal.classList.add("hidden");
	if (ctx.ui.startModal) ctx.ui.startModal.classList.remove("hidden");
	if (ctx.ui.startModalMessage) {
		ctx.ui.startModalMessage.textContent =
			message || ctx.ui.startModalMessage.textContent;
	}
}

function showRetryModal(message = "") {
	if (ctx.ui.startModal) ctx.ui.startModal.classList.add("hidden");
	if (ctx.ui.retryModal) ctx.ui.retryModal.classList.remove("hidden");
	if (ctx.ui.retryModalMessage) {
		ctx.ui.retryModalMessage.textContent =
			message || ctx.ui.retryModalMessage.textContent;
	}
}

function hideModals() {
	ctx.ui.startModal?.classList.add("hidden");
	ctx.ui.retryModal?.classList.add("hidden");
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

function stopRun(reason = "crashed") {
	if (!ctx.state.running) return;

	ctx.state.running = false;
	resetDirectionalInput(ctx);

	if (reason === "crashed") {
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

function getPointerZone(event) {
	const rect = ctx.ui.gameArea.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const t = rect.width > 0 ? x / rect.width : 0.5;
	if (t < 0.33) return "left";
	if (t > 0.66) return "right";
	return "center";
}

function onPointerDown(event) {
	// Support touch/mouse without scrolling/selecting.
	if (isControlEvent(event)) event.preventDefault();

	if (!ctx.state.running) startRun();

	// Capture so we reliably get pointerup even if finger drifts.
	ctx.ui.gameArea.setPointerCapture?.(event.pointerId);

	const zone = getPointerZone(event);
	const touch = ctx.state.input.touch;

	if (zone === "left") {
		ctx.state.input.left = true;
		touch.leftId = event.pointerId;
		return;
	}

	if (zone === "right") {
		ctx.state.input.right = true;
		touch.rightId = event.pointerId;
		return;
	}

	// Center: tap to standard jump, hold to charge jump.
	if (ctx.state.runner.y === 0 && !ctx.state.input.charging) {
		ctx.state.input.charging = true;
		ctx.state.input.chargeStart = performance.now();
		ctx.state.input.chargeRatio = 0;
		touch.chargeId = event.pointerId;
		touch.chargeStart = ctx.state.input.chargeStart;
	}
}

function onPointerUpOrCancel(event) {
	if (isControlEvent(event)) event.preventDefault();

	const touch = ctx.state.input.touch;
	if (!touch) return;

	if (touch.leftId === event.pointerId) {
		ctx.state.input.left = false;
		touch.leftId = null;
	}

	if (touch.rightId === event.pointerId) {
		ctx.state.input.right = false;
		touch.rightId = null;
	}

	if (touch.chargeId === event.pointerId) {
		const start = touch.chargeStart ?? ctx.state.input.chargeStart;
		const elapsed = start ? performance.now() - start : 0;

		// Treat very quick taps as a standard fixed jump (matches Space behavior).
		if (elapsed > 0 && elapsed < 160 && ctx.state.runner.y === 0) {
			performJump(ctx, 100);
		} else {
			finalizeCharge(ctx);
		}

		touch.chargeId = null;
		touch.chargeStart = null;
	}
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
		if (key === "arrowleft" || key === "a") ctx.state.input.left = true;
		if (key === "arrowright" || key === "d") ctx.state.input.right = true;

		// Space: standard fixed jump (100px) when grounded.
		if (isStandardJumpEvent(event) && ctx.state.runner.y === 0) {
			performJump(ctx, 100);
			return;
		}

		// ArrowUp: hold to charge jump (release to jump).
		if (
			isChargeJumpEvent(event) &&
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
		if (key === "arrowleft" || key === "a") ctx.state.input.left = false;
		if (key === "arrowright" || key === "d") ctx.state.input.right = false;

		// Charged jump: release ArrowUp to perform the jump.
		if (isChargeJumpEvent(event)) finalizeCharge(ctx);
	},
};

function wireEvents() {
	ctx.ui.startBtn.addEventListener("click", startRun);
	ctx.ui.retryBtn?.addEventListener("click", startRun);

	// Pointer controls (mobile + mouse): hold left/right to move; tap/hold center to jump.
	ctx.ui.gameArea.addEventListener("pointerdown", onPointerDown);
	ctx.ui.gameArea.addEventListener("pointerup", onPointerUpOrCancel);
	ctx.ui.gameArea.addEventListener("pointercancel", onPointerUpOrCancel);

	document.addEventListener("keydown", controls.onKeyDown);
	document.addEventListener("keyup", controls.onKeyUp);

	// If the tab loses focus, keyup may never fire; reset input to avoid stuck keys.
	window.addEventListener("blur", () => resetDirectionalInput(ctx));
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") resetDirectionalInput(ctx);
	});

	window.addEventListener("resize", () => {
		updateBounds(ctx);
		buildTrack(ctx);
		resetWorld(ctx);
	});

	window.addEventListener("load", () => {
		requestAnimationFrame(() => {
			document.body.classList.remove("preload");
		});
	});
}

wireEvents();
setGameSpeed(1);

// Ensure the start modal is visible on first load.
showStartModal();
