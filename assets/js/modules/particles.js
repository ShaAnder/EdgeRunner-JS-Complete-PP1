/**
 * particles.js
 * Runner particle trail (DOM-only, beginner-friendly).
 */

import { clamp, randomIntBetween } from "./utils.js?v=20251219";
import { computeRotationGroundLift } from "./runner.js?v=20251219";

export function initParticleLayer(ctx) {
	if (!ctx.ui.gameArea) return;

	const layer = document.createElement("div");
	layer.className = "particle-layer";
	layer.setAttribute("aria-hidden", "true");

	// Insert behind the runner so the outline stays crisp.
	ctx.ui.gameArea.insertBefore(layer, ctx.ui.runner);
	ctx.ui.particleLayer = layer;

	document.documentElement.style.setProperty(
		"--particle-size",
		`${ctx.config.particleSizePx}px`
	);
}

export function clearParticles(ctx) {
	for (const particle of ctx.state.particles) {
		particle.el.remove();
	}

	ctx.state.particles.length = 0;
	ctx.state.particlePool.length = 0;
	ctx.state.particleSpawnMs = 0;

	if (ctx.ui.particleLayer) ctx.ui.particleLayer.textContent = "";
}

function getRunnerCenterInGameArea(ctx) {
	const styles = getComputedStyle(ctx.ui.runner);
	const baseLeft = parseFloat(styles.left) || 0;
	const baseBottom = parseFloat(styles.bottom) || 0;

	const grounded = ctx.state.runner.y === 0;
	const rotationDeg = grounded ? 0 : ctx.state.runner.rotation;
	const lift = grounded ? 0 : computeRotationGroundLift(ctx, rotationDeg);

	const x = baseLeft + ctx.state.runner.x + ctx.runnerWidth / 2;
	const yFromBottom =
		baseBottom + ctx.state.runner.y + lift + ctx.runnerHeight / 2;
	const y = ctx.ui.gameArea.clientHeight - yFromBottom;
	return { x, y };
}

function takeParticleEl(ctx) {
	const el = ctx.state.particlePool.pop() ?? document.createElement("div");
	el.className = "particle";
	el.style.opacity = "0";
	return el;
}

function releaseParticleEl(ctx, el) {
	el.remove();
	if (ctx.state.particlePool.length < ctx.config.particleMaxCount) {
		ctx.state.particlePool.push(el);
	}
}

function spawnParticle(ctx) {
	if (!ctx.ui.particleLayer) return;

	// Cap particle count to avoid runaway DOM growth.
	while (ctx.state.particles.length >= ctx.config.particleMaxCount) {
		const oldest = ctx.state.particles.shift();
		if (oldest) releaseParticleEl(ctx, oldest.el);
	}

	const { x: runnerX, y: runnerY } = getRunnerCenterInGameArea(ctx);

	const el = takeParticleEl(ctx);
	ctx.ui.particleLayer.appendChild(el);

	// Always emit from the runner's left side to sell forward motion.
	// (Never spawn to the right of the runner.)
	const runnerLeftEdgeX = runnerX - ctx.runnerWidth / 2;
	const baseX = runnerLeftEdgeX - ctx.config.particleSizePx * 0.25;
	const x = baseX - randomIntBetween(0, 10);
	const y = runnerY + randomIntBetween(-10, 10);

	const speedScale = ctx.config.particleSpeedScale;
	const driftSpeed = (90 + Math.random() * 70) * speedScale;
	const jitterVy = (-40 + Math.random() * 80) * speedScale;

	ctx.state.particles.push({
		el,
		x,
		y,
		vx: -driftSpeed,
		vy: jitterVy,
		ageMs: 0,
		lifeMs: ctx.config.particleLifetimeMs,
	});
}

export function updateParticles(ctx, delta) {
	if (!ctx.state.running || !ctx.ui.particleLayer) return;

	ctx.state.particleSpawnMs += delta;
	while (ctx.state.particleSpawnMs >= ctx.config.particleSpawnIntervalMs) {
		ctx.state.particleSpawnMs -= ctx.config.particleSpawnIntervalMs;
		spawnParticle(ctx);
	}

	const dt = delta / 1000;

	for (let index = ctx.state.particles.length - 1; index >= 0; index--) {
		const p = ctx.state.particles[index];
		p.ageMs += delta;

		// Slight drift + gentle gravity.
		p.vy += 21 * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;

		const t = clamp(p.ageMs / p.lifeMs, 0, 1);
		const opacity = 1 - t;
		const scale = 1 - t * 0.55;

		p.el.style.left = `${p.x}px`;
		p.el.style.top = `${p.y}px`;
		p.el.style.opacity = `${opacity}`;
		p.el.style.transform = `translate(-50%, -50%) scale(${scale})`;

		if (t >= 1) {
			ctx.state.particles.splice(index, 1);
			releaseParticleEl(ctx, p.el);
		}
	}
}
