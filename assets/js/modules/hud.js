/**
 * hud.js
 * Score/time/multiplier calculations + updating the UI.
 */

import { clamp, lerp, lerpHexColor } from "./utils.js?v=20251219";
import { MULTIPLIER_TIER_MS, TRACK_BLEND_MS } from "./context.js?v=20251219";

export function resetScore(ctx) {
	ctx.state.score = 0;
	ctx.ui.score.textContent = "0";
}

export function onScore(ctx, delta) {
	ctx.state.score += delta;
	ctx.ui.score.textContent = String(ctx.state.score);
	ctx.ui.score.classList.add("flash");
	setTimeout(() => ctx.ui.score.classList.remove("flash"), 250);
}

export function resetSurvival(ctx) {
	ctx.state.survivalMs = 0;
	ctx.state.multiplier = 1;
	ctx.state.multiplierLevel = 0;
	ctx.state.hud.lastSecond = 0;
	ctx.state.hud.lastMultiplier = 1;
}

function computeMultiplierFromTime(survivalMs) {
	const level = Math.floor(survivalMs / MULTIPLIER_TIER_MS);
	const multiplier = 1 + level * 0.5;
	return { multiplier, level };
}

export function updateSurvival(ctx, delta, setGameSpeed) {
	ctx.state.survivalMs += delta;

	const previousLevel = ctx.state.multiplierLevel;
	const { multiplier, level } = computeMultiplierFromTime(ctx.state.survivalMs);
	ctx.state.multiplier = multiplier;
	ctx.state.multiplierLevel = level;

	// Speed increases every 20s (same cadence as multiplier tiers).
	if (ctx.state.multiplierLevel > previousLevel) {
		setGameSpeed(ctx.state.gameSpeed * 1.25);
	}
}

function formatMultiplier(value) {
	return value % 1 === 0 ? String(value.toFixed(0)) : String(value.toFixed(1));
}

function multiplierHueRotateDeg(level) {
	// level 0: white (handled in CSS)
	// level 1+: start at green (0deg), then sweep through the spectrum to red.
	if (level <= 1) return 0;
	const rampSteps = 8;
	const progress = clamp((level - 1) / (rampSteps - 1), 0, 1);
	return progress * 240;
}

function formatTimeCompact(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export function updateHud(ctx) {
	const totalSeconds = Math.floor(ctx.state.survivalMs / 1000);

	ctx.ui.time.textContent = formatTimeCompact(ctx.state.survivalMs);
	ctx.ui.multiplier.textContent = `${formatMultiplier(ctx.state.multiplier)}x`;
	ctx.ui.multiplier.dataset.level = ctx.state.multiplierLevel === 0 ? "0" : "1";

	const hueDeg = multiplierHueRotateDeg(ctx.state.multiplierLevel);
	ctx.ui.multiplier.style.setProperty(
		"--multiplier-hue-rotate",
		`${hueDeg}deg`
	);

	// Track follows the same scheme as the multiplier.
	const tierProgressMs = ctx.state.survivalMs % MULTIPLIER_TIER_MS;
	const blendStartMs = MULTIPLIER_TIER_MS - TRACK_BLEND_MS;
	const blendT = clamp((tierProgressMs - blendStartMs) / TRACK_BLEND_MS, 0, 1);
	const nextHueDeg = multiplierHueRotateDeg(ctx.state.multiplierLevel + 1);
	const blendedHueDeg = lerp(hueDeg, nextHueDeg, blendT);

	const neutralA = "#f0f4ff";
	const neutralB = "#d6dce6";
	const activeA = "#eafff4";
	const activeB = "#6eff9c";

	if (ctx.state.multiplierLevel === 0) {
		document.documentElement.style.setProperty(
			"--track-a",
			lerpHexColor(neutralA, activeA, blendT)
		);
		document.documentElement.style.setProperty(
			"--track-b",
			lerpHexColor(neutralB, activeB, blendT)
		);
		document.documentElement.style.setProperty(
			"--track-filter",
			blendT > 0 ? `hue-rotate(${blendedHueDeg}deg)` : "none"
		);
	} else {
		document.documentElement.style.setProperty("--track-a", activeA);
		document.documentElement.style.setProperty("--track-b", activeB);
		document.documentElement.style.setProperty(
			"--track-filter",
			`hue-rotate(${blendedHueDeg}deg)`
		);
	}

	if (totalSeconds !== ctx.state.hud.lastSecond) {
		ctx.state.hud.lastSecond = totalSeconds;
		ctx.ui.time.classList.add("flash");
		setTimeout(() => ctx.ui.time.classList.remove("flash"), 250);
	}

	if (ctx.state.multiplier !== ctx.state.hud.lastMultiplier) {
		ctx.state.hud.lastMultiplier = ctx.state.multiplier;
		ctx.ui.multiplier.classList.add("flash");
		setTimeout(() => ctx.ui.multiplier.classList.remove("flash"), 250);
	}
}
