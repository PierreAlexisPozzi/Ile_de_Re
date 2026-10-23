#!/usr/bin/env python3
"""Génère les corps humains du jeu à partir de MakeHuman (CC0).

Entrée : un clone du dépôt makehumancommunity/makehuman (données « hm08 » :
maillage de base, cibles de morphologie, squelette et poids, yeux).
Sortie : assets/humans/humans.bin + humans.json, chargés par
src/characters/human.js.

Contenu :
  - topologie commune (triangles, UV) du corps, des cils, des dents ;
  - par morphologie (sexe x âge x carrure) : positions des sommets, centres
    des articulations de notre squelette (17 os + mâchoire, paupières, yeux) ;
  - poids de peau ramenés de 163 os MakeHuman à nos os ;
  - occlusion ambiante cuite par sommet ;
  - coordonnées « de membre » par sommet (partie du corps, abscisse le long
    du membre) pour découper les vêtements ajustés à l'exécution ;
  - masques de visage (lèvres, sourcils, barbe, joues, paupières, cuir
    chevelu) peints dans l'espace UV, pour composer la peau.

Usage : python3 dev/tools/gen_humans.py /chemin/vers/makehuman/makehuman
"""

import json
import math
import os
import struct
import sys
import zlib

import numpy as np

MH = sys.argv[1] if len(sys.argv) > 1 else '/home/user/makehumancommunity/makehuman/makehuman'
DATA = os.path.join(MH, 'data')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'humans')
SCALE = 0.1  # MakeHuman travaille en décimètres

# ---------------------------------------------------------------------------
#  Maillage de base
# ---------------------------------------------------------------------------
def load_obj(path):
    V, VT, faces = [], [], []
    group = None
    for line in open(path):
        if line.startswith('v '):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split()[1]
        elif line.startswith('f '):
            idx = []
            for t in line.split()[1:]:
                p = t.split('/')
                idx.append((int(p[0]) - 1, int(p[1]) - 1 if len(p) > 1 and p[1] else -1))
            faces.append((group, idx))
    return np.array(V, dtype=np.float64), np.array(VT, dtype=np.float64), faces


V0, VT, FACES = load_obj(os.path.join(DATA, '3dobjs', 'base.obj'))
NV = len(V0)
GROUP_VERTS = {}
for g, idx in FACES:
    GROUP_VERTS.setdefault(g, set()).update(i for i, _ in idx)

# ---------------------------------------------------------------------------
#  Cibles de morphologie (modificateurs « macro » de MakeHuman)
# ---------------------------------------------------------------------------
_tcache = {}
def target(rel):
    if rel in _tcache:
        return _tcache[rel]
    path = os.path.join(DATA, 'targets', rel)
    if not os.path.exists(path):
        _tcache[rel] = None
        return None
    idx, d = [], []
    for line in open(path):
        if not line.strip() or line[0] == '#':
            continue
        p = line.split()
        idx.append(int(p[0]))
        d.append([float(p[1]), float(p[2]), float(p[3])])
    t = (np.array(idx, dtype=np.int64), np.array(d, dtype=np.float64)) if idx else None
    _tcache[rel] = t
    return t


def three_way(v, lo, mid, hi):
    """Poids des cibles min / moyenne / max pour un réglage 0..1."""
    if v < 0.5:
        return {lo: 1 - v * 2, mid: v * 2, hi: 0.0}
    return {lo: 0.0, mid: 2 - v * 2, hi: v * 2 - 1}


def morph(gender, age, muscle, weight, height=0.5, proportions=0.5, race=None):
    race = race or {'caucasian': 1.0}
    G = {'female': 1 - gender, 'male': gender}
    if age < 0.5:
        young = max(0.0, (age - 0.1875) * 3.2)
        baby = max(0.0, 1 - age * 5.333)
        child = max(0.0, min(1.0, 5.333 * age) - young)
        A = {'baby': baby, 'child': child, 'young': young, 'old': 0.0}
    else:
        old = max(0.0, age * 2 - 1)
        A = {'baby': 0.0, 'child': 0.0, 'young': 1 - old, 'old': old}
    M = three_way(muscle, 'minmuscle', 'averagemuscle', 'maxmuscle')
    W = three_way(weight, 'minweight', 'averageweight', 'maxweight')
    H = {'minheight': max(0.0, 1 - height * 2), 'maxheight': max(0.0, height * 2 - 1)}
    P = {'uncommonproportions': max(0.0, 1 - proportions * 2), 'idealproportions': max(0.0, proportions * 2 - 1)}
    pos = V0.copy()

    def add(rel, w):
        if w <= 1e-6:
            return
        t = target(rel)
        if t is None:
            return
        pos[t[0]] += t[1] * w

    for g, gw in G.items():
        for a, aw in A.items():
            for r, rw in race.items():
                add(f'macrodetails/{r}-{g}-{a}.target', rw * gw * aw)
            for m, mw in M.items():
                for w, ww in W.items():
                    base = gw * aw * mw * ww
                    add(f'macrodetails/universal-{g}-{a}-{m}-{w}.target', base)
                    for h, hw in H.items():
                        add(f'macrodetails/height/{g}-{a}-{m}-{w}-{h}.target', base * hw)
                    for p, pw in P.items():
                        add(f'macrodetails/proportions/{g}-{a}-{m}-{w}-{p}.target', base * pw)
    return pos


# Morphologies : sexe, âge, carrure (gender, age, muscle, weight, proportions)
VARIANTS = {
    'm-adult-normal': dict(gender=1.0, age=0.5, muscle=0.62, weight=0.5, proportions=0.8),
    'm-adult-stout': dict(gender=1.0, age=0.55, muscle=0.55, weight=0.88, proportions=0.6),
    'm-adult-slim': dict(gender=1.0, age=0.5, muscle=0.5, weight=0.22, proportions=0.75),
    'f-adult-normal': dict(gender=0.0, age=0.5, muscle=0.5, weight=0.48, proportions=0.85),
    'f-adult-stout': dict(gender=0.0, age=0.55, muscle=0.5, weight=0.85, proportions=0.6),
    'f-adult-slim': dict(gender=0.0, age=0.5, muscle=0.45, weight=0.2, proportions=0.8),
    'm-old-normal': dict(gender=1.0, age=0.86, muscle=0.45, weight=0.55, proportions=0.5),
    'm-old-stout': dict(gender=1.0, age=0.86, muscle=0.45, weight=0.85, proportions=0.45),
    'f-old-normal': dict(gender=0.0, age=0.86, muscle=0.4, weight=0.55, proportions=0.5),
    'f-old-stout': dict(gender=0.0, age=0.86, muscle=0.4, weight=0.85, proportions=0.45),
    'm-child-normal': dict(gender=1.0, age=0.2, muscle=0.5, weight=0.45, proportions=0.5),
    'f-child-normal': dict(gender=0.0, age=0.2, muscle=0.5, weight=0.45, proportions=0.5),
}

# ---------------------------------------------------------------------------
#  Squelette : centres d'articulations et poids
# ---------------------------------------------------------------------------
SKEL = json.load(open(os.path.join(DATA, 'rigs', 'default.mhskel')))
MHW = json.load(open(os.path.join(DATA, 'rigs', 'default_weights.mhw')))['weights']


def joint(pos, name):
    return pos[SKEL['joints'][name]].mean(axis=0)


def bone_head(pos, bone):
    return joint(pos, SKEL['bones'][bone]['head'])


def bone_tail(pos, bone):
    return joint(pos, SKEL['bones'][bone]['tail'])


# ---------------------------------------------------------------------------
#  Main détendue : doigts légèrement fléchis vers la paume (la pose de base
#  de MakeHuman a les doigts tendus et écartés, d'où des mains « nageoires »)
# ---------------------------------------------------------------------------
CURL = {  # flexion (degrés) des articulations MCP, IPP, IPD de chaque doigt
    2: (18, 28, 14), 3: (22, 32, 16), 4: (26, 36, 18), 5: (30, 40, 20),
}
THUMB = (8, 14, 14)


def rot_about(axis, ang, center):
    a = axis / np.linalg.norm(axis)
    c, s_ = math.cos(ang), math.sin(ang)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    R = np.eye(3) + s_ * K + (1 - c) * K @ K
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = center - R @ center
    return M


def relax_hands(pos):
    out = pos.copy()
    for side in ('L', 'R'):
        W0 = bone_head(pos, 'wrist.' + side)
        idx = bone_head(pos, 'finger2-1.' + side)
        pk = bone_head(pos, 'finger5-1.' + side)
        palm = np.cross(idx - W0, pk - W0)
        palm /= np.linalg.norm(palm)
        if side == 'L':
            palm = -palm
        mats = {}
        chains = [(f, CURL[f]) for f in CURL] + [(1, THUMB)]
        for f, angs in chains:
            M = np.eye(4)
            for k, ang in enumerate(angs, start=1):
                b = f'finger{f}-{k}.{side}'
                h, t = bone_head(pos, b), bone_tail(pos, b)
                axis = np.cross(t - h, palm)
                if np.linalg.norm(axis) < 1e-9:
                    mats[b] = M
                    continue
                M = M @ rot_about(axis, math.radians(ang), h)
                mats[b] = M
        acc = np.zeros_like(pos)
        wsum = np.zeros(len(pos))
        for b, M in mats.items():
            for vi, w in MHW.get(b, []):
                p4 = np.append(pos[vi], 1.0)
                acc[vi] += w * (M @ p4)[:3]
                wsum[vi] += w
        m = wsum > 0
        out[m] = acc[m] + (1 - wsum[m])[:, None] * pos[m]
    return out


# nos os -> (os MakeHuman dont la tête donne le pivot)
OUR_JOINTS = {
    'hips': 'root', 'spine': 'spine03', 'chest': 'spine01', 'neck': 'neck01', 'head': 'head',
    'armL': 'upperarm01.L', 'elbowL': 'lowerarm01.L', 'handL': 'wrist.L',
    'armR': 'upperarm01.R', 'elbowR': 'lowerarm01.R', 'handR': 'wrist.R',
    'legL': 'upperleg01.L', 'kneeL': 'lowerleg01.L', 'ankleL': 'foot.L',
    'legR': 'upperleg01.R', 'kneeR': 'lowerleg01.R', 'ankleR': 'foot.R',
    'jaw': 'jaw', 'lidL': 'orbicularis03.L', 'lidR': 'orbicularis03.R', 'lidLoL': 'orbicularis04.L', 'lidLoR': 'orbicularis04.R',
}
BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'elbowL', 'handL', 'armR', 'elbowR', 'handR',
         'legL', 'kneeL', 'ankleL', 'legR', 'kneeR', 'ankleR', 'jaw', 'lidL', 'lidR', 'lidLoL', 'lidLoR']
BI = {b: i for i, b in enumerate(BONES)}


def map_bone(mh):
    side = mh[-1] if mh.endswith('.L') or mh.endswith('.R') else ''
    n = mh[:-2] if side else mh
    if n in ('root', 'pelvis', 'spine05', 'spine04'):
        return 'hips'
    if n in ('spine03', 'spine02'):
        return 'spine'
    if n in ('spine01', 'breast', 'clavicle', 'shoulder01'):
        return 'chest'
    if n.startswith('neck'):
        return 'neck'
    if n.startswith('upperarm'):
        return 'arm' + side
    if n.startswith('lowerarm'):
        return 'elbow' + side
    if n in ('wrist',) or n.startswith('metacarpal') or n.startswith('finger'):
        return 'hand' + side
    if n.startswith('upperleg'):
        return 'leg' + side
    if n.startswith('lowerleg'):
        return 'knee' + side
    if n == 'foot' or n.startswith('toe'):
        return 'ankle' + side
    if n in ('jaw', 'special04', 'oris02', 'oris01', 'oris06', 'tongue00') or n.startswith('tongue'):
        return 'jaw'
    if n == 'orbicularis03':
        return 'lid' + side
    if n == 'orbicularis04':
        return 'lidLo' + side
    return 'head'


W = np.zeros((NV, len(BONES)), dtype=np.float64)
for mh, lst in MHW.items():
    b = BI[map_bone(mh)]
    for vi, w in lst:
        W[vi, b] += w

# ---------------------------------------------------------------------------
#  Sommets utilisés : corps, cils, dents (avec coutures UV dédoublées)
# ---------------------------------------------------------------------------
PARTS = {'body': ['body'], 'lashes': ['helper-l-eyelashes-1', 'helper-l-eyelashes-2', 'helper-r-eyelashes-1', 'helper-r-eyelashes-2'],
         'teeth': ['helper-upper-teeth', 'helper-lower-teeth']}


def build_part(groups):
    key_to_new = {}
    src_v, src_vt, tris = [], [], []
    for g, idx in FACES:
        if g not in groups:
            continue
        ids = []
        for vi, ti in idx:
            k = (vi, ti)
            if k not in key_to_new:
                key_to_new[k] = len(src_v)
                src_v.append(vi)
                src_vt.append(ti)
            ids.append(key_to_new[k])
        for k in range(1, len(ids) - 1):
            tris.append((ids[0], ids[k], ids[k + 1]))
    return np.array(src_v), np.array(src_vt), np.array(tris, dtype=np.int64)


# ---------------------------------------------------------------------------
#  Yeux (proxy MakeHuman ajusté au maillage : barycentres + décalages)
# ---------------------------------------------------------------------------
def load_proxy(dirname, name):
    obj = load_obj(os.path.join(DATA, dirname, name + '.obj'))
    refs, scales = [], {}
    started = False
    for line in open(os.path.join(DATA, dirname, name + '.mhclo')):
        p = line.split()
        if not p or p[0].startswith('#'):
            continue
        if p[0] in ('x_scale', 'y_scale', 'z_scale'):
            scales[p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif p[0] == 'verts':
            started = True
        elif started:
            if len(p) == 9:
                refs.append(([int(x) for x in p[:3]], [float(x) for x in p[3:6]], [float(x) for x in p[6:9]]))
            elif len(p) == 1:
                refs.append(([int(p[0])] * 3, [1.0, 0.0, 0.0], [0.0, 0.0, 0.0]))
    return obj, refs, scales


EYE_OBJ, EYE_REFS, EYE_SCALES = load_proxy('eyes', 'high-poly/high-poly')


def fit_proxy(pos, refs, scales):
    sc = []
    for ax, k in (('x', 0), ('y', 1), ('z', 2)):
        a, b, den = scales[ax]
        sc.append(abs(pos[a][k] - pos[b][k]) / den)
    sc = np.array(sc)
    out = np.zeros((len(refs), 3))
    for i, (vs, ws, off) in enumerate(refs):
        out[i] = ws[0] * pos[vs[0]] + ws[1] * pos[vs[1]] + ws[2] * pos[vs[2]] + np.array(off) * sc
    return out


# ---------------------------------------------------------------------------
#  Occlusion ambiante : voxelisation (parité le long de z) puis rayons
# ---------------------------------------------------------------------------
def tri_list(groups):
    tris = []
    for g, idx in FACES:
        if g in groups:
            ids = [i for i, _ in idx]
            for k in range(1, len(ids) - 1):
                tris.append((ids[0], ids[k], ids[k + 1]))
    return np.array(tris, dtype=np.int64)


CLOSED = tri_list({'body', 'helper-l-eye', 'helper-r-eye'})


def voxelize(pos, h=0.006):
    P = pos[np.unique(CLOSED)]
    lo = P.min(axis=0) - 4 * h
    hi = P.max(axis=0) + 4 * h
    n = np.ceil((hi - lo) / h).astype(int) + 1
    tog = np.zeros((n[0], n[1], n[2] + 1), dtype=np.int8)
    A, B, C = pos[CLOSED[:, 0]], pos[CLOSED[:, 1]], pos[CLOSED[:, 2]]
    for a, b, c in zip(A, B, C):
        xs = np.arange(math.ceil((min(a[0], b[0], c[0]) - lo[0]) / h), math.floor((max(a[0], b[0], c[0]) - lo[0]) / h) + 1)
        ys = np.arange(math.ceil((min(a[1], b[1], c[1]) - lo[1]) / h), math.floor((max(a[1], b[1], c[1]) - lo[1]) / h) + 1)
        if not len(xs) or not len(ys):
            continue
        X, Y = np.meshgrid(xs, ys, indexing='ij')
        px, py = lo[0] + X * h, lo[1] + Y * h
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-14:
            continue
        l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d
        l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d
        l3 = 1 - l1 - l2
        m = (l1 >= 0) & (l2 >= 0) & (l3 > 0)
        if not m.any():
            continue
        z = l1 * a[2] + l2 * b[2] + l3 * c[2]
        zi = np.clip(np.ceil((z - lo[2]) / h).astype(int), 0, n[2])
        np.add.at(tog, (X[m], Y[m], zi[m]), 1)
    inside = (np.cumsum(tog, axis=2) % 2).astype(bool)[:, :, :n[2]]
    return inside, lo, h


def bake_ao(pos, verts, normals, rays=40, maxd=0.22):
    inside, lo, h = voxelize(pos)
    rng = np.random.default_rng(7)
    # directions de l'hémisphère (cosinus), dans un repère par sommet
    u1, u2 = rng.random(rays), rng.random(rays)
    r, phi = np.sqrt(u1), 2 * np.pi * u2
    local = np.stack([r * np.cos(phi), r * np.sin(phi), np.sqrt(1 - u1)], axis=1)
    steps = np.arange(2, int(maxd / h)) * h
    ao = np.zeros(len(verts))
    sh = np.array(inside.shape)
    for c0 in range(0, len(verts), 512):
        v = pos[verts[c0:c0 + 512]]
        nrm = normals[c0:c0 + 512]
        t1 = np.cross(nrm, np.where(np.abs(nrm[:, :1]) < 0.9, [[1, 0, 0]], [[0, 1, 0]]))
        t1 /= np.linalg.norm(t1, axis=1, keepdims=True) + 1e-12
        t2 = np.cross(nrm, t1)
        dirs = local[None, :, 0:1] * t1[:, None] + local[None, :, 1:2] * t2[:, None] + local[None, :, 2:3] * nrm[:, None]
        p = v[:, None, None, :] + (nrm[:, None, None, :] * h * 1.5) + dirs[:, :, None, :] * steps[None, None, :, None]
        idx = np.floor((p - lo) / h).astype(int)
        ok = np.all((idx >= 0) & (idx < sh), axis=-1)
        idx = np.clip(idx, 0, sh - 1)
        hit = inside[idx[..., 0], idx[..., 1], idx[..., 2]] & ok
        first = np.where(hit.any(axis=2), hit.argmax(axis=2), len(steps))
        dist = np.where(first < len(steps), steps[np.minimum(first, len(steps) - 1)], maxd)
        occ = 1 - (dist / maxd) ** 0.6
        ao[c0:c0 + 512] = occ.mean(axis=1)
    return ao


def vertex_normals(pos, tris, nverts):
    a, b, c = pos[tris[:, 0]], pos[tris[:, 1]], pos[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    n = np.zeros((nverts, 3))
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


# ---------------------------------------------------------------------------
#  Masques du visage et du corps, peints dans l'espace UV
# ---------------------------------------------------------------------------
def rasterize_uv(S, uv, tris, attrs):
    """Interpole des attributs par sommet dans l'espace UV (S x S)."""
    out = np.zeros((S, S, attrs.shape[1]))
    cov = np.zeros((S, S), dtype=bool)
    U = uv[:, 0] * S - 0.5
    Vv = (1 - uv[:, 1]) * S - 0.5
    for t in tris:
        xa, xb, xc = U[t]
        ya, yb, yc = Vv[t]
        x0, x1 = int(max(0, math.floor(min(xa, xb, xc)) - 1)), int(min(S - 1, math.ceil(max(xa, xb, xc)) + 1))
        y0, y1 = int(max(0, math.floor(min(ya, yb, yc)) - 1)), int(min(S - 1, math.ceil(max(ya, yb, yc)) + 1))
        if x1 < x0 or y1 < y0:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1), indexing='xy')
        d = (yb - yc) * (xa - xc) + (xc - xb) * (ya - yc)
        if abs(d) < 1e-12:
            continue
        l1 = ((yb - yc) * (X - xc) + (xc - xb) * (Y - yc)) / d
        l2 = ((yc - ya) * (X - xc) + (xa - xc) * (Y - yc)) / d
        l3 = 1 - l1 - l2
        e = -0.02  # léger débordement pour éviter les liserés de couture
        m = (l1 >= e) & (l2 >= e) & (l3 >= e)
        if not m.any():
            continue
        val = l1[m, None] * attrs[t[0]] + l2[m, None] * attrs[t[1]] + l3[m, None] * attrs[t[2]]
        out[Y[m], X[m]] = val
        cov[Y[m], X[m]] = True
    return out, cov


def dilate(img, cov, n=6):
    """Étend les bords des îlots UV (évite les liserés au filtrage)."""
    img = img.copy()
    cov = cov.copy()
    for _ in range(n):
        acc = np.zeros_like(img)
        cnt = np.zeros(cov.shape)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sc = np.roll(np.roll(cov, dy, 0), dx, 1)
            si = np.roll(np.roll(img, dy, 0), dx, 1)
            acc += si * sc[..., None]
            cnt += sc
        grow = (~cov) & (cnt > 0)
        img[grow] = acc[grow] / cnt[grow][:, None]
        cov = cov | grow
    return img


def smooth01(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def write_png(path, rgba):
    """PNG RGBA 8 bits sans dépendance externe."""
    h, w, _ = rgba.shape
    raw = b''.join(b'\x00' + rgba[y].astype(np.uint8).tobytes() for y in range(h))
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(png)


def face_masks(pos, src_v, src_vt, tris, S=1024):
    """Masques (0..255) : A = lèvres, sourcils, barbe, joues ; B = paupières,
    cuir chevelu, rougeurs (nez, oreilles, articulations), rides."""
    P = pos[src_v]
    eL = pos[sorted(GROUP_VERTS['joint-l-eye'])].mean(axis=0)
    eR = pos[sorted(GROUP_VERTS['joint-r-eye'])].mean(axis=0)
    ec = (eL + eR) / 2
    iod = np.linalg.norm(eL - eR)                       # distance interpupillaire
    # repère du visage : x latéral, y vertical, z avant ; unités = distance interpupillaire
    rel = (P - ec) / iod
    x, y, z = rel[:, 0], rel[:, 1], rel[:, 2]
    head_part = W[src_v][:, [BI['head'], BI['jaw'], BI['lidL'], BI['lidR'], BI['lidLoL'], BI['lidLoR']]].sum(axis=1)
    neck_part = W[src_v][:, BI['neck']]
    # bouche : barycentre des sommets pondérés par les muscles des lèvres
    oris = np.zeros(NV)
    for mh, lst in MHW.items():
        if mh.startswith('oris'):
            for vi, w in lst:
                oris[vi] += w
    mo = (pos * oris[:, None]).sum(axis=0) / oris.sum()
    m = (mo - ec) / iod
    ax = np.abs(x)
    # lèvres : ellipse autour de la bouche, sur la face avant
    lipy = y - m[1]
    lips = smooth01(1.0, 0.75, np.sqrt((x / 0.62) ** 2 + (lipy / 0.21) ** 2)) * (z > m[2] - 0.35) * (head_part > 0.3)
    # sourcils : arc au-dessus de chaque œil
    bx = (ax - 0.5) / 0.42
    by = y - (0.30 + 0.06 * (1 - bx ** 2) - 0.07 * np.clip(bx, 0, 1))
    brows = smooth01(1.0, 0.7, np.abs(bx)) * smooth01(0.11, 0.05, np.abs(by - 0.0)) * (z > -0.6) * (head_part > 0.5)
    # barbe : bas du visage et haut du cou, sans les lèvres
    # ligne de barbe : sous le nez au milieu, plus basse sur les joues
    bline = -0.5 - 0.32 * smooth01(0.3, 0.95, ax)
    below_nose = smooth01(bline + 0.1, bline - 0.22, y)
    beard_side = smooth01(1.4, 0.95, ax)
    beard = below_nose * beard_side * (z > -1.1) * np.clip(head_part + neck_part * smooth01(m[1] - 1.45, m[1] - 0.9, y), 0, 1)
    beard *= 1 - lips
    cheek = smooth01(0.45, 0.0, np.sqrt(((ax - 0.62) / 0.3) ** 2 + ((y + 0.38) / 0.28) ** 2)) * (z > -0.5) * (head_part > 0.5)
    # paupières et creux de l'œil
    lid = smooth01(0.42, 0.18, np.sqrt(((ax - 0.5) / 0.75) ** 2 + ((y - 0.06) / 0.55) ** 2)) * (head_part > 0.5)
    # cuir chevelu : au-dessus d'une ligne de cheveux (front, tempes, nuque)
    hairline = 0.62 + 0.25 * smooth01(0.4, 0.9, ax) - 0.55 * smooth01(0.6, -1.4, z)
    scalp = smooth01(hairline - 0.05, hairline + 0.12, y) * (head_part > 0.4) * (1 - smooth01(-1.0, -1.6, y))
    # rougeurs : nez, oreilles (côtés), articulations des doigts
    nose = smooth01(0.4, 0.05, np.sqrt((x / 0.35) ** 2 + ((y + 0.32) / 0.3) ** 2)) * (z > 0.1)
    ears = smooth01(1.15, 1.3, ax) * smooth01(0.5, 0.0, np.abs(y + 0.1)) * (head_part > 0.5)
    hands = W[src_v][:, [BI['handL'], BI['handR']]].sum(axis=1)
    red = np.clip(nose + ears * 0.8 + hands * 0.35, 0, 1)
    # rides : front et coins des yeux (motif tracé à l'exécution)
    wr_fore = smooth01(0.45, 0.6, y) * smooth01(1.0, 0.75, ax) * (1 - scalp) * (z > -0.3) * (head_part > 0.5)
    wr_eye = smooth01(0.35, 0.1, np.sqrt(((ax - 0.95) / 0.25) ** 2 + ((y - 0.0) / 0.25) ** 2)) * (head_part > 0.5)
    wr_mouth = smooth01(0.3, 0.05, np.abs(np.sqrt(((ax - 0.0) / 0.75) ** 2 + ((y - m[1] + 0.05) / 0.45) ** 2) - 1.0)) * (y > m[1] - 0.3) * (y < m[1] + 0.45) * (ax > 0.35) * (z > -0.2) * (head_part > 0.5)
    wr = np.clip(np.maximum.reduce([wr_fore * 0.9, wr_eye, wr_mouth * 0.8]), 0, 1)
    A = np.stack([lips, brows, beard, cheek], axis=1)
    B = np.stack([lid, scalp, red, wr], axis=1)
    UV = VT[src_vt]
    imgA, cov = rasterize_uv(S, UV, tris, A)
    imgB, _ = rasterize_uv(S, UV, tris, B)
    imgA = dilate(imgA, cov)
    imgB = dilate(imgB, cov)
    return np.clip(imgA * 255, 0, 255), np.clip(imgB * 255, 0, 255)


# ---------------------------------------------------------------------------
#  Écriture
# ---------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    parts = {k: build_part(set(g)) for k, g in PARTS.items()}
    needed = sorted(set(np.concatenate([p[0] for p in parts.values()]).tolist()))
    remap = {v: i for i, v in enumerate(needed)}
    N = len(needed)
    blobs = []
    offset = [0]

    def put(arr):
        b = arr.tobytes()
        pad = (-len(b)) % 4
        blobs.append(b + b'\0' * pad)
        o = offset[0]
        offset[0] += len(b) + pad
        return {'o': o, 'n': int(arr.size), 't': arr.dtype.name}

    meta = {'count': N, 'bones': BONES, 'parts': {}, 'variants': {}}
    for k, (sv, svt, tr) in parts.items():
        uv = VT[svt]
        meta['parts'][k] = {
            'src': put(np.array([remap[v] for v in sv], dtype=np.uint16)),
            'uv': put(np.round(np.clip(uv, 0, 1) * 65535).astype(np.uint16)),
            'tris': put(tr.astype(np.uint16)),
        }
    # poids : 4 os principaux par sommet
    Wn = W[needed]
    top = np.argsort(-Wn, axis=1)[:, :4]
    tw = np.take_along_axis(Wn, top, axis=1)
    tw[tw.sum(axis=1) == 0, 0] = 1
    tw /= tw.sum(axis=1, keepdims=True)
    q = np.round(tw * 255).astype(np.int64)
    q[:, 0] += 255 - q.sum(axis=1)
    meta['skinIndex'] = put(top.astype(np.uint8))
    meta['skinWeight'] = put(q.astype(np.uint8))
    # yeux : topologie et UV communes
    eobj_v, eobj_vt, eobj_f = EYE_OBJ
    ekey, esrc, euv, etris = {}, [], [], []
    for g, idx in eobj_f:
        ids = []
        for vi, ti in idx:
            kk = (vi, ti)
            if kk not in ekey:
                ekey[kk] = len(esrc)
                esrc.append(vi)
                euv.append(eobj_vt[ti])
            ids.append(ekey[kk])
        for k in range(1, len(ids) - 1):
            etris.append((ids[0], ids[k], ids[k + 1]))
    esrc = np.array(esrc)
    meta['eyes'] = {'uv': put(np.round(np.clip(np.array(euv), 0, 1) * 65535).astype(np.uint16)),
                    'tris': put(np.array(etris, dtype=np.uint16)), 'count': len(esrc)}
    body_tris_base = tri_list({'body'})
    Q = 20000.0
    OY = np.array([0.0, 0.9, 0.0])   # origine décalée : ±1,6 m autour de 0,9 m tient en 16 bits
    for name, spec in VARIANTS.items():
        pos = relax_hands(morph(**spec) * SCALE)
        foot = pos[sorted(GROUP_VERTS['body'])][:, 1].min()
        pos[:, 1] -= foot
        nrm_all = vertex_normals(pos, body_tris_base, NV)
        ao = bake_ao(pos, np.array(needed), nrm_all[needed])
        eyes = fit_proxy(pos, EYE_REFS, EYE_SCALES)[esrc]
        J = {b: [round(float(c), 5) for c in bone_head(pos, mh)] for b, mh in OUR_JOINTS.items()}
        for side, g in (('L', 'joint-l-eye'), ('R', 'joint-r-eye')):
            J['eye' + side] = [round(float(c), 5) for c in pos[sorted(GROUP_VERTS[g])].mean(axis=0)]
        J['headTop'] = [0.0, round(float(pos[sorted(GROUP_VERTS['body'])][:, 1].max()), 5), 0.0]
        J['handTipL'] = [round(float(c), 5) for c in bone_tail(pos, 'finger3-3.L')]
        J['handTipR'] = [round(float(c), 5) for c in bone_tail(pos, 'finger3-3.R')]
        J['toeL'] = [round(float(c), 5) for c in bone_tail(pos, 'toe3-3.L')]
        J['toeR'] = [round(float(c), 5) for c in bone_tail(pos, 'toe3-3.R')]
        meta['variants'][name] = {
            'pos': put(np.round((pos[needed] - OY) * Q).astype(np.int16)),
            'ao': put(np.round(np.clip(ao, 0, 1) * 255).astype(np.uint8)),
            'eyes': put(np.round((eyes - OY) * Q).astype(np.int16)),
            'joints': J,
            'height': round(float(J['headTop'][1]), 4),
        }
        print(name, 'ok', 'ao moyen %.2f' % ao.mean())
    meta['quant'] = Q
    meta['originY'] = float(OY[1])
    open(os.path.join(OUT, 'humans.bin'), 'wb').write(b''.join(blobs))
    json.dump(meta, open(os.path.join(OUT, 'humans.json'), 'w'), separators=(',', ':'))
    # masques de peau (morphologie neutre)
    pos = morph(gender=0.5, age=0.5, muscle=0.5, weight=0.5) * SCALE
    sv, svt, tr = parts['body']
    A, B = face_masks(pos, sv, svt, tr)
    write_png(os.path.join(OUT, 'maskA.png'), A)
    write_png(os.path.join(OUT, 'maskB.png'), B)
    # texture des yeux (CC0), réduite à 512 px (l'iris est recoloré à l'exécution)
    from PIL import Image
    Image.open(os.path.join(DATA, 'eyes', 'materials', 'brown_eye.png')).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'eye.png'), optimize=True)
    print('écrit', offset[0] // 1024, 'Ko')


if __name__ == '__main__' and os.environ.get('PROBE'):
    for name, spec in VARIANTS.items():
        pos = morph(**spec) * SCALE
        foot = pos[list(GROUP_VERTS['body'])][:, 1].min()
        top = pos[list(GROUP_VERTS['body'])][:, 1].max()
        print(name, 'height %.3f' % (top - foot), 'hips %.3f' % (bone_head(pos, 'root')[1] - foot),
              'shoulderL', np.round(bone_head(pos, 'upperarm01.L') - [0, foot, 0], 3),
              'elbowL', np.round(bone_head(pos, 'lowerarm01.L') - [0, foot, 0], 3))
    sys.exit()

if __name__ == '__main__':
    main()
