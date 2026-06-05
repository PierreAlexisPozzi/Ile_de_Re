// Gestion des entrées clavier / souris.

export const keys = {};
export const mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  canvas.addEventListener('click', () => {
    if (!mouse.locked) canvas.requestPointerLock?.();
  });

  document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (e) => {
    if (mouse.locked) {
      mouse.dx += e.movementX;
      mouse.dy += e.movementY;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
}

export function consumeMouseDelta() {
  const dx = mouse.dx, dy = mouse.dy;
  mouse.dx = 0; mouse.dy = 0;
  return { dx, dy };
}

// "Just pressed" detection
const justPressedTracker = {};
export function justPressed(code) {
  const pressed = !!keys[code];
  const was = !!justPressedTracker[code];
  justPressedTracker[code] = pressed;
  return pressed && !was;
}

export function isMoving() {
  return (
    keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp'] ||
    keys['KeyS'] || keys['ArrowDown'] ||
    keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft'] ||
    keys['KeyD'] || keys['ArrowRight']
  );
}

export function moveVector() {
  let fwd = 0, side = 0;
  if (keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp']) fwd += 1;
  if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) side += 1;
  if (keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft']) side -= 1;
  return { fwd, side };
}

export function isRunning() {
  return !!(keys['ShiftLeft'] || keys['ShiftRight']);
}

export function isJumping() {
  return !!keys['Space'];
}
