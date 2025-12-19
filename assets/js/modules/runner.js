/**
 * runner.js
 * Runner physics + movement + jump logic.
 */

import { clamp } from "./utils.js?v=20251219";

export function computeRotationGroundLift(ctx, angleDeg) {
	if (!angleDeg) return 0;
	const normalized = ((angleDeg % 360) + 360) % 360;
	if (normalized === 0) return 0;

	const angle = (normalized * Math.PI) / 180;
	const sin = Math.sin(angle);
	const cos = Math.cos(angle);

	// Model the runner as a rectangle rotated around its bottom-center.
	// If any corner rotates below y=0, lift the whole body so it stays above ground.
	const halfWidth = ctx.runnerWidth / 2;
	const height = ctx.runnerHeight;
	const corners = [
		{ x: -halfWidth, y: 0 },
		{ x: halfWidth, y: 0 },
		{ x: -halfWidth, y: height },
		{ x: halfWidth, y: height },
	];

	let minY = Infinity;
	for (const corner of corners) {
		const rotatedY = corner.x * sin + corner.y * cos;
		if (rotatedY < minY) minY = rotatedY;
	}

	return minY < 0 ? -minY : 0;
}

function computeUsableWidth(ctx) {
	const styles = getComputedStyle(ctx.ui.gameArea);
	const horizontalPadding =
		parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
	return Math.max(0, ctx.ui.gameArea.clientWidth - horizontalPadding);
}

export function updateBounds(ctx) {
	ctx.bounds.max = Math.max(0, computeUsableWidth(ctx) * 0.9 - ctx.runnerWidth);
	ctx.bounds.min = -ctx.runnerWidth * 0.25;
	ctx.state.runner.x = clamp(
		ctx.state.runner.x,
		ctx.bounds.min,
		ctx.bounds.max
	);
}

export function paintRunner(ctx) {
	ctx.ui.runner.style.setProperty("--runner-x", `${ctx.state.runner.x}px`);

	const grounded = ctx.state.runner.y === 0;
	const visualRotation = grounded ? 0 : ctx.state.runner.rotation;
	const lift = grounded ? 0 : computeRotationGroundLift(ctx, visualRotation);
	const visualY = -(ctx.state.runner.y + lift);

	ctx.ui.runner.style.setProperty("--runner-y", `${visualY}px`);
	ctx.ui.runner.style.setProperty("--runner-rot", `${visualRotation}deg`);
}

export function resetDirectionalInput(ctx) {
	ctx.state.input.left = false;
	ctx.state.input.right = false;
	ctx.state.input.charging = false;
	ctx.state.input.jumpQueued = false;
	ctx.state.input.chargeStart = null;
	ctx.state.input.chargeRatio = 0;

	if (ctx.state.input.touch) {
		ctx.state.input.touch.leftId = null;
		ctx.state.input.touch.rightId = null;
		ctx.state.input.touch.chargeId = null;
		ctx.state.input.touch.chargeStart = null;
	}
}

export function resetRunner(ctx) {
	resetDirectionalInput(ctx);
	ctx.state.runner.x = 70;
	ctx.state.runner.y = 0;
	ctx.state.runner.vy = 0;
	ctx.state.runner.rotation = 0;
	ctx.state.runner.spinVelocity = 0;
	ctx.state.runner.spinTarget = 0;

	updateBounds(ctx);
	paintRunner(ctx);
}

export function performJump(ctx, targetHeight) {
	const height = clamp(targetHeight, 0, ctx.config.maxJumpHeight);
	const force = Math.sqrt(2 * ctx.config.gravity * height);

	ctx.state.runner.vy = force;
	ctx.state.input.jumpQueued = false;
	ctx.state.input.charging = false;
	ctx.state.input.chargeStart = null;
	ctx.state.input.chargeRatio = 0;

	ctx.state.runner.spinVelocity = 360;
	ctx.state.runner.spinTarget = (ctx.state.runner.rotation + 180) % 360;
}

export function applyLateralMovement(ctx, step) {
	const prevX = ctx.state.runner.x;
	let targetVx = 0;

	if (ctx.state.input.left && ctx.state.runner.x > ctx.bounds.min) {
		targetVx -= ctx.config.lateralSpeed;
	}
	if (ctx.state.input.right && ctx.state.runner.x < ctx.bounds.max) {
		targetVx += ctx.config.lateralSpeed;
	}

	ctx.state.runner.x = clamp(
		ctx.state.runner.x + targetVx * step,
		ctx.bounds.min,
		ctx.bounds.max
	);

	const dx = ctx.state.runner.x - prevX;
	if (dx > 0.05) ctx.state.runnerDirX = 1;
	else if (dx < -0.05) ctx.state.runnerDirX = -1;
}

export function updateChargeRatio(ctx) {
	if (!ctx.state.input.charging || !ctx.state.input.chargeStart) return;
	const elapsed = performance.now() - ctx.state.input.chargeStart;
	ctx.state.input.chargeRatio = clamp(elapsed / ctx.config.chargeWindow, 0, 1);
}

function selectJumpHeight(ctx, ratio) {
	const t = clamp(ratio, 0, 1);
	return (
		ctx.config.minJumpHeight +
		(ctx.config.maxJumpHeight - ctx.config.minJumpHeight) * t
	);
}

export function processJumpQueue(ctx) {
	if (!ctx.state.input.jumpQueued || ctx.state.runner.y !== 0) return;

	const ratio = clamp(ctx.state.input.chargeRatio || 0, 0, 1);
	const targetHeight = selectJumpHeight(ctx, ratio);
	performJump(ctx, targetHeight);
}

export function finalizeCharge(ctx) {
	if (!ctx.state.input.charging) return;

	const elapsed = ctx.state.input.chargeStart
		? performance.now() - ctx.state.input.chargeStart
		: 0;

	ctx.state.input.chargeRatio = clamp(elapsed / ctx.config.chargeWindow, 0, 1);
	ctx.state.input.jumpQueued = true;
	ctx.state.input.charging = false;
	ctx.state.input.chargeStart = null;

	// If we're grounded, apply the jump immediately so taps feel responsive.
	processJumpQueue(ctx);
}

export function applyVerticalMovement(ctx, step) {
	if (ctx.state.runner.y > 0 || ctx.state.runner.vy !== 0) {
		ctx.state.runner.vy = ctx.state.runner.vy - ctx.config.gravity * step;
	}

	ctx.state.runner.y = clamp(
		ctx.state.runner.y + ctx.state.runner.vy * step,
		0,
		ctx.config.maxJumpHeight
	);

	if (ctx.state.runner.y === 0 && ctx.state.runner.vy < 0) {
		ctx.state.runner.vy = 0;
	}
}

export function updateSpin(ctx, step) {
	if (ctx.state.runner.spinVelocity && ctx.state.runner.y > 0) {
		const target = ctx.state.runner.spinTarget ?? 0;
		const remaining = target - ctx.state.runner.rotation;

		if (Math.abs(remaining) < 0.5) {
			ctx.state.runner.rotation = target;
			ctx.state.runner.spinVelocity = 0;
			return;
		}

		const direction = remaining > 0 ? 1 : -1;
		const deltaRot = direction * ctx.state.runner.spinVelocity * step;

		if (Math.abs(deltaRot) >= Math.abs(remaining)) {
			ctx.state.runner.rotation = target;
			ctx.state.runner.spinVelocity = 0;
			return;
		}

		ctx.state.runner.rotation = (ctx.state.runner.rotation + deltaRot) % 360;
		return;
	}

	if (ctx.state.runner.y === 0) {
		ctx.state.runner.rotation = 0;
		ctx.state.runner.spinVelocity = 0;
		ctx.state.runner.spinTarget = 0;
	}
}
