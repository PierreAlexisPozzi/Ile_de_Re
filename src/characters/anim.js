// Animation procédurale des personnages : marche/course (flexion des genoux,
// balancier des bras, contre-rotation du buste, rebond des hanches), repos
// (respiration, transfert d'appui, regards), parole (gestes), et actions de
// métier : marteler, ratisser le sel, écrire, porter, prier, guetter, ramer,
// pédaler, nager, s'asseoir, tailler le silex…
//
// Signes : rotation.x > 0 envoie un membre vers l'arrière ; < 0 vers l'avant.
// Bras gauche (+x) : rotation.z > 0 l'écarte du corps ; bras droit : < 0.

const TAU = Math.PI * 2;

function base() {
  return {
    hipsY: 0, hipsX: 0, hipsRx: 0, hipsRy: 0, hipsRz: 0,
    spineRx: 0, spineRy: 0, spineRz: 0,
    headRx: 0, headRy: 0, headRz: 0,
    armLx: -0.04, armLz: 0.11, armRx: -0.04, armRz: -0.11,
    elbowL: -0.22, elbowR: -0.22, handLx: 0, handRx: 0,
    legLx: 0, legLz: -0.03, legRx: 0, legRz: 0.03,
    kneeL: 0.03, kneeR: 0.03, ankleL: 0, ankleR: 0,
    hold: 0,          // inclinaison supplémentaire des objets tenus
  };
}

const ACTIONS = {
  idle(P, t, c) {
    const s = c.seed;
    P.spineRx += Math.sin(t * 1.5) * 0.012;
    P.armLz += Math.sin(t * 1.5) * 0.012;
    P.armRz -= Math.sin(t * 1.5) * 0.012;
    P.hipsRz += Math.sin(t * 0.35 + s) * 0.025;
    P.legLz += Math.max(0, Math.sin(t * 0.35 + s)) * 0.03;
    P.kneeR += Math.max(0, Math.sin(t * 0.35 + s)) * 0.08;
    P.headRy += Math.sin(t * 0.31 + s * 2) * 0.22 * c.curiosity;
    P.headRx += Math.sin(t * 0.23 + s) * 0.05;
    P.headRz += Math.sin(t * 0.19 + s * 3) * 0.04;
    // attitude propre à chacun : bras ballants, poing sur la hanche, bras croisés, mains jointes
    const freeL = !c.propL, freeR = !c.propR;
    switch (c.idleStyle) {
      case 1:
        if (freeR) { P.armRz = -0.62; P.armRx = 0.12; P.elbowR = -1.55; }
        break;
      case 2:
        if (freeL && freeR) {
          P.armLx = -0.42; P.armLz = -0.12; P.elbowL = -1.95;
          P.armRx = -0.48; P.armRz = 0.14; P.elbowR = -1.85;
        }
        break;
      case 3:
        if (freeL && freeR) {
          P.armLx = -0.18; P.armLz = -0.08; P.elbowL = -1.0;
          P.armRx = -0.2; P.armRz = 0.08; P.elbowR = -0.95;
        }
        break;
    }
  },
  talk(P, t, c) {
    ACTIONS.idle(P, t, c);
    const g = Math.max(0, (Math.sin(t * 2.1 + c.seed) + Math.sin(t * 3.4)) * 0.5);
    const g2 = Math.max(0, Math.sin(t * 1.3 + 2));
    P.armRx += -0.3 - 0.35 * g;
    P.armRz += -0.18 * g;
    P.elbowR += -0.75 - 0.45 * g;
    P.armLx += -0.15 * g2;
    P.elbowL += -0.4 * g2;
    P.headRx += Math.sin(t * 4.2) * 0.035;
    P.headRz += Math.sin(t * 1.7) * 0.03;
  },
  wave(P, t) {
    P.armRz = -2.55 + Math.sin(t * 9) * 0.22;
    P.elbowR = -0.35;
    P.headRz = 0.06;
  },
  point(P, t) {
    P.armRx = -1.45;
    P.armRz = -0.12;
    P.elbowR = -0.08;
    P.spineRy = -0.15;
  },
  hammer(P, t) {
    const s = Math.pow((Math.sin(t * 4.5) + 1) / 2, 2);
    P.spineRx = 0.22;
    P.headRx = 0.25;
    P.armRx = -0.7 - 1.3 * s;
    P.armRz = -0.15;
    P.elbowR = -0.5 - 0.8 * s;
    P.armLx = -0.55;
    P.elbowL = -0.95;
    P.legLx = -0.15; P.kneeL = 0.1;
  },
  knap(P, t) {
    // accroupi, taille du silex
    ACTIONS.crouch(P, t);
    const s = Math.pow((Math.sin(t * 6) + 1) / 2, 3);
    P.armRx = -0.8 - 0.7 * s;
    P.elbowR = -0.6 - 0.5 * s;
    P.armLx = -0.95; P.elbowL = -0.7;
  },
  rake(P, t) {
    const cy = Math.sin(t * 1.7);
    P.spineRx = 0.32 + 0.08 * cy;
    P.armLx = -0.55 - 0.3 * cy;
    P.armRx = -0.75 - 0.3 * cy;
    P.elbowL = -0.45; P.elbowR = -0.35;
    P.legLx = -0.25; P.legRx = 0.2;
    P.kneeL = 0.15; P.kneeR = 0.1;
    P.hipsY = -0.02;
    P.hold = 0.9 + 0.25 * cy;
  },
  sweep(P, t) {
    const cy = Math.sin(t * 2.2);
    P.spineRy = cy * 0.3;
    P.spineRx = 0.25;
    P.armLx = -0.55; P.armRx = -0.65;
    P.elbowL = -0.6; P.elbowR = -0.5;
    P.hold = 0.6;
  },
  stir(P, t) {
    P.spineRx = 0.18;
    P.headRx = 0.3;
    P.armRx = -0.7 + Math.sin(t * 3) * 0.15;
    P.elbowR = -1.0 + Math.cos(t * 3) * 0.2;
    P.armLx = -0.6 + Math.sin(t * 3 + 2) * 0.12;
    P.elbowL = -1.0 + Math.cos(t * 3 + 2) * 0.2;
  },
  carry(P, t) {
    P.armLx = -0.35; P.armRx = -0.35;
    P.elbowL = -1.35; P.elbowR = -1.35;
    P.armLz = 0.05; P.armRz = -0.05;
    P.spineRx = -0.06;
  },
  write(P, t) {
    P.spineRx = 0.2;
    P.headRx = 0.42;
    P.armRx = -0.55;
    P.elbowR = -1.25 + Math.sin(t * 7) * 0.05;
    P.armLx = -0.42;
    P.elbowL = -1.3;
  },
  read(P, t) {
    P.headRx = 0.38;
    P.armLx = -0.45; P.armRx = -0.45;
    P.elbowL = -1.4; P.elbowR = -1.4;
    P.armLz = -0.05; P.armRz = 0.05;
  },
  pray(P, t) {
    P.headRx = 0.28;
    P.armLx = -0.32; P.armRx = -0.32;
    P.armLz = -0.32; P.armRz = 0.32;
    P.elbowL = -1.55; P.elbowR = -1.55;
  },
  lookout(P, t) {
    P.armRx = -1.95;
    P.armRz = -0.5;
    P.elbowR = -2.05;
    P.headRy = Math.sin(t * 0.45) * 0.55;
    P.headRx = -0.05;
  },
  guard(P, t, c) {
    P.armRx = -0.18;
    P.elbowR = -0.85;
    P.headRy = Math.sin(t * 0.3 + c.seed) * 0.4;
    P.spineRx = -0.03;
  },
  sit(P, t, c) {
    P.hipsY = -0.42;
    P.legLx = -1.5; P.legRx = -1.5;
    P.kneeL = 1.5; P.kneeR = 1.5;
    P.legLz = 0.08; P.legRz = -0.08;
    P.spineRx = -0.04 + Math.sin(t * 1.4) * 0.01;
    P.armLx = -0.5; P.armRx = -0.5;
    P.elbowL = -0.65; P.elbowR = -0.65;
    P.headRy = Math.sin(t * 0.25 + c.seed) * 0.3;
  },
  crouch(P, t) {
    P.hipsY = -0.5;
    P.legLx = -1.55; P.legRx = -1.25;
    P.kneeL = 2.2; P.kneeR = 2.0;
    P.spineRx = 0.45;
    P.headRx = 0.1;
    P.armLx = -0.9; P.armRx = -0.9;
    P.elbowL = -0.5; P.elbowR = -0.5;
  },
  inspect(P, t) {
    ACTIONS.crouch(P, t);
    P.armRx = -1.0 + Math.sin(t * 1.3) * 0.1;
  },
  cheer(P, t) {
    const b = Math.abs(Math.sin(t * 4));
    P.hipsY = b * 0.06;
    P.armLz = 2.5; P.armRz = -2.5;
    P.elbowL = -0.3; P.elbowR = -0.3;
  },
  play(P, t) {
    const b = Math.abs(Math.sin(t * 5));
    P.hipsY = b * 0.12;
    P.kneeL = 0.3 * (1 - b); P.kneeR = 0.3 * (1 - b);
    P.armLz = 0.5 + b * 1.4; P.armRz = -0.5 - b * 1.4;
  },
  fish(P, t) {
    P.armRx = -1.05 + Math.sin(t * 0.8) * 0.05;
    P.elbowR = -0.45;
    P.armLx = -0.85;
    P.elbowL = -0.75;
    P.spineRx = 0.05;
  },
  drink(P, t) {
    const r = Math.max(0, Math.sin(t * 0.8)) ** 3;
    P.armRx = -0.35 - 0.6 * r;
    P.elbowR = -1.0 - 1.0 * r;
    P.headRx = -0.25 * r;
  },
  dance(P, t) {
    const b = Math.sin(t * 5);
    P.hipsY = Math.abs(b) * 0.05;
    P.hipsRy = b * 0.25;
    P.armLz = 1.1; P.armRz = -1.1;
    P.elbowL = -1.2; P.elbowR = -1.2;
    P.legLx = b * 0.3; P.legRx = -b * 0.3;
  },
  pedal(P, t, c) {
    const ph = c.pedalPhase;
    P.legLx = -0.95 - 0.35 * Math.sin(ph);
    P.kneeL = 1.1 + 0.5 * Math.sin(ph);
    P.legRx = -0.95 + 0.35 * Math.sin(ph);
    P.kneeR = 1.1 - 0.5 * Math.sin(ph);
    P.armLx = -1.05; P.armRx = -1.05;
    P.elbowL = -0.35; P.elbowR = -0.35;
    P.spineRx = 0.38;
    P.headRx = -0.32;
  },
  row(P, t) {
    ACTIONS.sit(P, t, { seed: 0 });
    const s = Math.sin(t * 2.2);
    P.armLx = -0.95 - 0.5 * s; P.armRx = -0.95 - 0.5 * s;
    P.elbowL = -0.4 - 0.7 * (1 + Math.cos(t * 2.2)) / 2;
    P.elbowR = P.elbowL;
    P.spineRx = 0.08 - 0.25 * s;
    P.headRy = 0;
  },
  swim(P, t, c) {
    const moving = c.speed > 0.4;
    P.hipsY = -0.72;
    P.hipsRx = moving ? 1.35 : 0.35;
    P.headRx = moving ? -1.0 : -0.3;
    if (moving) {
      const a = (t * 3.4) % TAU;
      P.armLx = -a; P.armRx = -((a + Math.PI) % TAU);
      P.elbowL = -0.3; P.elbowR = -0.3;
      P.legLx = Math.sin(t * 9) * 0.28; P.legRx = -Math.sin(t * 9) * 0.28;
    } else {
      P.armLz = 0.9 + Math.sin(t * 2) * 0.2; P.armRz = -0.9 - Math.sin(t * 2) * 0.2;
      P.elbowL = -0.6; P.elbowR = -0.6;
      P.legLx = Math.sin(t * 2) * 0.3; P.legRx = -Math.sin(t * 2) * 0.3;
      P.kneeL = 0.4; P.kneeR = 0.4;
    }
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS);

// ----------------------------------------------------------------------
//  Marche et course d'après les courbes de la biomécanique (angles en
//  degrés sur un cycle de pas double, phase 0 = attaque du talon) :
//  flexion de hanche, flexion du genou (amorti à l'appui, grande flexion
//  pendant l'oscillation), cheville (pied à plat, talon qui décolle,
//  poussée des orteils, pointe relevée pendant l'oscillation).
// ----------------------------------------------------------------------
const WALK_HIP = [[0, 27], [0.12, 24], [0.3, 6], [0.5, -13], [0.6, -6], [0.75, 22], [0.88, 30], [1, 27]];
const WALK_KNEE = [[0, 4], [0.12, 16], [0.3, 6], [0.45, 5], [0.6, 38], [0.71, 58], [0.84, 30], [0.95, 4], [1, 4]];
const WALK_ANKLE = [[0, -2], [0.08, -8], [0.28, 5], [0.46, 10], [0.6, -14], [0.66, -16], [0.78, -2], [0.9, 2], [1, -2]];
const RUN_HIP = [[0, 38], [0.15, 24], [0.35, -14], [0.45, -16], [0.6, 18], [0.82, 52], [1, 38]];
const RUN_KNEE = [[0, 22], [0.14, 40], [0.33, 22], [0.45, 30], [0.63, 98], [0.8, 92], [0.94, 38], [1, 22]];
const RUN_ANKLE = [[0, 4], [0.14, 16], [0.36, -22], [0.46, -24], [0.62, 2], [0.82, 6], [1, 4]];
const D2R = Math.PI / 180;

// courbe périodique lissée (Catmull-Rom) échantillonnée en phase φ ∈ [0, 1)
function curve(keys, ph) {
  const n = keys.length - 1;
  let i = 0;
  while (i < n - 1 && keys[i + 1][0] <= ph) i++;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i], k2 = keys[i + 1], k3 = keys[(i + 2) % n === 0 ? 1 : (i + 2) % n];
  const t = (ph - k1[0]) / (k2[0] - k1[0]);
  const p0 = k0[1], p1 = k1[1], p2 = k2[1], p3 = k3[1];
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Longueur d'une foulée (deux pas) pour la vitesse donnée, en mètres
export function strideLength(c, speed) {
  const leg = (c.legLen ?? 0.9) * (c.scale ?? 1);
  const run = Math.min(1, Math.max(0, (speed - 2.6) / 1.2));
  const k = Math.min(1.35, Math.max(0.4, speed / 1.5));
  const walk = leg * (1.05 + 0.55 * k);          // ~1,45 m à 1,4 m/s pour 0,9 m de jambe
  const runL = leg * (1.9 + 0.35 * Math.min(1.5, speed / 4.5));
  return walk + (runL - walk) * run;
}

// Superpose la locomotion. ph : phase du cycle (0..1) de la jambe gauche,
// amp : 0 à l'arrêt, 1 en marche établie ; speed en m/s
function locomotion(P, ph, amp, speed, c) {
  if (amp <= 0.001) return;
  const run = Math.min(1, Math.max(0, (speed - 2.6) / 1.2));
  const k = Math.min(1.3, Math.max(0.4, speed / 1.5)) * (c.longSkirt ? 0.75 : 1);
  const TAU2 = Math.PI * 2;
  const leg = (phase) => {
    const w = (keys) => curve(keys, phase);
    const hip = w(WALK_HIP) * k + (w(RUN_HIP) - w(WALK_HIP) * k) * run;
    const knee = w(WALK_KNEE) * (0.55 + 0.45 * k) + (w(RUN_KNEE) - w(WALK_KNEE) * (0.55 + 0.45 * k)) * run;
    const ankle = w(WALK_ANKLE) * (0.6 + 0.4 * k) + (w(RUN_ANKLE) - w(WALK_ANKLE) * (0.6 + 0.4 * k)) * run;
    return { hip: hip * D2R, knee: knee * D2R, ankle: ankle * D2R };
  };
  const L = leg(ph), R = leg((ph + 0.5) % 1);
  // jambes : flexion de hanche vers l'avant = rotation.x négative
  P.legLx += (-L.hip - P.legLx) * amp; P.legRx += (-R.hip - P.legRx) * amp;
  P.kneeL += (L.knee - P.kneeL) * amp; P.kneeR += (R.knee - P.kneeR) * amp;
  // cheville : flexion dorsale (pointe relevée) = rotation.x négative
  P.ankleL += (-L.ankle - P.ankleL) * amp; P.ankleR += (-R.ankle - P.ankleR) * amp;
  // pieds presque sur une ligne (pas de dandinement)
  P.legLz += (-0.035 - P.legLz) * amp; P.legRz += (0.035 - P.legRz) * amp;
  const c1 = Math.cos(TAU2 * ph), s1 = Math.sin(TAU2 * ph);
  // bassin : rotation vers la jambe qui avance, léger abaissement côté oscillant,
  // transfert du poids sur la jambe d'appui
  P.hipsRy += -0.075 * k * c1 * amp * (1 - 0.3 * run);
  P.hipsRz += 0.04 * k * s1 * amp * (1 - 0.5 * run);
  P.hipsX += 0.012 * s1 * amp * (1 - run);
  // buste : contre-rotation des épaules, léger penchement en avant ; tête stable
  P.spineRy += 0.1 * k * c1 * amp * (1 + 0.6 * run);
  P.spineRz += -0.03 * k * s1 * amp;
  P.spineRx += (0.04 + 0.14 * run) * amp;
  P.headRx -= (0.03 + 0.1 * run) * amp;
  P.headRy -= 0.02 * k * c1 * amp;
  // bras : balancement opposé aux jambes, coude plus fléchi vers l'avant
  const ab = (0.28 * k + 0.35 * run) * amp;
  const lag = Math.cos(TAU2 * ph - 0.35);
  P.armLx += lag * ab * (c.armsBusy ? 0.15 : 1);
  P.armRx += -lag * ab * (c.armsBusyR ? 0.15 : 1);
  P.armLz += 0.04 * amp; P.armRz -= 0.04 * amp;
  const elbowWalk = 0.22 + 0.3 * k;
  const fwdL = Math.max(0, -lag), fwdR = Math.max(0, lag);
  P.elbowL += -((elbowWalk + 0.35 * fwdL * k) * (1 - run) + (1.35 + 0.2 * fwdL) * run - 0.22) * amp;
  P.elbowR += -((elbowWalk + 0.35 * fwdR * k) * (1 - run) + (1.35 + 0.2 * fwdR) * run - 0.22) * amp;
}

const KEYS = Object.keys(base());

// Calcule et applique la pose d'un personnage (voir rig.js : Character).
export function animate(c, dt) {
  dt = Math.max(0, dt);            // un pas négatif ferait diverger le lissage
  if (!c.pose) c.pose = base();
  c.t += dt;
  const t = c.t;
  const P = base();
  const action = ACTIONS[c.action] || ACTIONS.idle;
  const locoOk = !['sit', 'row', 'pedal', 'swim', 'crouch', 'knap', 'inspect'].includes(c.action);

  // Phase du cycle liée à la vitesse réelle et à la longueur de foulée :
  // les pieds ne glissent pas sur le sol
  const speed = c.speed;
  const amp = locoOk ? Math.min(1, speed / 0.9) : 0;
  if (speed > 0.05) c.gaitPhase = (c.gaitPhase + dt * speed / strideLength(c, speed)) % 1;
  c.pedalPhase += dt * Math.max(0, speed) * 1.6;

  if (amp < 0.25 || !locoOk) action(P, t, c);
  else if (c.action === 'carry' || c.action === 'guard') action(P, t, c);
  // au repos : pieds à plat (compense la chaîne cuisse + genou)
  if (locoOk) {
    P.ankleL += -(P.legLx + P.kneeL);
    P.ankleR += -(P.legRx + P.kneeR);
  }
  locomotion(P, c.gaitPhase, amp, speed, c);

  // Regard vers une cible (joueur, interlocuteur)
  if (c.look) {
    P.headRy += c.look.yaw;
    P.headRx += c.look.pitch;
  }
  P.headRy = Math.max(-1.1, Math.min(1.1, P.headRy));

  // Lissage vers la pose cible (transitions sans à-coups)
  // (plus vif en mouvement : le lissage ne doit pas écraser le cycle de marche)
  const k = 1 - Math.exp(-dt * (12 + 40 * amp));
  const cur = c.pose;
  for (const key of KEYS) cur[key] += (P[key] - cur[key]) * k;

  const j = c.j;
  // hauteur du bassin : la jambe la plus tendue touche le sol (rebond naturel)
  let hipsY = cur.hipsY;
  if (locoOk && c.legL1) {
    const reach = (a, k) => c.legL1 * Math.cos(a) + c.legL2 * Math.cos(a + k);
    const hL = reach(cur.legLx + cur.hipsRx, cur.kneeL), hR = reach(cur.legRx + cur.hipsRx, cur.kneeR);
    hipsY += Math.max(hL, hR) - (c.legL1 + c.legL2);
  }
  j.hips.position.y = c.hipBase + hipsY;
  j.hips.position.x = cur.hipsX;
  j.hips.rotation.set(cur.hipsRx, cur.hipsRy, cur.hipsRz);
  j.spine.rotation.set(cur.spineRx + c.stoop, cur.spineRy, cur.spineRz);
  j.head.rotation.set(cur.headRx + c.stoop * 0.6, cur.headRy, cur.headRz);
  j.armL.rotation.set(cur.armLx, 0, cur.armLz);
  j.armR.rotation.set(cur.armRx, 0, cur.armRz);
  j.elbowL.rotation.x = cur.elbowL;
  j.elbowR.rotation.x = cur.elbowR;
  j.legL.rotation.set(cur.legLx, 0, cur.legLz);
  j.legR.rotation.set(cur.legRx, 0, cur.legRz);
  j.kneeL.rotation.x = cur.kneeL;
  j.kneeR.rotation.x = cur.kneeR;
  j.ankleL.rotation.x = cur.ankleL;
  j.ankleR.rotation.x = cur.ankleR;

  // Objets tenus à la verticale (hampes) : compense l'inclinaison du bras
  for (const [hand, armX, armZ, elbow, side] of [
    [j.handR, cur.armRx, cur.armRz, cur.elbowR, 'R'],
    [j.handL, cur.armLx, cur.armLz, cur.elbowL, 'L'],
  ]) {
    const prop = side === 'R' ? c.propR : c.propL;
    if (prop?.userData.vertical) {
      hand.rotation.x = -(armX + elbow + cur.spineRx + c.stoop + cur.hipsRx) + (side === 'R' ? cur.hold : 0);
      hand.rotation.z = -armZ;
    } else {
      hand.rotation.x = 0;
      hand.rotation.z = 0;
    }
  }

  // Jupes et pans d'habit : balancement suivant les jambes
  if (j.skirt) {
    j.skirt.rotation.x = -(cur.legLx + cur.legRx) * 0.25;
    j.skirt.rotation.z = (cur.legLx - cur.legRx) * 0.04;
  }
  if (j.cape) j.cape.rotation.x = 0.06 + Math.min(0.5, speed * 0.05) + Math.sin(t * 2.3) * 0.015;
}
