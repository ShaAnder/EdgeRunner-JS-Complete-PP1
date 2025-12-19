/**
 * context.js
 * Creates the shared game context (ui + state + config).
 *
 * All other modules receive this context so we avoid globals.
 */

import { clamp } from "./utils.js";

export const MULTIPLIER_TIER_MS = 20_000;
export const TRACK_BLEND_MS = 10_000;

export function createContext() {
	// UI elements (DOM references).
	const ui = {
		gameArea: document.getElementById("gameArea"),
		runner: document.getElementById("runner"),
		track: document.querySelector(".track"),
		particleLayer: null,
		startBtn: document.getElementById("startBtn"),
		retryBtn: document.getElementById("retryBtn"),
		startModal: document.getElementById("startModal"),
		retryModal: document.getElementById("retryModal"),
		startModalMessage: document.getElementById("startModalMessage"),
		retryModalMessage: document.getElementById("retryModalMessage"),
		score: document.getElementById("score"),
		time: document.getElementById("time"),
		multiplier: document.getElementById("multiplier"),
	};

	const runnerWidth = ui.runner.offsetWidth;
	const runnerHeight = ui.runner.offsetHeight;

	const bounds = {
		min: -runnerWidth,
		max: 0,
	};

	// Mutable game state.
	const state = {
		running: false,
		score: 0,
		tickId: null,
		gameSpeed: 1,
		worldScrollSpeedPxPerSec: 0,
		survivalMs: 0,
		multiplier: 1,
		multiplierLevel: 0,
		hud: {
			lastSecond: 0,
			lastMultiplier: 1,
		},
		worldScrollPx: 0,
		nextSpawnTileX: 0,
		obstacles: [],
		particles: [],
		particlePool: [],
		particleSpawnMs: 0,
		runnerDirX: 1,
		runner: {
			x: 70,
			y: 0,
			vy: 0,
			rotation: 0,
			spinVelocity: 0,
			spinTarget: 0,
		},
		input: {
			left: false,
			right: false,
			jumpQueued: false,
			charging: false,
			chargeStart: null,
			chargeRatio: 0,
		},
		track: null,
		lastFrame: 0,
	};

	// Tunables.
	const config = {
		lateralSpeed: 5,
		gravity: 1,

		// Jump tuning (px): tap vs full charge.
		// Min was bumped ~10% for snappier tap jumps.
		minJumpHeight: 100,
		maxJumpHeight: 160,
		chargeWindow: 1000,

		obstacleGapTiles: 5,
		ceilingObstacleChance: 0.35,
		ceilingSpikeTipRows: [3, 4],
		ceilingMaxOffsetPx: 70,

		baseTrackScrollDuration: 0.28,
		baseGridScrollDuration: 1.8,

		tileSize: runnerWidth,
		collisionMinOverlap: 3,

		// Runner particle trail.
		particleSpawnIntervalMs: 20,
		particleLifetimeMs: 1100,
		particleMaxCount: 220,
		particleSizePx: 7,
		particleSpeedScale: 0.7,
	};

	// Ensure jump heights fit inside the visible play area.
	config.maxJumpHeight = Math.min(
		config.maxJumpHeight,
		ui.gameArea.clientHeight * 0.65
	);
	config.minJumpHeight = Math.min(config.minJumpHeight, config.maxJumpHeight);

	return { ui, runnerWidth, runnerHeight, bounds, state, config };
}
