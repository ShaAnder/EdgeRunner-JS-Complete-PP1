/**
 * input.js
 * Keyboard input helpers.
 *
 * Jump input:
 * - Space: standard fixed-height jump
 * - ArrowUp: hold-to-charge jump (release to jump)
 */

export function normalizeKey(event) {
	const key = event?.key;
	return typeof key === "string" ? key.toLowerCase() : "";
}

export function isStandardJumpEvent(event) {
	const code = event?.code;
	if (code === "Space") return true;
	const key = event?.key;
	return key === " " || key === "Spacebar";
}

export function isChargeJumpEvent(event) {
	const code = event?.code;
	if (code === "ArrowUp") return true;

	const key = normalizeKey(event);
	return key === "arrowup";
}

export function isControlEvent(event) {
	const code = event?.code;
	if (
		code === "ArrowLeft" ||
		code === "ArrowRight" ||
		code === "ArrowUp" ||
		code === "Space" ||
		code === "KeyA" ||
		code === "KeyD"
	) {
		return true;
	}

	const key = normalizeKey(event);
	return (
		key === "arrowleft" ||
		key === "arrowright" ||
		key === "arrowup" ||
		key === "a" ||
		key === "d" ||
		key === " " ||
		key === "spacebar"
	);
}
