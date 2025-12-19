/**
 * track.js
 * DOM tile track creation + scrolling.
 */

export function getTileCountAcross(ctx) {
  return Math.ceil(ctx.ui.gameArea.clientWidth / ctx.config.tileSize) + 3;
}

export function clearTrack(ctx) {
  if (!ctx.ui.track) return;
  while (ctx.ui.track.firstChild)
    ctx.ui.track.removeChild(ctx.ui.track.firstChild);
}

export function buildTrack(ctx) {
  if (!ctx.ui.track) return;
  clearTrack(ctx);

  document.documentElement.style.setProperty(
    '--track-tile',
    `${ctx.config.tileSize}px`
  );

  const tilesPerStrip = getTileCountAcross(ctx);
  const stripWidth = tilesPerStrip * ctx.config.tileSize;

  const stripA = document.createElement('div');
  stripA.className = 'track__strip';
  stripA.dataset.strip = 'a';
  stripA.style.width = `${stripWidth}px`;

  const stripB = document.createElement('div');
  stripB.className = 'track__strip';
  stripB.dataset.strip = 'b';
  stripB.style.width = `${stripWidth}px`;

  for (let i = 0; i < tilesPerStrip; i++) {
    const tileA = document.createElement('div');
    tileA.className =
      i === 0 ? 'track__tile track__tile--first' : 'track__tile';
    stripA.appendChild(tileA);

    const tileB = document.createElement('div');
    tileB.className =
      i === 0 ? 'track__tile track__tile--first' : 'track__tile';
    stripB.appendChild(tileB);
  }

  const topLine = document.createElement('div');
  topLine.className = 'track__topline';

  ctx.ui.track.appendChild(stripA);
  ctx.ui.track.appendChild(stripB);
  ctx.ui.track.appendChild(topLine);

  ctx.state.track = { stripA, stripB, stripWidth };
}

export function renderTrack(ctx) {
  if (!ctx.state.track) return;
  const { stripA, stripB, stripWidth } = ctx.state.track;
  if (!stripWidth) return;

  const offset = -(ctx.state.worldScrollPx % stripWidth);
  stripA.style.transform = `translate3d(${offset}px, 0, 0)`;
  stripB.style.transform = `translate3d(${offset + stripWidth}px, 0, 0)`;
}

export function resetWorld(ctx) {
  ctx.state.worldScrollPx = 0;
  const bufferTiles = 4;
  const startTile =
    Math.ceil(ctx.ui.gameArea.clientWidth / ctx.config.tileSize) + bufferTiles;
  ctx.state.nextSpawnTileX = startTile;
  renderTrack(ctx);
}

export function updateWorld(ctx, delta) {
  ctx.state.worldScrollPx +=
    ctx.state.worldScrollSpeedPxPerSec * (delta / 1000);
}
