#!/usr/bin/env python3
"""
Parametric 3D CAD Generator for the 1973-1974 Alfa Romeo Alfetta GT/GTV (Tipo 116)
Engine Bay & Bialbero AR01608 (1,779 cm3, 122 CV DIN) Twin-Cam Engine.
"""

import json
import math
import struct
import numpy as np


class MeshBuilder:
    def __init__(self, name, material_idx):
        self.name = name
        self.material_idx = material_idx
        self.positions = []
        self.normals = []
        self.indices = []

    def add_grid(self, grid_pos, grid_norm=None, flip=False, close_u=False, close_v=False):
        P = np.asarray(grid_pos, dtype=np.float32)
        nu, nv, _ = P.shape
        if grid_norm is None:
            dP_du = np.zeros_like(P)
            dP_dv = np.zeros_like(P)
            dP_du[1:-1] = P[2:] - P[:-2]
            dP_du[0] = P[1] - P[0]
            dP_du[-1] = P[-1] - P[-2]
            dP_dv[:, 1:-1] = P[:, 2:] - P[:, :-2]
            dP_dv[:, 0] = P[:, 1] - P[:, 0]
            dP_dv[:, -1] = P[:, -1] - P[:, -2]
            N = np.cross(dP_du, dP_dv)
            if flip:
                N = -N
            lengths = np.linalg.norm(N, axis=-1, keepdims=True)
            lengths[lengths < 1e-8] = 1.0
            N = N / lengths
        else:
            N = np.asarray(grid_norm, dtype=np.float32)
            if flip:
                N = -N

        offset = len(self.positions)
        self.positions.extend(P.reshape(-1, 3).tolist())
        self.normals.extend(N.reshape(-1, 3).tolist())
        u_max = nu if close_u else nu - 1
        v_max = nv if close_v else nv - 1
        for i in range(u_max):
            i0, i1 = i, (i + 1) % nu
            for j in range(v_max):
                j0, j1 = j, (j + 1) % nv
                a = offset + i0 * nv + j0
                b = offset + i1 * nv + j0
                c = offset + i1 * nv + j1
                d = offset + i0 * nv + j1
                if not flip:
                    self.indices.extend([a, b, c, a, c, d])
                else:
                    self.indices.extend([a, c, b, a, d, c])

    def add_box(self, center, size, rotation_x=0.0, rotation_y=0.0, rotation_z=0.0):
        cx, cy, cz = center
        sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
        faces = [
            ([[sx, -sy, -sz], [sx, sy, -sz], [sx, sy, sz], [sx, -sy, sz]], [1, 0, 0]),
            ([[-sx, -sy, sz], [-sx, sy, sz], [-sx, sy, -sz], [-sx, -sy, -sz]], [-1, 0, 0]),
            ([[-sx, sy, -sz], [-sx, sy, sz], [sx, sy, sz], [sx, sy, -sz]], [0, 1, 0]),
            ([[-sx, -sy, sz], [-sx, -sy, -sz], [sx, -sy, -sz], [sx, -sy, sz]], [0, -1, 0]),
            ([[-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]], [0, 0, 1]),
            ([[sx, -sy, -sz], [-sx, -sy, -sz], [-sx, sy, -sz], [sx, sy, -sz]], [0, 0, -1]),
        ]
        cx_r, sx_r = math.cos(rotation_x), math.sin(rotation_x)
        cy_r, sy_r = math.cos(rotation_y), math.sin(rotation_y)
        cz_r, sz_r = math.cos(rotation_z), math.sin(rotation_z)

        def rot(v):
            x, y, z = v
            y0, z0 = y * cx_r - z * sx_r, y * sx_r + z * cx_r
            x1, y1 = x * cz_r - y0 * sz_r, x * sz_r + y0 * cz_r
            x2, z2 = x1 * cy_r + z0 * sy_r, -x1 * sy_r + z0 * cy_r
            return [x2, y1, z2]

        for verts, norm in faces:
            offset = len(self.positions)
            rn = rot(norm)
            for v in verts:
                rv = rot(v)
                self.positions.append([rv[0] + cx, rv[1] + cy, rv[2] + cz])
                self.normals.append(rn)
            self.indices.extend([offset, offset + 2, offset + 1, offset, offset + 3, offset + 2])


def _basis(axis):
    axis = np.asarray(axis, dtype=np.float64)
    axis = axis / (np.linalg.norm(axis) + 1e-12)
    ref = np.array([0.0, 0.0, 1.0]) if abs(axis[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = np.cross(axis, ref)
    u /= np.linalg.norm(u) + 1e-12
    v = np.cross(axis, u)
    return axis, u, v


def _emit_tri(mb, a, b, c, want):
    a, b, c = (np.asarray(v, dtype=np.float64) for v in (a, b, c))
    nrm = np.cross(b - a, c - a)
    if np.dot(nrm, want) < 0:
        b, c = c, b
        nrm = -nrm
    nrm = nrm / (np.linalg.norm(nrm) + 1e-12)
    off = len(mb.positions)
    for v in (a, b, c):
        mb.positions.append(v.tolist())
        mb.normals.append(nrm.tolist())
    mb.indices.extend([off, off + 1, off + 2])


def add_cyl_axis(mb, center, axis, r_out, length, r_in=0.0, segs=28, cap_start=True, cap_end=True):
    axis, u, v = _basis(axis)
    c0 = np.asarray(center, dtype=np.float64)
    c1 = c0 + axis * length
    ang = np.linspace(0, 2 * math.pi, segs, endpoint=False)
    wall = np.zeros((2, segs, 3), dtype=np.float32)
    wnorm = np.zeros((2, segs, 3), dtype=np.float32)
    for j, a in enumerate(ang):
        radial = math.cos(a) * u + math.sin(a) * v
        wall[0, j] = c0 + radial * r_out
        wall[1, j] = c1 + radial * r_out
        wnorm[0, j] = radial
        wnorm[1, j] = radial
    mb.add_grid(wall, wnorm, flip=False, close_v=True)
    if cap_end:
        for j in range(segs):
            k = (j + 1) % segs
            ra = math.cos(ang[j]) * u + math.sin(ang[j]) * v
            rb = math.cos(ang[k]) * u + math.sin(ang[k]) * v
            _emit_tri(mb, c1 + ra * r_in, c1 + ra * r_out, c1 + rb * r_out, axis)
            if r_in > 1e-5:
                _emit_tri(mb, c1 + ra * r_in, c1 + rb * r_out, c1 + rb * r_in, axis)
    if cap_start:
        for j in range(segs):
            k = (j + 1) % segs
            ra = math.cos(ang[j]) * u + math.sin(ang[j]) * v
            rb = math.cos(ang[k]) * u + math.sin(ang[k]) * v
            _emit_tri(mb, c0 + ra * r_in, c0 + rb * r_out, c0 + ra * r_out, -axis)
            if r_in > 1e-5:
                _emit_tri(mb, c0 + ra * r_in, c0 + rb * r_in, c0 + rb * r_out, -axis)


def add_tube(mb, spine, radius, segs=18, close_ends=True):
    spine = [np.asarray(p, dtype=np.float64) for p in spine]
    n = len(spine)
    tangents = []
    for i in range(n):
        t = spine[min(i + 1, n - 1)] - spine[max(i - 1, 0)]
        tangents.append(t / (np.linalg.norm(t) + 1e-12))
    _, u, v = _basis(tangents[0])
    grid = np.zeros((n, segs, 3), dtype=np.float32)
    norm = np.zeros((n, segs, 3), dtype=np.float32)
    ang = np.linspace(0, 2 * math.pi, segs, endpoint=False)
    for i in range(n):
        if i > 0:
            u = u - np.dot(u, tangents[i]) * tangents[i]
            u /= np.linalg.norm(u) + 1e-12
            v = np.cross(tangents[i], u)
        for j, a in enumerate(ang):
            radial = math.cos(a) * u + math.sin(a) * v
            grid[i, j] = spine[i] + radial * radius
            norm[i, j] = radial
    mb.add_grid(grid, norm, flip=False, close_v=True)
    if close_ends:
        for end_idx, sgn in ((0, -1.0), (-1, 1.0)):
            c_end = spine[end_idx]
            t_end = tangents[end_idx] * sgn
            for j in range(segs):
                k = (j + 1) % segs
                _emit_tri(mb, c_end, grid[end_idx, j], grid[end_idx, k], t_end)


def bezier_curve(p0, p1, p2, p3, n=18):
    p0, p1, p2, p3 = (np.asarray(p, dtype=np.float64) for p in (p0, p1, p2, p3))
    pts = []
    for t in np.linspace(0.0, 1.0, n):
        pt = ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * (t ** 2) * p2 + (t ** 3) * p3
        pts.append(pt)
    return pts



def build_bialbero_engine():
    # Material indices
    M_BAY_PAINT = 0       # BayBodyPaint (synced with CarPaint in Three.js)
    M_CAST_ALU = 1        # EngineCastAlu (block, head, intake runners, sump, carb bodies)
    M_SATIN_ALU = 2       # EngineSatinAlu (valve cover, polished brackets, caps)
    M_EXHAUST_IRON = 3    # ExhaustCastIron (oxidized brown 4-into-2 exhaust headers)
    M_SEMI_BLACK = 4      # SemiGlossBlack (air filter canister, radiator, heater box, A/C dryer)
    M_RUBBER = 5          # RubberHose (radiator hoses, breather hose, spark plug boots, belts)
    M_CADMIUM_GOLD = 6    # CadmiumGold (brake booster, carb linkages, hood latch catch, brass fittings)
    M_COPPER_RED = 7      # CopperRed (copper washers, alternator red band, brick-red distributor cap)
    M_FAN_YELLOW = 8      # FanYellow (multi-blade cooling fan & AR radiator badge)
    M_OLIVE_TANK = 9      # TankOliveTrans (translucent olive-green coolant expansion tank)
    M_MILK_TANK = 10      # TankMilkTrans (translucent milky-white washer & clutch reservoirs)
    M_AMBER_TANK = 11     # TankAmberTrans (translucent amber brake fluid reservoir)

    materials = [
        {"name": "BayBodyPaint", "pbrMetallicRoughness": {"baseColorFactor": [0.72, 0.08, 0.08, 1.0], "metallicFactor": 0.15, "roughnessFactor": 0.25}},
        {"name": "EngineCastAlu", "pbrMetallicRoughness": {"baseColorFactor": [0.76, 0.78, 0.80, 1.0], "metallicFactor": 0.78, "roughnessFactor": 0.44}},
        {"name": "EngineSatinAlu", "pbrMetallicRoughness": {"baseColorFactor": [0.88, 0.90, 0.92, 1.0], "metallicFactor": 0.88, "roughnessFactor": 0.22}},
        {"name": "ExhaustCastIron", "pbrMetallicRoughness": {"baseColorFactor": [0.36, 0.22, 0.16, 1.0], "metallicFactor": 0.42, "roughnessFactor": 0.78}},
        {"name": "SemiGlossBlack", "pbrMetallicRoughness": {"baseColorFactor": [0.07, 0.07, 0.08, 1.0], "metallicFactor": 0.22, "roughnessFactor": 0.36}},
        {"name": "RubberHose", "pbrMetallicRoughness": {"baseColorFactor": [0.04, 0.04, 0.045, 1.0], "metallicFactor": 0.05, "roughnessFactor": 0.82}},
        {"name": "CadmiumGold", "pbrMetallicRoughness": {"baseColorFactor": [0.83, 0.68, 0.28, 1.0], "metallicFactor": 0.82, "roughnessFactor": 0.28}},
        {"name": "CopperRed", "pbrMetallicRoughness": {"baseColorFactor": [0.76, 0.24, 0.14, 1.0], "metallicFactor": 0.45, "roughnessFactor": 0.38}},
        {"name": "FanYellow", "pbrMetallicRoughness": {"baseColorFactor": [0.95, 0.78, 0.08, 1.0], "metallicFactor": 0.08, "roughnessFactor": 0.35}},
        {"name": "TankOliveTrans", "pbrMetallicRoughness": {"baseColorFactor": [0.38, 0.46, 0.24, 0.78], "metallicFactor": 0.05, "roughnessFactor": 0.25}, "alphaMode": "BLEND"},
        {"name": "TankMilkTrans", "pbrMetallicRoughness": {"baseColorFactor": [0.92, 0.91, 0.85, 0.82], "metallicFactor": 0.05, "roughnessFactor": 0.28}, "alphaMode": "BLEND"},
        {"name": "TankAmberTrans", "pbrMetallicRoughness": {"baseColorFactor": [0.78, 0.48, 0.14, 0.78], "metallicFactor": 0.05, "roughnessFactor": 0.22}, "alphaMode": "BLEND"},
    ]

    static_mbs = [MeshBuilder(f"EngineBay_{m['name']}", idx) for idx, m in enumerate(materials)]
    mb_paint = static_mbs[M_BAY_PAINT]
    mb_cast = static_mbs[M_CAST_ALU]
    mb_satin = static_mbs[M_SATIN_ALU]
    mb_iron = static_mbs[M_EXHAUST_IRON]
    mb_black = static_mbs[M_SEMI_BLACK]
    mb_rubber = static_mbs[M_RUBBER]
    mb_gold = static_mbs[M_CADMIUM_GOLD]
    mb_copper = static_mbs[M_COPPER_RED]
    mb_yellow = static_mbs[M_FAN_YELLOW]
    mb_olive = static_mbs[M_OLIVE_TANK]
    mb_milk = static_mbs[M_MILK_TANK]
    mb_amber = static_mbs[M_AMBER_TANK]

    # =========================================================================
    # 1. ENGINE BAY STRUCTURE (Tipo 116: low inner fenders, NO McPherson towers)
    # =========================================================================
    # Left (+Z) & Right (-Z) painted inner fender aprons & upper fender rails
    for sgn in (-1.0, 1.0):
        # Upper perimeter fender rail with spot-weld flange lip
        mb_paint.add_box([-0.645, 0.036, sgn * 0.295], [0.580, 0.024, 0.042], rotation_z=0.085)
        # Sloped inner wheelhouse apron (flat/low because Tipo 116 uses longitudinal torsion bars)
        mb_paint.add_box([-0.640, -0.045, sgn * 0.268], [0.560, 0.145, 0.018], rotation_x=sgn * 0.22)
        # Lower frame longitudinal member (longherone)
        mb_paint.add_box([-0.640, -0.125, sgn * 0.215], [0.580, 0.052, 0.048])
        # Upper double-wishbone suspension bracket pocket (clean low stamping)
        mb_paint.add_box([-0.575, -0.072, sgn * 0.238], [0.095, 0.048, 0.038])

    # Front radiator upper crossmember (traversa anteriore) & lower support
    mb_paint.add_box([-0.905, 0.026, 0.0], [0.046, 0.026, 0.580])
    mb_paint.add_box([-0.912, -0.135, 0.0], [0.042, 0.035, 0.520])

    # Rear firewall (parafiamma) & transmission tunnel arch
    mb_paint.add_box([-0.348, -0.022, 0.0], [0.022, 0.245, 0.570])
    mb_paint.add_box([-0.358, 0.072, 0.0], [0.038, 0.032, 0.560])  # Upper cowl gutter ledge
    # Rubber perimeter weatherstrip along the rear cowl firewall lip
    mb_rubber.add_box([-0.365, 0.088, 0.0], [0.018, 0.014, 0.540])

    # Center-rear black heater/ventilation plenum box against firewall + gold hood latch catch
    mb_black.add_box([-0.382, 0.032, 0.0], [0.068, 0.088, 0.230])
    mb_gold.add_box([-0.364, 0.082, 0.0], [0.028, 0.022, 0.046])   # Scrocco cofano (brass/gold catch)
    mb_satin.add_box([-0.364, 0.088, 0.0], [0.016, 0.014, 0.018])

    # Under-engine dark chassis floor pan / crossmember shield (blocks ground view from above)
    mb_black.add_box([-0.635, -0.165, 0.0], [0.570, 0.012, 0.460])
    mb_black.add_box([-0.575, -0.145, 0.0], [0.068, 0.028, 0.430])  # Front steering rack crossmember

    # =========================================================================
    # 2. BIALBERO AR01608 CORE (1,779 cm3, Longitudinal Vertical Installation)
    # =========================================================================
    # Engine longitudinal span: x from -0.715 (front timing cover) to -0.435 (rear bellhousing)
    # 2a. Serie 116 Specific Finned Aluminum Sump (Coppa dell'olio alettata con sbalzo)
    mb_cast.add_box([-0.575, -0.128, 0.0], [0.270, 0.052, 0.138])
    mb_cast.add_box([-0.645, -0.148, 0.0], [0.115, 0.032, 0.155])  # Deep front sump bowl ahead of steering rack
    for z_fin in np.linspace(-0.065, 0.065, 9):
        mb_cast.add_box([-0.575, -0.154, float(z_fin)], [0.265, 0.008, 0.004])

    # 2b. Aluminum-Silicon Ribbed Cylinder Block (Monoblocco in lega leggera nervato)
    mb_cast.add_box([-0.575, -0.068, 0.0], [0.265, 0.086, 0.116])
    # External stiffening ribs on block flanks
    for x_rib in (-0.675, -0.610, -0.545, -0.480):
        mb_cast.add_box([x_rib, -0.068, 0.061], [0.012, 0.078, 0.010])
        mb_cast.add_box([x_rib, -0.068, -0.061], [0.012, 0.078, 0.010])
    for y_rib in (-0.092, -0.048):
        mb_cast.add_box([-0.575, y_rib, 0.061], [0.260, 0.009, 0.010])
        mb_cast.add_box([-0.575, y_rib, -0.061], [0.260, 0.009, 0.010])

    # 2c. Cross-Flow Cylinder Head (Testata a 80 gradi, più larga trasversalmente)
    mb_cast.add_box([-0.575, -0.008, 0.0], [0.272, 0.052, 0.152])
    # Front aluminum duplex timing chain cover (Carter distribuzione anteriore)
    mb_cast.add_box([-0.716, -0.035, 0.0], [0.026, 0.132, 0.136])
    add_cyl_axis(mb_cast, [-0.732, -0.018, 0.0], [1, 0, 0], 0.026, 0.024, segs=20)  # Water pump housing nose
    # Two characteristic front cylinder head threaded studs protruding toward radiator
    for z_stud in (-0.044, 0.044):
        add_cyl_axis(mb_satin, [-0.752, -0.006, z_stud], [1, 0, 0], 0.0045, 0.026, segs=12)
        add_cyl_axis(mb_gold, [-0.733, -0.006, z_stud], [1, 0, 0], 0.0075, 0.006, segs=6)

    # 2d. Iconic Twin-Cam Valve Cover (Coperchio punterie a doppia gobba in alluminio satinato)
    # Left (+Z, exhaust cam) and Right (-Z, intake cam) longitudinal humps
    for sgn in (-1.0, 1.0):
        mb_satin.add_box([-0.572, 0.032, sgn * 0.048], [0.282, 0.034, 0.052])
        add_cyl_axis(mb_satin, [-0.713, 0.046, sgn * 0.048], [1, 0, 0], 0.025, 0.282, segs=20)
    # Front bridge over timing chain chest (uniting the two cam humps)
    mb_satin.add_box([-0.692, 0.042, 0.0], [0.044, 0.036, 0.144])
    # Rear bridge & valley floor
    mb_satin.add_box([-0.440, 0.036, 0.0], [0.018, 0.028, 0.144])
    mb_satin.add_box([-0.572, 0.020, 0.0], [0.278, 0.012, 0.056])

    # Cursive "Alfa Romeo" relief script plaque on the front bridge of the cam cover
    mb_cast.add_box([-0.688, 0.061, 0.004], [0.022, 0.003, 0.088])
    for z_ch in np.linspace(-0.036, 0.042, 9):
        mb_satin.add_box([-0.688, 0.0635, float(z_ch)], [0.012, 0.0035, 0.005], rotation_y=0.25)

    # 6 Hex retaining bolts with copper washers on top of the valve cover
    for x_b in (-0.695, -0.568, -0.442):
        for z_b in (-0.048, 0.048):
            add_cyl_axis(mb_copper, [x_b, 0.070, z_b], [0, 1, 0], 0.0075, 0.0025, segs=12)
            add_cyl_axis(mb_satin, [x_b, 0.072, z_b], [0, 1, 0], 0.0052, 0.0055, segs=6)

    # Oil filler neck & star-shaped "OLIO" cap on front-right (-Z) of the cam cover
    add_cyl_axis(mb_satin, [-0.692, 0.058, -0.046], [0, 1, 0], 0.018, 0.018, segs=20)
    add_cyl_axis(mb_satin, [-0.692, 0.075, -0.046], [0, 1, 0], 0.023, 0.009, segs=24)
    for k_lobe in range(6):
        ang_l = k_lobe * (math.pi / 3.0)
        mb_satin.add_box(
            [-0.692 + 0.021 * math.cos(ang_l), 0.079, -0.046 + 0.021 * math.sin(ang_l)],
            [0.010, 0.008, 0.010],
            rotation_y=ang_l,
        )

    # 4 Spark plug recesses & angled spark plugs with black rubber boots in central valley
    plug_xs = [-0.642, -0.590, -0.538, -0.486]
    for px in plug_xs:
        add_cyl_axis(mb_cast, [px, 0.024, 0.0], [0, 1, 0], 0.013, 0.012, r_in=0.009, segs=16)
        add_cyl_axis(mb_rubber, [px, 0.026, 0.0], [0, 0.92, -0.38], 0.0075, 0.032, segs=12)

    # =========================================================================
    # 3. EXHAUST SIDE (+Z, Left / Driver Side — Bottom of Reference Photo)
    # =========================================================================
    # 3a. 4-into-2 Cast-Iron Exhaust Manifold (Collettori in ghisa 4-in-2: cil 1-4 e 2-3)
    for idx_c, px in enumerate(plug_xs):
        # Mounting flange at cylinder head exhaust port
        mb_iron.add_box([px, -0.008, 0.080], [0.036, 0.034, 0.012])
        target_x = -0.585 if idx_c in (0, 3) else -0.545
        target_z = 0.145 if idx_c in (0, 3) else 0.125
        c_pts = bezier_curve(
            [px, -0.008, 0.082],
            [px, -0.012, 0.145],
            [(px + target_x) * 0.5, -0.065, target_z + 0.018],
            [target_x, -0.125, target_z],
            n=16,
        )
        add_tube(mb_iron, c_pts, 0.0165, segs=16)
    # Twin collector flanges at bottom of 4-into-2 manifold
    mb_iron.add_box([-0.565, -0.128, 0.135], [0.082, 0.016, 0.055])

    # 3b. Lower-Front Alternator (Alternatore con fascia centrale rosso-arancio)
    add_cyl_axis(mb_cast, [-0.695, -0.082, 0.118], [1, 0, 0], 0.038, 0.028, segs=22)
    add_cyl_axis(mb_copper, [-0.667, -0.082, 0.118], [1, 0, 0], 0.039, 0.022, segs=22)  # Red-orange stator band
    add_cyl_axis(mb_cast, [-0.645, -0.082, 0.118], [1, 0, 0], 0.037, 0.024, segs=22)
    mb_satin.add_box([-0.680, -0.045, 0.095], [0.014, 0.048, 0.042], rotation_x=-0.35)  # Tensioner arm

    # 3c. Rear-Left Brake Servo (Servofreno zincato oro) + Dual Master Cylinder & Amber Tank
    # Vacuum booster drum against firewall on driver side (+Z)
    add_cyl_axis(mb_gold, [-0.415, 0.008, 0.195], [1, 0, 0], 0.068, 0.048, segs=28)
    add_cyl_axis(mb_cast, [-0.488, 0.008, 0.195], [1, 0, 0], 0.018, 0.075, segs=16)  # Dual master cylinder
    # Translucent amber brake fluid reservoir on top of master cylinder
    mb_amber.add_box([-0.455, 0.048, 0.195], [0.074, 0.042, 0.044])
    # Two round white caps on top of the amber brake reservoir + central cylindrical metal level sensor cap
    add_cyl_axis(mb_milk, [-0.480, 0.069, 0.195], [0, 1, 0], 0.012, 0.008, segs=16)
    add_cyl_axis(mb_milk, [-0.430, 0.069, 0.195], [0, 1, 0], 0.012, 0.008, segs=16)
    add_cyl_axis(mb_satin, [-0.455, 0.069, 0.195], [0, 1, 0], 0.0095, 0.019, segs=16)
    # Adjacent white cylindrical clutch fluid reservoir with black cap (inboard toward firewall)
    add_cyl_axis(mb_milk, [-0.415, 0.032, 0.125], [0, 1, 0], 0.018, 0.042, segs=18)
    add_cyl_axis(mb_black, [-0.415, 0.074, 0.125], [0, 1, 0], 0.019, 0.008, segs=18)

    # 3d. Two Translucent Tanks along the Left Inner Fender (+Z)
    # 1) Rearward Translucent Olive-Green Coolant Expansion Tank with black strap & metal radiator cap
    mb_olive.add_box([-0.558, 0.012, 0.242], [0.088, 0.068, 0.064])
    mb_black.add_box([-0.558, 0.013, 0.242], [0.016, 0.071, 0.067])  # Black retaining strap
    add_cyl_axis(mb_satin, [-0.558, 0.046, 0.242], [0, 1, 0], 0.016, 0.011, segs=18)
    mb_satin.add_box([-0.558, 0.054, 0.242], [0.012, 0.005, 0.042])  # Metal ear cap
    # 2) Forward Translucent Milky-White Windshield Washer Tank with white round cap
    mb_milk.add_box([-0.665, 0.006, 0.244], [0.084, 0.064, 0.060])
    mb_satin.add_box([-0.665, 0.007, 0.244], [0.014, 0.067, 0.063])  # Metal holder bracket
    add_cyl_axis(mb_milk, [-0.665, 0.038, 0.244], [0, 1, 0], 0.015, 0.009, segs=18)

    # 3e. Front-Left Black Cylindrical A/C Dryer / Auxiliary Canister with Brass Fittings & Hoses
    add_cyl_axis(mb_black, [-0.768, -0.042, 0.236], [0, 1, 0], 0.028, 0.092, segs=22)
    add_cyl_axis(mb_gold, [-0.768, 0.050, 0.236], [0, 1, 0], 0.014, 0.012, segs=8)
    mb_gold.add_box([-0.768, 0.056, 0.236], [0.028, 0.010, 0.016])
    # Braided dark hoses from front-left canister toward front & firewall
    hose_ac = bezier_curve([-0.768, 0.056, 0.228], [-0.720, 0.055, 0.195], [-0.550, 0.048, 0.275], [-0.370, 0.042, 0.255], n=18)
    add_tube(mb_rubber, hose_ac, 0.0065, segs=10)

    # =========================================================================
    # 4. INTAKE SIDE (-Z, Right / Passenger Side — Top of Reference Photo)
    # =========================================================================
    # 4a. Aluminum 4-Runner Intake Manifold with lower coolant channel & front thermostat neck
    mb_cast.add_box([-0.575, -0.022, -0.096], [0.235, 0.024, 0.038])  # Lower water rail
    for px in plug_xs:
        add_cyl_axis(mb_cast, [px, -0.004, -0.132], [0, 0, 1], 0.019, 0.058, segs=16)
        mb_cast.add_box([px, -0.004, -0.078], [0.034, 0.034, 0.010])
    # Front thermostat housing & water outlet neck at front-right of cylinder head
    add_cyl_axis(mb_cast, [-0.688, 0.002, -0.088], [0, 1, 0], 0.024, 0.028, segs=18)
    add_cyl_axis(mb_cast, [-0.722, 0.014, -0.088], [1, 0, 0], 0.015, 0.036, segs=14)

    # 4b. Twin Horizontal Double-Barrel Carburetors (2x Weber 40 DCOE / Dell'Orto DHLA 40)
    carb_xs = [-0.616, -0.512]
    for cx in carb_xs:
        # Main die-cast float chamber & throttle body
        mb_cast.add_box([cx, 0.002, -0.158], [0.078, 0.048, 0.054])
        # Circular upper inspection cover with brass screws
        add_cyl_axis(mb_satin, [cx, 0.026, -0.158], [0, 1, 0], 0.024, 0.008, segs=18)
        # Twin horizontal venturi barrels leading into the air filter plenum
        for dz in (-0.024, 0.024):
            add_cyl_axis(mb_cast, [cx + dz, -0.002, -0.205], [0, 0, 1], 0.0185, 0.052, segs=16)
            add_cyl_axis(mb_gold, [cx + dz, 0.018, -0.142], [0, 1, 0], 0.0045, 0.012, segs=8)  # Idle mixture screws
    # Gold-chromate central throttle linkage bellcrank & fuel rail between the two carburetors
    mb_gold.add_box([-0.564, 0.016, -0.155], [0.036, 0.022, 0.028])
    add_cyl_axis(mb_satin, [-0.655, 0.018, -0.175], [1, 0, 0], 0.004, 0.185, segs=10)

    # 4c. Iconic Black Cylindrical Air Filter Canister ("Barilotto" filtro aria nero)
    # Main longitudinal cylindrical drum along right side (-Z)
    add_cyl_axis(mb_black, [-0.680, -0.002, -0.228], [1, 0, 0], 0.048, 0.235, segs=28)
    # Plenum backing plate bolting canister to the 4 carburetor barrels
    mb_black.add_box([-0.564, -0.002, -0.198], [0.195, 0.058, 0.026])
    # Forward tapered intake snout pointing toward right front headlight area
    snout_pts = bezier_curve(
        [-0.680, -0.002, -0.228],
        [-0.735, 0.002, -0.228],
        [-0.790, 0.008, -0.215],
        [-0.845, 0.012, -0.195],
        n=14,
    )
    add_tube(mb_black, snout_pts, 0.026, segs=20)
    # Two silver/chrome spring-clip retaining straps around the black cylindrical canister
    for x_strap in (-0.625, -0.505):
        add_cyl_axis(mb_satin, [x_strap, -0.002, -0.228], [1, 0, 0], 0.050, 0.008, segs=28)
        mb_gold.add_box([x_strap, 0.046, -0.228], [0.014, 0.008, 0.018])

    # 4d. Oil Vapor Breather Hose (Tubo recupero vapori olio: dal coperchio punterie al barilotto)
    breather_pts = bezier_curve(
        [-0.685, 0.052, -0.068],
        [-0.685, 0.062, -0.130],
        [-0.655, 0.048, -0.185],
        [-0.635, 0.026, -0.210],
        n=16,
    )
    add_tube(mb_rubber, breather_pts, 0.0085, segs=12)

    # 4e. Distributor (Spinterogeno anteriore destro) + 4 HT Spark Plug Cables + Coil & Fuel Filter
    add_cyl_axis(mb_cast, [-0.688, -0.048, -0.095], [0, 0.88, -0.47], 0.018, 0.045, segs=16)
    add_cyl_axis(mb_copper, [-0.688, -0.008, -0.116], [0, 0.88, -0.47], 0.024, 0.028, segs=18)  # Brick-red cap
    for idx_p, px in enumerate(plug_xs):
        ht_pts = bezier_curve(
            [-0.688 + idx_p * 0.004, 0.016, -0.125],
            [-0.675, 0.075, -0.085],
            [(px - 0.675) * 0.5, 0.078, -0.035],
            [px, 0.052, -0.010],
            n=16,
        )
        add_tube(mb_rubber, ht_pts, 0.0032, segs=8)
    # Ignition coil (Bobina) & Filter King glass fuel pressure regulator on right inner fender (-Z)
    add_cyl_axis(mb_copper, [-0.745, 0.005, -0.252], [0, 1, 0], 0.021, 0.068, segs=18)
    add_cyl_axis(mb_satin, [-0.575, 0.025, -0.262], [0, 1, 0], 0.020, 0.016, segs=16)
    add_cyl_axis(mb_amber, [-0.575, -0.002, -0.262], [0, 1, 0], 0.017, 0.027, segs=16)

    # =========================================================================
    # 5. FRONT COOLING SYSTEM (Radiatore, Convogliatore, Tubi Acqua, Cinghia)
    # =========================================================================
    # Vertical radiator core & upper/lower tanks behind the front nose
    mb_black.add_box([-0.835, -0.052, 0.0], [0.036, 0.168, 0.365])
    mb_black.add_box([-0.835, 0.036, 0.0], [0.046, 0.022, 0.375])  # Top header tank
    # Radiator pressure cap on right (-Z) side & yellow "AR" decal on top tank
    add_cyl_axis(mb_satin, [-0.835, 0.047, -0.145], [0, 1, 0], 0.018, 0.009, segs=18)
    mb_satin.add_box([-0.835, 0.052, -0.145], [0.014, 0.005, 0.044])
    mb_yellow.add_box([-0.835, 0.0475, -0.035], [0.022, 0.002, 0.034])  # Yellow warning/AR sticker
    # Circular fan shroud (Convogliatore) on back of radiator
    add_cyl_axis(mb_black, [-0.818, -0.032, 0.0], [1, 0, 0], 0.105, 0.032, r_in=0.092, segs=32)

    # Upper curved black rubber radiator hose (Manicotto superiore) with 2 metal clamps
    up_hose = bezier_curve(
        [-0.722, 0.014, -0.088],
        [-0.765, 0.032, -0.095],
        [-0.795, 0.036, -0.125],
        [-0.818, 0.030, -0.135],
        n=18,
    )
    add_tube(mb_rubber, up_hose, 0.0155, segs=16)
    add_cyl_axis(mb_satin, [-0.732, 0.016, -0.089], [1, 0, 0], 0.017, 0.006, segs=16)
    add_cyl_axis(mb_satin, [-0.812, 0.030, -0.132], [1, 0, 0], 0.017, 0.006, segs=16)

    # V-Belt triangle connecting Crank (-0.732, -0.105, 0), Water Pump (-0.732, -0.018, 0), Alternator (-0.705, -0.082, 0.118)
    belt_pts = [
        [-0.736, -0.105, -0.022],
        [-0.736, -0.018, -0.020],
        [-0.736, 0.002, 0.005],
        [-0.712, -0.068, 0.128],
        [-0.712, -0.096, 0.118],
        [-0.736, -0.118, 0.005],
        [-0.736, -0.105, -0.022],
    ]
    add_tube(mb_rubber, belt_pts, 0.005, segs=8, close_ends=False)

    # =========================================================================
    # 6. ANIMATED SEPARATE NODES (Yellow Fan, 3 Pulleys, Left V-Shaped Hood Stay)
    # =========================================================================
    # 6a. Engine_Fan_Yellow at [-0.782, -0.032, 0.0]
    mb_fan_node = MeshBuilder("Engine_Fan_Yellow", M_FAN_YELLOW)
    add_cyl_axis(mb_fan_node, [-0.012, 0.0, 0.0], [1, 0, 0], 0.026, 0.024, segs=20)
    for b_idx in range(7):
        ang_b = b_idx * (2.0 * math.pi / 7.0)
        cy_b = 0.055 * math.cos(ang_b)
        cz_b = 0.055 * math.sin(ang_b)
        mb_fan_node.add_box([0.0, cy_b, cz_b], [0.005, 0.064, 0.024], rotation_x=ang_b, rotation_y=0.42)

    # 6b. Water Pump, Crankshaft, and Alternator Pulleys
    mb_wp_node = MeshBuilder("Engine_Pulley_WaterPump", M_SEMI_BLACK)
    add_cyl_axis(mb_wp_node, [-0.008, 0.0, 0.0], [1, 0, 0], 0.024, 0.016, segs=20)

    mb_crank_node = MeshBuilder("Engine_Pulley_Crank", M_SEMI_BLACK)
    add_cyl_axis(mb_crank_node, [-0.010, 0.0, 0.0], [1, 0, 0], 0.032, 0.020, segs=22)

    mb_alt_node = MeshBuilder("Engine_Pulley_Alt", M_SATIN_ALU)
    add_cyl_axis(mb_alt_node, [-0.008, 0.0, 0.0], [1, 0, 0], 0.020, 0.016, segs=20)
    for f_idx in range(8):
        ang_f = f_idx * (math.pi / 4.0)
        mb_alt_node.add_box([0.004, 0.015 * math.cos(ang_f), 0.015 * math.sin(ang_f)], [0.006, 0.012, 0.003], rotation_x=ang_f)

    # 6c. V-Shaped Articulated Hood Support Rods (Aste supporto cofano a V sul lato guida +Z)
    # Pivot at [-0.680, 0.038, 0.278]: lower arm goes to V-knee [0.105, 0.135, -0.008], upper arm goes to open hood [-0.105, 0.325, 0.0]
    mb_stay_node = MeshBuilder("Hood_Stay_Left", M_SATIN_ALU)
    stay_arm1 = bezier_curve([0.0, 0.0, 0.0], [0.035, 0.045, -0.003], [0.070, 0.090, -0.006], [0.105, 0.135, -0.008], n=8)
    stay_arm2 = bezier_curve([0.105, 0.135, -0.008], [0.035, 0.198, -0.005], [-0.035, 0.262, -0.002], [-0.105, 0.325, 0.0], n=8)
    add_tube(mb_stay_node, stay_arm1, 0.0042, segs=10)
    add_tube(mb_stay_node, stay_arm2, 0.0042, segs=10)
    add_cyl_axis(mb_stay_node, [0.105, 0.135, -0.012], [0, 0, 1], 0.008, 0.009, segs=12)

    # =========================================================================
    # 7. PACK GLTF 2.0 BINARY (.GLB)
    # =========================================================================
    bin_chunks = []
    buffer_views = []
    accessors = []
    meshes = []

    def pack_primitives(prim_builders, mesh_name):
        prims = []
        for mb in prim_builders:
            if not mb.positions or not mb.indices:
                continue
            pos_arr = np.asarray(mb.positions, dtype=np.float32)
            nrm_arr = np.asarray(mb.normals, dtype=np.float32)
            idx_arr = np.asarray(mb.indices, dtype=np.uint32)

            def append_buf(arr, target):
                raw = arr.tobytes()
                pad = (4 - (len(raw) % 4)) % 4
                offset = sum(len(c) for c in bin_chunks)
                bin_chunks.append(raw + b"\x00" * pad)
                bv_idx = len(buffer_views)
                buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(raw), "target": target})
                return bv_idx

            bv_pos = append_buf(pos_arr, 34962)
            bv_nrm = append_buf(nrm_arr, 34962)
            bv_idx = append_buf(idx_arr, 34963)

            acc_pos = len(accessors)
            accessors.append({
                "bufferView": bv_pos,
                "componentType": 5126,
                "count": len(pos_arr),
                "type": "VEC3",
                "min": pos_arr.min(axis=0).tolist(),
                "max": pos_arr.max(axis=0).tolist(),
            })
            acc_nrm = len(accessors)
            accessors.append({
                "bufferView": bv_nrm,
                "componentType": 5126,
                "count": len(nrm_arr),
                "type": "VEC3",
            })
            acc_idx = len(accessors)
            accessors.append({
                "bufferView": bv_idx,
                "componentType": 5125,
                "count": len(idx_arr),
                "type": "SCALAR",
            })
            prims.append({
                "attributes": {"POSITION": acc_pos, "NORMAL": acc_nrm},
                "indices": acc_idx,
                "material": mb.material_idx,
            })
        mesh_idx = len(meshes)
        meshes.append({"name": mesh_name, "primitives": prims})
        return mesh_idx

    m_static = pack_primitives(static_mbs, "EngineBay_Static_Mesh")
    m_fan = pack_primitives([mb_fan_node], "Engine_Fan_Yellow_Mesh")
    m_wp = pack_primitives([mb_wp_node], "Engine_Pulley_WaterPump_Mesh")
    m_crank = pack_primitives([mb_crank_node], "Engine_Pulley_Crank_Mesh")
    m_alt = pack_primitives([mb_alt_node], "Engine_Pulley_Alt_Mesh")
    m_stay = pack_primitives([mb_stay_node], "Hood_Stay_Left_Mesh")

    nodes = [
        {"name": "EngineBay_Root", "mesh": m_static, "children": [1, 2, 3, 4, 5]},
        {"name": "Engine_Fan_Yellow", "mesh": m_fan, "translation": [-0.782, -0.032, 0.0]},
        {"name": "Engine_Pulley_WaterPump", "mesh": m_wp, "translation": [-0.736, -0.018, 0.0]},
        {"name": "Engine_Pulley_Crank", "mesh": m_crank, "translation": [-0.736, -0.105, 0.0]},
        {"name": "Engine_Pulley_Alt", "mesh": m_alt, "translation": [-0.712, -0.082, 0.118]},
        {"name": "Hood_Stay_Left", "mesh": m_stay, "translation": [-0.680, 0.038, 0.278]},
    ]

    bin_blob = b"".join(bin_chunks)
    gltf = {
        "asset": {"version": "2.0", "generator": "Alfetta-Bialbero-AR01608-CAD-Generator"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
    out_path = "public/models/alfetta-bialbero-engine.glb"
    with open(out_path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total_len))
        f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        f.write(struct.pack("<II", len(bin_blob), 0x004E4942))
        f.write(bin_blob)

    tot_verts = sum(len(mb.positions) for mb in static_mbs + [mb_fan_node, mb_wp_node, mb_crank_node, mb_alt_node, mb_stay_node])
    tot_tris = sum(len(mb.indices) // 3 for mb in static_mbs + [mb_fan_node, mb_wp_node, mb_crank_node, mb_alt_node, mb_stay_node])
    print(f"Built {out_path}: {len(nodes)} nodes, {tot_verts} verts, {tot_tris} tris, {total_len} bytes")


if __name__ == "__main__":
    build_bialbero_engine()
