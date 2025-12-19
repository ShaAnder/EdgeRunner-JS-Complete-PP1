/**
 * obstacles.js
 * Obstacle spawning + movement + collisions.
 *
 * Obstacles are aligned to the same tile grid as the track.
 */

import { randomIntBetween, clamp } from './utils.js';
import { computeRotationGroundLift } from './runner.js';

export function updateObstacles(ctx, delta, onScore) {
  const tileSize = ctx.config.tileSize;
  const bufferPx = tileSize * 6;
  const rightEdgeWorldPx =
    ctx.state.worldScrollPx + ctx.ui.gameArea.clientWidth + bufferPx;
  const rightEdgeTile = Math.ceil(rightEdgeWorldPx / tileSize);

  while (ctx.state.nextSpawnTileX <= rightEdgeTile) {
    spawnRandomObstacleAtTileX(ctx, ctx.state.nextSpawnTileX);

    // Always keep exactly N empty tiles between any two obstacles.
    ctx.state.nextSpawnTileX += 1 + ctx.config.obstacleGapTiles;
  }

  const runnerBaseLeft = parseFloat(getComputedStyle(ctx.ui.runner).left) || 0;
  const runnerLeft = runnerBaseLeft + ctx.state.runner.x;

  const offscreenX = -tileSize * 4;
  for (let index = ctx.state.obstacles.length - 1; index >= 0; index--) {
    const obstacle = ctx.state.obstacles[index];
    const screenX = obstacle.tileX * tileSize - ctx.state.worldScrollPx;

    obstacle.screenX = screenX;
    obstacle.el.style.left = `${screenX}px`;

    if (!obstacle.scored && screenX + tileSize < runnerLeft) {
      obstacle.scored = true;
      onScore(ctx, 1);
    }

    if (screenX < offscreenX) {
      obstacle.el.remove();
      ctx.state.obstacles.splice(index, 1);
    }
  }
}

export function clearObstacles(ctx) {
  for (const obstacle of ctx.state.obstacles) {
    obstacle.el.remove();
  }
  ctx.state.obstacles = [];
}

function computeObstacleScreenX(ctx, tileX) {
  return tileX * ctx.config.tileSize - ctx.state.worldScrollPx;
}

function createObstacleShell(ctx, tileX, heightPx, bottomPx) {
  const obstacle = document.createElement('div');
  obstacle.className = 'obstacle';
  obstacle.setAttribute('aria-hidden', 'true');
  obstacle.style.width = `${ctx.runnerWidth}px`;
  obstacle.style.height = `${heightPx}px`;
  obstacle.style.bottom = `${bottomPx}px`;

  ctx.ui.gameArea.appendChild(obstacle);

  const screenX = computeObstacleScreenX(ctx, tileX);
  obstacle.style.left = `${screenX}px`;

  return { obstacle, screenX };
}

function addObstacleBase(ctx, obstacle, className, heightPx, bottomPx) {
  const base = document.createElement('div');
  base.className = className;
  base.style.width = `${ctx.runnerWidth}px`;
  base.style.height = `${heightPx}px`;
  base.style.bottom = `${bottomPx}px`;
  obstacle.appendChild(base);
  return base;
}

function createSpikeSvg(direction = 'up') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.dataset.dir = direction;

  const poly = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polygon'
  );
  poly.setAttribute(
    'points',
    direction === 'down' ? '0,0 100,0 50,100' : '50,0 100,100 0,100'
  );

  svg.appendChild(poly);
  return svg;
}

function addObstacleSpike(ctx, obstacle, direction, heightPx, bottomPx) {
  const spike = createSpikeSvg(direction);
  spike.classList.add('obstacle__spike');
  spike.style.width = `${ctx.runnerWidth}px`;
  spike.style.height = `${heightPx}px`;
  spike.style.bottom = `${bottomPx}px`;
  obstacle.appendChild(spike);
  return spike;
}

function registerObstacle(
  ctx,
  { el, tileX, tileY, variant, blocks, spikes, bases, screenX }
) {
  ctx.state.obstacles.push({
    el,
    tileX,
    tileY,
    variant,
    blocks,
    spikes,
    bases,
    scored: false,
    screenX,
  });
}

function spawnGroundObstacle(ctx, tileX, tileY, blocks) {
  const heightPx = ctx.runnerHeight * blocks;
  const bottomPx = ctx.config.tileSize + tileY * ctx.config.tileSize;
  const { obstacle, screenX } = createObstacleShell(
    ctx,
    tileX,
    heightPx,
    bottomPx
  );

  const spikes = [];
  const bases = [];

  if (blocks === 2) {
    bases.push(
      addObstacleBase(ctx, obstacle, 'obstacle__block', ctx.runnerHeight, 0)
    );
    spikes.push(
      addObstacleSpike(ctx, obstacle, 'up', ctx.runnerHeight, ctx.runnerHeight)
    );
  } else {
    spikes.push(addObstacleSpike(ctx, obstacle, 'up', ctx.runnerHeight, 0));
  }

  registerObstacle(ctx, {
    el: obstacle,
    tileX,
    tileY,
    variant: `ground-${blocks}`,
    blocks,
    spikes,
    bases,
    screenX,
  });
}

function spawnCeilingObstacle(ctx, tileX, spikeTipRow) {
  const heightPx = ctx.config.tileSize * 2;
  const bottomPx = ctx.config.tileSize + spikeTipRow * ctx.config.tileSize;
  const { obstacle, screenX } = createObstacleShell(
    ctx,
    tileX,
    heightPx,
    bottomPx
  );

  const spikes = [];
  const bases = [];

  bases.push(
    addObstacleBase(
      ctx,
      obstacle,
      'obstacle__bar',
      ctx.config.tileSize,
      ctx.config.tileSize
    )
  );
  spikes.push(addObstacleSpike(ctx, obstacle, 'down', ctx.config.tileSize, 0));

  registerObstacle(ctx, {
    el: obstacle,
    tileX,
    tileY: spikeTipRow,
    variant: 'ceiling',
    blocks: 2,
    spikes,
    bases,
    screenX,
  });
}

function spawnRandomObstacleAtTileX(ctx, tileX) {
  const spawnCeiling = Math.random() < ctx.config.ceilingObstacleChance;

  if (spawnCeiling) {
    const [minRow, maxRow] = ctx.config.ceilingSpikeTipRows;
    const maxSafeRow = Math.max(
      0,
      Math.floor(ctx.config.ceilingMaxOffsetPx / ctx.config.tileSize)
    );
    const upper = Math.min(maxRow, maxSafeRow);
    const lower = Math.min(minRow, upper);
    const tipRow = randomIntBetween(lower, upper);
    spawnCeilingObstacle(ctx, tileX, tipRow);
    return;
  }

  const blocks = Math.random() < 0.35 ? 2 : 1;
  spawnGroundObstacle(ctx, tileX, 0, blocks);
}

function rectsOverlap(a, b) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function polygonAxes(poly) {
  const axes = [];
  for (let index = 0; index < poly.length; index++) {
    const next = (index + 1) % poly.length;
    const edge = {
      x: poly[next].x - poly[index].x,
      y: poly[next].y - poly[index].y,
    };
    const normal = { x: -edge.y, y: edge.x };
    const length = Math.hypot(normal.x, normal.y) || 1;
    axes.push({ x: normal.x / length, y: normal.y / length });
  }
  return axes;
}

function projectPolygon(poly, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of poly) {
    const projected = dot(point, axis);
    if (projected < min) min = projected;
    if (projected > max) max = projected;
  }
  return { min, max };
}

function polygonsOverlapSAT(polyA, polyB, minOverlap = 0) {
  const axes = [...polygonAxes(polyA), ...polygonAxes(polyB)];
  for (const axis of axes) {
    const a = projectPolygon(polyA, axis);
    const b = projectPolygon(polyB, axis);
    const overlap = Math.min(a.max, b.max) - Math.max(a.min, b.min);
    if (overlap <= minOverlap) return false;
  }
  return true;
}

function runnerPolygonViewport(ctx) {
  const gameRect = ctx.ui.gameArea.getBoundingClientRect();
  const runnerStyles = getComputedStyle(ctx.ui.runner);
  const baseLeft = parseFloat(runnerStyles.left) || 0;
  const baseBottom = parseFloat(runnerStyles.bottom) || 0;

  const grounded = ctx.state.runner.y === 0;
  const rotationDeg = grounded ? 0 : ctx.state.runner.rotation;
  const lift = grounded ? 0 : computeRotationGroundLift(ctx, rotationDeg);

  const bottomFromBottom = baseBottom + ctx.state.runner.y + lift;
  const runnerBottomY = gameRect.bottom - bottomFromBottom;
  const runnerLeftX = gameRect.left + baseLeft + ctx.state.runner.x;

  const origin = {
    x: runnerLeftX + ctx.runnerWidth / 2,
    y: runnerBottomY,
  };

  const angle = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const halfW = ctx.runnerWidth / 2;
  const h = ctx.runnerHeight;
  const local = [
    { x: -halfW, y: -h },
    { x: halfW, y: -h },
    { x: halfW, y: 0 },
    { x: -halfW, y: 0 },
  ];

  return local.map(p => ({
    x: origin.x + p.x * cos - p.y * sin,
    y: origin.y + p.x * sin + p.y * cos,
  }));
}

function spikeTriangleFromRect(rect, direction = 'up') {
  if (direction === 'down') {
    return [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.left + rect.width / 2, y: rect.bottom },
    ];
  }

  return [
    { x: rect.left + rect.width / 2, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];
}

function rectPolygonFromRect(rect) {
  return [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];
}

export function checkObstacleCollisions(ctx, onCrash) {
  if (!ctx.state.running || ctx.state.obstacles.length === 0) return;

  const runnerPoly = runnerPolygonViewport(ctx);
  const runnerAabb = ctx.ui.runner.getBoundingClientRect();

  for (const obstacle of ctx.state.obstacles) {
    const obstacleRect = obstacle.el.getBoundingClientRect();
    if (!rectsOverlap(runnerAabb, obstacleRect)) continue;

    const bases =
      obstacle.bases ??
      obstacle.el.querySelectorAll('.obstacle__block, .obstacle__bar');
    for (const base of bases) {
      const baseRect = base.getBoundingClientRect();
      if (!rectsOverlap(runnerAabb, baseRect)) continue;

      const rectPoly = rectPolygonFromRect(baseRect);
      if (
        polygonsOverlapSAT(runnerPoly, rectPoly, ctx.config.collisionMinOverlap)
      ) {
        onCrash('crashed');
        return;
      }
    }

    const spikes =
      obstacle.spikes ?? obstacle.el.querySelectorAll('.obstacle__spike');
    for (const spike of spikes) {
      const spikeRect = spike.getBoundingClientRect();
      if (!rectsOverlap(runnerAabb, spikeRect)) continue;

      const direction = spike.dataset?.dir || 'up';
      const tri = spikeTriangleFromRect(spikeRect, direction);

      if (polygonsOverlapSAT(runnerPoly, tri, ctx.config.collisionMinOverlap)) {
        onCrash('crashed');
        return;
      }
    }
  }
}
