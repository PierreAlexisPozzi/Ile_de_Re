// Clavier (AZERTY et QWERTY), souris (verrouillage du pointeur, molette).
// Les appuis sont détectés sur front montant : pressed(code) n'est vrai
// qu'une fois par appui, jusqu'à endFrame().

export const keys = {};
const edges = new Set();
const charEdges = new Set();
export const mouse = { dx: 0, dy: 0, wheel: 0, locked: false };

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT') return;
    if (!keys[e.code]) {
      edges.add(e.code);
      if (e.key && e.key.length === 1) charEdges.add(e.key.toLowerCase());
    }
    keys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  canvas.addEventListener('click', () => { if (!mouse.locked && !window.__noPointerLock) canvas.requestPointerLock?.(); });
  document.addEventListener('pointerlockchange', () => { mouse.locked = document.pointerLockElement === canvas; });
  document.addEventListener('mousemove', (e) => {
    if (mouse.locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
  });
  canvas.addEventListener('wheel', (e) => { mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
}

export function pressed(code) { return edges.has(code); }
// raccourcis par caractère (indépendant de la disposition AZERTY / QWERTY)
export function pressedChar(ch) { return charEdges.has(ch); }
export function endFrame() { edges.clear(); charEdges.clear(); }
export const justPressed = pressed;

export function consumeMouseDelta() {
  const d = { dx: mouse.dx, dy: mouse.dy };
  mouse.dx = 0; mouse.dy = 0;
  return d;
}
export function consumeWheel() {
  const w = mouse.wheel;
  mouse.wheel = 0;
  return w;
}

export function moveVector() {
  let fwd = 0, side = 0;
  // codes physiques : ZQSD en AZERTY = WASD en QWERTY
  if (keys.KeyW || keys.ArrowUp) fwd += 1;
  if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyD || keys.ArrowRight) side += 1;
  if (keys.KeyA || keys.ArrowLeft) side -= 1;
  return { fwd, side };
}

export function isRunning() { return !!(keys.ShiftLeft || keys.ShiftRight); }

export function releasePointer() { if (document.pointerLockElement) document.exitPointerLock?.(); }
