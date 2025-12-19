/**
 * input.js
 * Keyboard input helpers.
 *
 * Jump input (unified):
 * - Tap Space: small jump
 * - Hold Space: charge up to a full jump
 * - Release Space: perform the jump
 */

export function normalizeKey(event) {
  const key = event?.key;
  return typeof key === 'string' ? key.toLowerCase() : '';
}

export function isTapJumpEvent(event) {
  const code = event?.code;
  if (code === 'Space') return true;
  const key = event?.key;
  return key === ' ' || key === 'Spacebar';
}

export function isControlEvent(event) {
  const code = event?.code;
  if (
    code === 'ArrowLeft' ||
    code === 'ArrowRight' ||
    code === 'Space' ||
    code === 'KeyA' ||
    code === 'KeyD'
  ) {
    return true;
  }

  const key = normalizeKey(event);
  return (
    key === 'arrowleft' ||
    key === 'arrowright' ||
    key === 'a' ||
    key === 'd' ||
    key === ' ' ||
    key === 'spacebar'
  );
}
