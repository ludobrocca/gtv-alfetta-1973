#!/usr/bin/env python3
"""
Parametric Coachbuilt 3D CAD Mesh Generator for the 1973/1976 Alfa Romeo Alfetta GTV.
Uses unified C2-continuous parametric surfaces for the lower coachwork, greenhouse glass,
pillars, chrome window frames, and C-pillar louvers so every panel is 100% flush and watertight.
"""

import json
import math
import struct
import numpy as np
from scipy.interpolate import PchipInterpolator


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

            du_fwd = P[2:] - P[1:-1]
            du_bwd = P[1:-1] - P[:-2]
            lu_fwd = np.linalg.norm(du_fwd, axis=-1, keepdims=True) + 1e-8
            lu_bwd = np.linalg.norm(du_bwd, axis=-1, keepdims=True) + 1e-8
            dP_du[1:-1] = (du_fwd / lu_fwd) * lu_bwd + (du_bwd / lu_bwd) * lu_fwd
            dP_du[0] = P[1] - P[0]
            dP_du[-1] = P[-1] - P[-2]

            dv_fwd = P[:, 2:] - P[:, 1:-1]
            dv_bwd = P[:, 1:-1] - P[:, :-2]
            lv_fwd = np.linalg.norm(dv_fwd, axis=-1, keepdims=True) + 1e-8
            lv_bwd = np.linalg.norm(dv_bwd, axis=-1, keepdims=True) + 1e-8
            dP_dv[:, 1:-1] = (dv_fwd / lv_fwd) * lv_bwd + (dv_bwd / lv_bwd) * lv_fwd
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
            i0 = i
            i1 = (i + 1) % nu
            for j in range(v_max):
                j0 = j
                j1 = (j + 1) % nv
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
        cx_rot, sx_rot = math.cos(rotation_x), math.sin(rotation_x)
        cy_rot, sy_rot = math.cos(rotation_y), math.sin(rotation_y)
        cz_rot, sz_rot = math.cos(rotation_z), math.sin(rotation_z)

        def rot(v):
            x, y, z = v
            y0 = y * cx_rot - z * sx_rot
            z0 = y * sx_rot + z * cx_rot
            x1 = x * cz_rot - y0 * sz_rot
            y1 = x * sz_rot + y0 * cz_rot
            z1 = z0
            x2 = x1 * cy_rot + z1 * sy_rot
            y2 = y1
            z2 = -x1 * sy_rot + z1 * cy_rot
            return [x2, y2, z2]

        for verts, norm in faces:
            offset = len(self.positions)
            rn = rot(norm)
            for v in verts:
                rv = rot(v)
                self.positions.append([rv[0] + cx, rv[1] + cy, rv[2] + cz])
                self.normals.append(rn)
            self.indices.extend([offset, offset + 2, offset + 1, offset, offset + 3, offset + 2])

    def add_cylinder_z(self, cx, cy, z0, z1, r_outer, r_inner=0.0, segs=48):
        angles = np.linspace(0, 2 * math.pi, segs, endpoint=False)
        grid = np.zeros((2, segs, 3), dtype=np.float32)
        norm = np.zeros((2, segs, 3), dtype=np.float32)
        for j, a in enumerate(angles):
            ca, sa = math.cos(a), math.sin(a)
            grid[0, j] = [cx + r_outer * ca, cy + r_outer * sa, z0]
            grid[1, j] = [cx + r_outer * ca, cy + r_outer * sa, z1]
            norm[0, j] = [ca, sa, 0.0]
            norm[1, j] = [ca, sa, 0.0]
        self.add_grid(grid, norm, flip=(z1 > z0), close_v=True)

        for z_val, nz in [(z0, -1.0 if z1 > z0 else 1.0), (z1, 1.0 if z1 > z0 else -1.0)]:
            ring_grid = np.zeros((2, segs, 3), dtype=np.float32)
            ring_norm = np.zeros((2, segs, 3), dtype=np.float32)
            for j, a in enumerate(angles):
                ca, sa = math.cos(a), math.sin(a)
                ring_grid[0, j] = [cx + r_inner * ca, cy + r_inner * sa, z_val]
                ring_grid[1, j] = [cx + r_outer * ca, cy + r_outer * sa, z_val]
                ring_norm[0, j] = [0.0, 0.0, nz]
                ring_norm[1, j] = [0.0, 0.0, nz]
            self.add_grid(ring_grid, ring_norm, flip=(nz < 0), close_v=True)

    def add_cylinder_x(self, x0, x1, cy, cz, r_outer, r_inner=0.0, segs=36, bevel=0.0):
        angles = np.linspace(0, 2 * math.pi, segs, endpoint=False)
        grid = np.zeros((2, segs, 3), dtype=np.float32)
        norm = np.zeros((2, segs, 3), dtype=np.float32)
        for j, a in enumerate(angles):
            ca, sa = math.cos(a), math.sin(a)
            grid[0, j] = [x0, cy + r_outer * sa, cz + r_outer * ca]
            grid[1, j] = [x1, cy + (r_outer - bevel) * sa, cz + (r_outer - bevel) * ca]
            norm[0, j] = [0.0, sa, ca]
            norm[1, j] = [0.0, sa, ca]
        self.add_grid(grid, norm, flip=(x1 < x0), close_v=True)

        for x_val, r_use, nx in [(x0, r_outer, -1.0 if x1 > x0 else 1.0), (x1, r_outer - bevel, 1.0 if x1 > x0 else -1.0)]:
            ring_grid = np.zeros((2, segs, 3), dtype=np.float32)
            ring_norm = np.zeros((2, segs, 3), dtype=np.float32)
            for j, a in enumerate(angles):
                ca, sa = math.cos(a), math.sin(a)
                ring_grid[0, j] = [x_val, cy + r_inner * sa, cz + r_inner * ca]
                ring_grid[1, j] = [x_val, cy + r_use * sa, cz + r_use * ca]
                ring_norm[0, j] = [nx, 0.0, 0.0]
                ring_norm[1, j] = [nx, 0.0, 0.0]
            self.add_grid(ring_grid, ring_norm, flip=(nx < 0), close_v=True)


def _emit_tri(mb, a, b, c, want):
    """Append a flat-shaded triangle whose normal is forced to point along `want`."""
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


def add_prism_x(mb, poly_zy, x0, x1):
    """Extrude a convex polygon given in (z, y) along X from x0 to x1 (flat-shaded, closed)."""
    pts = [(float(z), float(y)) for z, y in poly_zy]
    n = len(pts)
    cz = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    for i in range(1, n - 1):
        _emit_tri(mb, [x1, pts[0][1], pts[0][0]], [x1, pts[i][1], pts[i][0]], [x1, pts[i + 1][1], pts[i + 1][0]], (1, 0, 0))
        _emit_tri(mb, [x0, pts[0][1], pts[0][0]], [x0, pts[i][1], pts[i][0]], [x0, pts[i + 1][1], pts[i + 1][0]], (-1, 0, 0))
    for i in range(n):
        j = (i + 1) % n
        (zi, yi), (zj, yj) = pts[i], pts[j]
        out = (0.0, 0.5 * (yi + yj) - cy, 0.5 * (zi + zj) - cz)
        p0, p1, p2, p3 = [x0, yi, zi], [x1, yi, zi], [x1, yj, zj], [x0, yj, zj]
        _emit_tri(mb, p0, p1, p2, out)
        _emit_tri(mb, p0, p2, p3, out)


def expand_poly(poly_zy, margin):
    """Grow a convex (z, y) polygon outward from its centroid by `margin` on each axis."""
    cz = sum(p[0] for p in poly_zy) / len(poly_zy)
    cy = sum(p[1] for p in poly_zy) / len(poly_zy)
    return [(z + math.copysign(margin, z - cz), y + math.copysign(margin, y - cy)) for z, y in poly_zy]


def _basis(axis):
    axis = np.asarray(axis, dtype=np.float64)
    axis = axis / np.linalg.norm(axis)
    ref = np.array([0.0, 0.0, 1.0]) if abs(axis[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = np.cross(axis, ref)
    u /= np.linalg.norm(u)
    v = np.cross(axis, u)
    return axis, u, v


def add_cyl_axis(mb, center, axis, r_out, length, r_in=0.0, segs=40):
    """Cylinder / ring of arbitrary axis starting at `center` and extending `length` along `axis`."""
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
    for j in range(segs):
        k = (j + 1) % segs
        ra = math.cos(ang[j]) * u + math.sin(ang[j]) * v
        rb = math.cos(ang[k]) * u + math.sin(ang[k]) * v
        _emit_tri(mb, c1 + ra * r_in, c1 + ra * r_out, c1 + rb * r_out, axis)
        _emit_tri(mb, c1 + ra * r_in, c1 + rb * r_out, c1 + rb * r_in, axis)


def add_tube(mb, spine, radius, segs=24, r_inner_cap=0.0):
    """Swept circular tube along a polyline `spine` (parallel-transport frame) with an open, rimmed end."""
    spine = [np.asarray(p, dtype=np.float64) for p in spine]
    n = len(spine)
    tangents = []
    for i in range(n):
        t = spine[min(i + 1, n - 1)] - spine[max(i - 1, 0)]
        tangents.append(t / np.linalg.norm(t))
    _, u, v = _basis(tangents[0])
    grid = np.zeros((n, segs, 3), dtype=np.float32)
    norm = np.zeros((n, segs, 3), dtype=np.float32)
    ang = np.linspace(0, 2 * math.pi, segs, endpoint=False)
    for i in range(n):
        if i > 0:
            u = u - np.dot(u, tangents[i]) * tangents[i]
            u /= np.linalg.norm(u)
            v = np.cross(tangents[i], u)
        for j, a in enumerate(ang):
            radial = math.cos(a) * u + math.sin(a) * v
            grid[i, j] = spine[i] + radial * radius
            norm[i, j] = radial
    mb.add_grid(grid, norm, flip=False, close_v=True)
    # Rim washer at the open tip
    t_end = tangents[-1]
    for j in range(segs):
        k = (j + 1) % segs
        ra = (grid[-1, j] - spine[-1]) / radius
        rb = (grid[-1, k] - spine[-1]) / radius
        _emit_tri(mb, spine[-1] + ra * r_inner_cap, spine[-1] + ra * radius, spine[-1] + rb * radius, t_end)
        _emit_tri(mb, spine[-1] + ra * r_inner_cap, spine[-1] + rb * radius, spine[-1] + rb * r_inner_cap, t_end)
    return tangents[-1]


def build_alfetta_gtv():
    m_paint = MeshBuilder("Carrozzeria_AR727", 0)
    m_chrome = MeshBuilder("Cromature_Inox", 1)
    m_glass = MeshBuilder("Cristalli_Verdi", 2)
    m_rubber = MeshBuilder("Gomma_E_Calandra", 3)
    m_rim = MeshBuilder("Cerchi_Campagnolo_16Fori", 4)
    m_headlight = MeshBuilder("Proiettori_Carello", 5)
    m_amber = MeshBuilder("Indicatori_Ambra", 6)
    m_taillight = MeshBuilder("Fanali_Posteriori", 7)
    m_interior = MeshBuilder("Abitacolo_Interno", 8)
    m_wood = MeshBuilder("Volante_Legno", 9)

    # =========================================================================
    # 1. PARAMETRIC SILHOUETTE & CROSS-SECTIONS OF THE ALFETTA GTV (1973/1976)
    # =========================================================================
    profile_pts = np.array([
        # x,     y_center_top, y_fender_top, y_belt,  y_sill,  z_belt,  z_top,   z_bottom
        [-0.955,  0.042,        0.036,       0.020,  -0.088,   0.318,   0.290,   0.275], # Front shark-nose eyebrow tip
        [-0.905,  0.056,        0.049,       0.028,  -0.116,   0.352,   0.324,   0.305], # Front grille / bumper behind tip
        [-0.830,  0.073,        0.065,       0.037,  -0.148,   0.376,   0.342,   0.328], # Front fender lead (side marker)
        [-0.740,  0.086,        0.078,       0.044,  -0.175,   0.388,   0.352,   0.340], # Front wheel arch lead
        [-0.575,  0.102,        0.094,       0.052,  -0.184,   0.394,   0.358,   0.346], # Front axle center
        [-0.410,  0.113,        0.106,       0.057,  -0.186,   0.393,   0.352,   0.346], # Front wheel arch trail
        [-0.352,  0.117,        0.110,       0.059,  -0.186,   0.392,   0.335,   0.346], # Rear hood seam before cowl louvers
        [-0.305,  0.120,        0.113,       0.061,  -0.186,   0.392,   0.335,   0.346], # Base of windshield (cowl)
        [-0.205,  0.198,        0.116,       0.065,  -0.186,   0.394,   0.310,   0.346], # Mid windshield
        [-0.105,  0.268,        0.119,       0.069,  -0.186,   0.395,   0.285,   0.346], # Windshield header / A-pillar top apex
        [ 0.080,  0.278,        0.125,       0.075,  -0.186,   0.396,   0.286,   0.346], # Roof peak above door
        [ 0.280,  0.270,        0.131,       0.082,  -0.186,   0.395,   0.283,   0.345], # Rear roof crown
        [ 0.480,  0.246,        0.136,       0.089,  -0.184,   0.395,   0.276,   0.344], # Fastback hatch top hinge
        [ 0.570,  0.228,        0.138,       0.094,  -0.182,   0.396,   0.272,   0.342], # Rear axle center
        [ 0.720,  0.188,        0.140,       0.102,  -0.174,   0.386,   0.263,   0.332], # Lower fastback hatch
        [ 0.855,  0.144,        0.140,       0.106,  -0.156,   0.368,   0.252,   0.314], # Rear decklid base of glass
        [ 0.915,  0.130,        0.128,       0.102,  -0.132,   0.348,   0.246,   0.295], # Kamm tail sharp trailing edge
        [ 0.932,  0.112,        0.110,       0.060,  -0.118,   0.335,   0.240,   0.282], # Kamm tail vertical face
    ], dtype=np.float64)

    xs_ctrl = profile_pts[:, 0]
    f_y_center = PchipInterpolator(xs_ctrl, profile_pts[:, 1])
    f_y_shoulder = PchipInterpolator(xs_ctrl, profile_pts[:, 2])
    f_y_belt = PchipInterpolator(xs_ctrl, profile_pts[:, 3])
    f_y_sill = PchipInterpolator(xs_ctrl, profile_pts[:, 4])
    f_z_belt = PchipInterpolator(xs_ctrl, profile_pts[:, 5])
    f_z_top = PchipInterpolator(xs_ctrl, profile_pts[:, 6])
    f_z_bot = PchipInterpolator(xs_ctrl, profile_pts[:, 7])

    FRONT_AXLE_X = -0.575
    REAR_AXLE_X = 0.570
    AXLE_Y = -0.145
    ARCH_RADIUS = 0.180

    # Smooth C2 ratio for the hood shut-line / window sill curve z_shoulder(x)
    SHOULDER_Z_RATIO = 0.855

    def get_z_shoulder(x):
        return float(f_z_belt(x)) * SHOULDER_Z_RATIO

    def smooth_max(a, b, k=0.006):
        """C2-continuous soft maximum so wheel arch transitions have zero derivative kinks."""
        diff = a - b
        return 0.5 * (a + b + math.sqrt(diff * diff + k * k))

    def wheel_arch_cut(x):
        y_cut = -0.50
        flare = 0.0
        for ax in (FRONT_AXLE_X, REAR_AXLE_X):
            dx = x - ax
            u = abs(dx) / ARCH_RADIUS
            if u < 1.08:
                inside = max(0.0, ARCH_RADIUS * ARCH_RADIUS - dx * dx)
                arch_y = AXLE_Y + math.sqrt(inside)
                y_cut = max(y_cut, arch_y)
                # Smooth C2 bell-shaped wheel arch lip flare (zero derivative at arch ends!)
                w_flare = max(0.0, 1.0 - (u / 1.05) ** 2) ** 3
                flare = max(flare, 0.0055 * w_flare)
        return y_cut, flare

    def hood_surface_height(x, z_abs):
        """
        Evaluates the exact 3D height y(x, z) across the Hood & Cowl panel (-0.955 <= x <= -0.302)
        for 0 <= z_abs <= get_z_shoulder(x):
        - Taut, gently cambered 1st-series flat-hood profile
        - Crisp central longitudinal dihedral spine (nervatura centrale) along z=0
        - Meets the upper fender shoulder at z = z_shoulder(x) with exact height y_shoulder(x)
        """
        yc = float(f_y_center(x))
        ys = float(f_y_shoulder(x))
        z_sh = get_z_shoulder(x)
        t = min(1.0, z_abs / max(1e-6, z_sh))

        hood_mask = 0.5 * (1.0 + math.tanh((-0.345 - x) / 0.015))
        profile_blend = 0.34 * t * hood_mask + (1.0 - 0.34 * hood_mask) * (t ** 1.65)
        base_y = yc - (yc - ys) * profile_blend

        central_spine = 0.0018 * math.exp(-z_abs / 0.014) * hood_mask * (1.0 - t)
        return base_y + central_spine

    # =========================================================================
    # A) MULTI-PANEL C2 LOWER BODY COACHWORK SHELL
    # Decoupled into 4 mathematically pure grids with shared boundary curves so that:
    # 1. Hood_And_Cowl_Grid (-0.955.. -0.302) has zero cabin-step distortion
    # 2. Upper_Shoulder_Grid (fender top & door sill -> Giugiaro beltline crease) is 100% immune
    #    to wheel-arch cutouts and has zero intermediate ridges
    # 3. Lower_Flank_Grid (Giugiaro beltline crease -> circular wheel arch & rocker sill)
    #    evaluates z(x, y) by true height y so the wheel arch is never pinched inward,
    #    and never stretches silver paint inside the wheel well!
    # =========================================================================

    # A1. Dedicated Hood & Cowl Panel (-0.955 <= x <= -0.302, -z_shoulder <= z <= +z_shoulder)
    hood_nx = 96
    hood_xs_grid = np.linspace(-0.955, -0.302, hood_nx)
    t_hood_half = np.unique(np.concatenate([
        np.linspace(0.0, 0.08, 6),
        np.linspace(0.08, 0.88, 14),
        np.linspace(0.88, 1.00, 5),
    ]))
    nh_half = len(t_hood_half)
    nh_full = nh_half * 2 - 1
    hood_grid = np.zeros((hood_nx, nh_full, 3), dtype=np.float32)

    for i, hx in enumerate(hood_xs_grid):
        z_sh = get_z_shoulder(hx)
        half_pts = []
        for t in t_hood_half:
            z = float(t * z_sh)
            y = hood_surface_height(hx, z)
            half_pts.append((hx, y, z))
        row = []
        for k in range(nh_half - 1, 0, -1):
            px, py, pz = half_pts[k]
            row.append([px, py, -pz])
        for k in range(nh_half):
            px, py, pz = half_pts[k]
            row.append([px, py, pz])
        hood_grid[i] = np.array(row, dtype=np.float32)

    m_paint.add_grid(hood_grid, flip=True)

    # A1b. Rear Decklid Panel behind Fastback Glass (0.852 <= x <= 0.932, -z_shoulder <= z <= +z_shoulder)
    deck_nx = 20
    deck_xs_grid = np.linspace(0.852, 0.932, deck_nx)
    deck_nv = 25
    deck_grid = np.zeros((deck_nx, deck_nv, 3), dtype=np.float32)
    for i, dx in enumerate(deck_xs_grid):
        yc = float(f_y_center(dx))
        ys = float(f_y_shoulder(dx))
        z_sh = get_z_shoulder(dx)
        for j, s in enumerate(np.linspace(-1.0, 1.0, deck_nv)):
            z = s * z_sh
            y = yc - (yc - ys) * (abs(s) ** 1.6)
            deck_grid[i, j] = [dx, y, z]
    m_paint.add_grid(deck_grid, flip=True)

    # A2. Full-Length C2 Upper Fender & Door Shoulder Grid (from z_shoulder down to Giugiaro Beltline Crease)
    # 100% smooth from front shark-nose (-0.955) to rear Kamm tail (0.932) with ZERO wheel-arch distortion!
    flank_nx = 240
    flank_xs = np.linspace(-0.955, 0.932, flank_nx)
    sh_nv = 14
    fl_nv = 16

    def uncut_flank_point(x_q, s_v, side_q):
        """Evaluates a point on the uncut C2 lower body flank surface at normalized vertical depth s_v in [0, 1]."""
        x_clamped = max(-0.955, min(0.932, x_q))
        yb_q = float(f_y_belt(x_clamped))
        ysill_q = float(f_y_sill(x_clamped))
        zb_q = float(f_z_belt(x_clamped))
        zbot_q = float(f_z_bot(x_clamped))
        s_clamped = max(0.0, min(1.0, s_v))
        y_q = yb_q + (ysill_q - yb_q) * s_clamped
        z_q = zb_q - (zb_q - zbot_q) * (s_clamped ** 1.30)
        return np.array([x_clamped, y_q, side_q * z_q], dtype=np.float64)

    for side in (-1.0, 1.0):
        sh_grid = np.zeros((flank_nx, sh_nv, 3), dtype=np.float32)
        fl_grid = np.zeros((flank_nx, fl_nv, 3), dtype=np.float32)
        fl_norm = np.zeros((flank_nx, fl_nv, 3), dtype=np.float32)
        arch_lip_grid = np.zeros((flank_nx, 2, 3), dtype=np.float32)

        for i, x in enumerate(flank_xs):
            ys = float(f_y_shoulder(x))
            yb = float(f_y_belt(x))
            ysill = float(f_y_sill(x))
            zb = float(f_z_belt(x))
            zbot = float(f_z_bot(x))
            z_sh = get_z_shoulder(x)

            # Upper Shoulder: smooth C2 convex arc from (ys, z_sh) down to Giugiaro crease (yb, zb)
            for j, s in enumerate(np.linspace(0.0, 1.0, sh_nv)):
                z_val = z_sh + (zb - z_sh) * (s ** 0.82)
                y_val = ys - (ys - yb) * (0.22 * s + 0.78 * (s ** 1.95))
                sh_grid[i, j] = [x, y_val, side * z_val]

            # Lower Flank: from Giugiaro sharp beltline crease (yb, zb) down to wheel-arch / sill edge
            y_arch, _ = wheel_arch_cut(x)
            ysill_eff = smooth_max(ysill, y_arch, k=0.004)

            for j in range(fl_nv):
                t = j / (fl_nv - 1)
                y_val = yb + (ysill_eff - yb) * t
                s_vert = max(0.0, min(1.0, (yb - y_val) / max(1e-5, yb - ysill)))
                z_val = zb - (zb - zbot) * (s_vert ** 1.30)
                fl_grid[i, j] = [x, y_val, side * z_val]

                # Analytical surface normal from the uncut C2 flank sheet (100% immune to wheel-arch cutout!)
                tu = uncut_flank_point(x + 0.006, s_vert, side) - uncut_flank_point(x - 0.006, s_vert, side)
                tv = uncut_flank_point(x, min(1.0, s_vert + 0.02), side) - uncut_flank_point(x, max(0.0, s_vert - 0.02), side)
                n_vec = np.cross(tu, tv)
                n_vec /= np.linalg.norm(n_vec) + 1e-9
                fl_norm[i, j] = n_vec

            # Separate Matte-Black Inward Wheel-Arch & Sill Return Lip (never distorts outer paint normals!)
            y_edge = fl_grid[i, -1, 1]
            z_edge = abs(fl_grid[i, -1, 2])
            arch_lip_grid[i, 0] = [x, y_edge, side * z_edge]
            arch_lip_grid[i, 1] = [x, y_edge, side * 0.225]

        m_paint.add_grid(sh_grid, flip=(side > 0))
        m_paint.add_grid(fl_grid, grid_norm=fl_norm, flip=(side > 0))
        m_rubber.add_grid(arch_lip_grid, flip=(side > 0))

    # =========================================================================
    # A3) CRISP HOOD PERIMETER SHUT-LINE SEAMS & FRONT EYEBROW LIP (Fuga del Cofano & Palpebra)
    # =========================================================================
    hood_seam_xs = np.linspace(-0.954, -0.352, 64)
    for side in (-1.0, 1.0):
        seam_strip = np.zeros((len(hood_seam_xs), 2, 3), dtype=np.float32)
        for i, hx in enumerate(hood_seam_xs):
            z_s = get_z_shoulder(hx)
            y_s = float(f_y_shoulder(hx)) + 0.0005
            seam_strip[i, 0] = [hx, y_s, side * (z_s - 0.0018)]
            seam_strip[i, 1] = [hx, y_s, side * (z_s + 0.0018)]
        m_rubber.add_grid(seam_strip, flip=(side < 0))

    # Rear Transverse Hood Shut-Line at x = -0.352 (in front of the stamped cowl ventilation grilles)
    x_trans = -0.352
    z_max = get_z_shoulder(x_trans)
    zs_trans = np.linspace(-z_max, z_max, 48)
    trans_strip = np.zeros((2, len(zs_trans), 3), dtype=np.float32)
    for j, hz in enumerate(zs_trans):
        y_h = hood_surface_height(x_trans, abs(hz)) + 0.0005
        trans_strip[0, j] = [x_trans - 0.0016, y_h, hz]
        trans_strip[1, j] = [x_trans + 0.0016, y_h, hz]
    m_rubber.add_grid(trans_strip, flip=False)

    # Sculpted Front Hood Leading-Edge Eyebrow Lip (Palpebra Anteriore Sopra Fari e Scudetto)
    zt_front = get_z_shoulder(-0.955)
    zs_lip = np.linspace(-zt_front, zt_front, 55)
    lip_grid = np.zeros((4, len(zs_lip), 3), dtype=np.float32)
    for j, zl in enumerate(zs_lip):
        y_top_lip = hood_surface_height(-0.955, abs(zl))
        lip_grid[0, j] = [-0.955, y_top_lip, zl]
        lip_grid[1, j] = [-0.961, y_top_lip - 0.0025, zl]
        lip_grid[2, j] = [-0.960, y_top_lip - 0.0075, zl]
        lip_grid[3, j] = [-0.946, y_top_lip - 0.0105, zl]
    m_paint.add_grid(lip_grid, flip=True)

    # =========================================================================
    # B) UNIFIED GREENHOUSE TOP SURFACE (Windshield + Painted Roof + Rear Fastback Glass)
    # All evaluated on the same crown function y_crown(x, s) so they meet flush!
    # =========================================================================
    def z_roof_rail(x_q):
        """Strictly convex plan-view barrel curve for the upper roof rail (d^2z/dx^2 < 0 everywhere, never concave!)."""
        return 0.286 - 0.042 * ((x_q - 0.06) ** 2)

    # Photo-calibrated, 100% strictly convex window & greenhouse boundary functions:
    X_WIN_APEX = 0.562
    Y_WIN_APEX = 0.192

    def win_sill_y(x_q):
        """
        100% straight rising wedge line from front apex x=-0.305 (y=0.114) to the lower-rear elbow
        at x=0.440 (y=0.139, just behind the 4th window sticker and in front of the black fuel cap),
        then angling smoothly upward to the pointed rear apex (X_WIN_APEX=0.562, Y_WIN_APEX=0.192).
        """
        y0 = float(f_y_shoulder(-0.305)) + 0.001
        y_elb = float(f_y_shoulder(0.440)) + 0.002
        if x_q <= 0.440:
            return y0 + (y_elb - y0) * ((x_q - (-0.305)) / (0.440 - (-0.305)))
        u = max(0.0, min(1.0, (x_q - 0.440) / (X_WIN_APEX - 0.440)))
        return y_elb + (Y_WIN_APEX - y_elb) * (0.18 * u + 0.82 * (u ** 1.55))

    def win_arch_y(x_q):
        """
        100% strictly CONVEX (d^2y/dx^2 < 0 everywhere) upper window arch:
        1. Sloped A-pillar from x=-0.305 (y=0.114) to the rounded roof corner at x=-0.055 (y=0.244).
        2. Gently arched roof rail from x=-0.055 (y=0.244) to the arch peak at x=0.245 (y=0.264).
        3. Strictly convex descending fastback arch from x=0.245 (y=0.264) to (X_WIN_APEX=0.562, Y_WIN_APEX=0.192).
        """
        if x_q <= -0.055:
            t = max(0.0, min(1.0, (x_q - (-0.305)) / (-0.055 - (-0.305))))
            y0 = win_sill_y(-0.305)
            y1 = 0.244
            return y0 + (y1 - y0) * (1.16 * t - 0.16 * (t ** 2.4))
        elif x_q <= 0.245:
            u = (0.245 - x_q) / (0.245 - (-0.055))
            return 0.264 - 0.020 * (u ** 2.1)
        else:
            s = min(1.0, (x_q - 0.245) / (X_WIN_APEX - 0.245))
            return 0.264 - (0.264 - Y_WIN_APEX) * (0.08 * s + 0.92 * (s ** 2.05))

    def greenhouse_edge_y(x_q):
        """100% strictly convex outer roof/A-pillar/fastback edge y_top(x) with zero concavity anywhere."""
        if x_q <= 0.245:
            return win_arch_y(x_q) + 0.0055
        w = max(0.0, min(1.0, (x_q - 0.245) / (0.855 - 0.245)))
        return 0.2695 - (0.2695 - 0.140) * (0.22 * w + 0.78 * (w ** 1.85))

    def greenhouse_xyz_from_xy(x_q, y_q, side_q, offset_z=0.0):
        """Projects any 2D profile point (x_q, y_q) onto the strictly convex 3D greenhouse tumblehome surface."""
        ys = float(f_y_shoulder(x_q))
        y_top = greenhouse_edge_y(x_q)
        ty = max(0.0, min(1.0, (y_q - ys) / max(0.012, y_top - ys)))
        z_sill = get_z_shoulder(x_q)
        z_roof = z_roof_rail(x_q)
        z_abs = z_sill + (z_roof - z_sill) * (ty ** 0.90) + offset_z
        return [x_q, y_q, side_q * z_abs]

    def greenhouse_xy_norm(x_q, y_q, side_q):
        """Analytical pre-flip unit normal on the smooth C2 greenhouse surface at (x_q, y_q)."""
        eps = 0.004
        p_x1 = np.array(greenhouse_xyz_from_xy(min(0.855, x_q + eps), y_q, side_q), dtype=np.float64)
        p_x0 = np.array(greenhouse_xyz_from_xy(max(-0.305, x_q - eps), y_q, side_q), dtype=np.float64)
        p_y1 = np.array(greenhouse_xyz_from_xy(x_q, y_q + eps, side_q), dtype=np.float64)
        p_y0 = np.array(greenhouse_xyz_from_xy(x_q, y_q - eps, side_q), dtype=np.float64)
        n_vec = np.cross(p_x1 - p_x0, p_y1 - p_y0)
        n_vec /= np.linalg.norm(n_vec) + 1e-9
        return n_vec.astype(np.float32)

    def greenhouse_top_point(x, s, offset_y=0.0):
        """s in [-1, 1] across the width of the greenhouse top/glass, matching greenhouse_xyz_from_xy at |s|=1."""
        y_edge = greenhouse_edge_y(x)
        yc = y_edge + 0.014
        _, _, z_edge = greenhouse_xyz_from_xy(x, y_edge, 1.0)
        z = s * z_edge
        y = yc - 0.014 * (s ** 2) + offset_y
        return [x, y, z]

    # 1. Front Laminated Windshield (-0.305 <= x <= -0.055, |s| <= 0.92)
    ws_nx, ws_nv = 28, 30
    ws_grid = np.zeros((ws_nx, ws_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(-0.305, -0.055, ws_nx)):
        for j, s in enumerate(np.linspace(-0.92, 0.92, ws_nv)):
            ws_grid[i, j] = greenhouse_top_point(x, s)
    m_glass.add_grid(ws_grid, flip=False)

    # Painted A-Pillars on the outer edges (0.90 <= |s| <= 1.00) of the windshield
    for side in (-1.0, 1.0):
        ap_grid = np.zeros((ws_nx, 5, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(-0.305, -0.055, ws_nx)):
            for j, s_abs in enumerate(np.linspace(0.90, 1.00, 5)):
                ap_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.001)
        m_paint.add_grid(ap_grid, flip=(side < 0))
        # Chrome windshield side molding
        cr_grid = np.zeros((ws_nx, 3, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(-0.305, -0.055, ws_nx)):
            for j, s_abs in enumerate(np.linspace(0.89, 0.92, 3)):
                cr_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.002)
        m_chrome.add_grid(cr_grid, flip=(side < 0))

    # Chrome windshield top & bottom moldings
    for x_edge in (-0.304, -0.056):
        cr_bar = np.zeros((2, ws_nv, 3), dtype=np.float32)
        for j, s in enumerate(np.linspace(-0.92, 0.92, ws_nv)):
            cr_bar[0, j] = greenhouse_top_point(x_edge - 0.004, s, offset_y=0.002)
            cr_bar[1, j] = greenhouse_top_point(x_edge + 0.004, s, offset_y=0.002)
        m_chrome.add_grid(cr_bar, flip=False)

    # 2. Painted Roof Panel Crown (-0.055 <= x <= 0.480, |s| <= 1.0)
    roof_nx, roof_nv = 36, 30
    roof_grid = np.zeros((roof_nx, roof_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(-0.055, 0.480, roof_nx)):
        for j, s in enumerate(np.linspace(-1.0, 1.0, roof_nv)):
            roof_grid[i, j] = greenhouse_top_point(x, s, offset_y=0.001)
    m_paint.add_grid(roof_grid, flip=False)

    # 3. Rear Fastback Hatch Window (0.480 <= x <= 0.855, |s| <= 0.88) — ZERO SPOILER!
    rw_nx, rw_nv = 32, 30
    rw_grid = np.zeros((rw_nx, rw_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(0.480, 0.855, rw_nx)):
        for j, s in enumerate(np.linspace(-0.88, 0.88, rw_nv)):
            rw_grid[i, j] = greenhouse_top_point(x, s)
    m_glass.add_grid(rw_grid, flip=False)

    # Painted Rear Hatch Side Pillars (0.87 <= |s| <= 1.0) & Chrome Rear Window Frame
    for side in (-1.0, 1.0):
        rh_grid = np.zeros((rw_nx, 5, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(0.480, 0.855, rw_nx)):
            for j, s_abs in enumerate(np.linspace(0.87, 1.00, 5)):
                rh_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.001)
        m_paint.add_grid(rh_grid, flip=(side < 0))

        cr_rw = np.zeros((rw_nx, 3, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(0.480, 0.855, rw_nx)):
            for j, s_abs in enumerate(np.linspace(0.855, 0.885, 3)):
                cr_rw[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.002)
        m_chrome.add_grid(cr_rw, flip=(side < 0))

    for x_edge in (0.481, 0.854):
        cr_bar = np.zeros((2, rw_nv, 3), dtype=np.float32)
        for j, s in enumerate(np.linspace(-0.88, 0.88, rw_nv)):
            cr_bar[0, j] = greenhouse_top_point(x_edge - 0.004, s, offset_y=0.002)
            cr_bar[1, j] = greenhouse_top_point(x_edge + 0.004, s, offset_y=0.002)
        m_chrome.add_grid(cr_bar, flip=False)

    # =========================================================================
    # C) 100% CONVEX 3-PIECE SIDE WINDOW ARCHITECTURE & C-PILLAR SAIL PANEL
    #    - Pezzo 1: Deflettore Anteriore Triangolare (Front Triangular Vent-Wing)
    #    - Pezzo 2: Finestrino Principale Scendente Portiera (5-Sided Pentagonal Door Glass)
    #    - Pezzo 3: Finestrino Posteriore a Compasso a Punta (Pointed Pop-Out Quarter Window)
    # =========================================================================
    def eval_shoulder(x_q, s_sh, side_q, offset_z=0.0, offset_y=0.0):
        """Evaluates a point on the C2 Upper Shoulder surface (s_sh=0 at window sill, s_sh=1 at Giugiaro beltline crease)."""
        ys = float(f_y_shoulder(x_q))
        yb = float(f_y_belt(x_q))
        z_sh = get_z_shoulder(x_q)
        zb = float(f_z_belt(x_q))
        z_val = z_sh + (zb - z_sh) * (s_sh ** 0.82) + offset_z
        y_val = ys - (ys - yb) * (0.22 * s_sh + 0.78 * (s_sh ** 1.95)) + offset_y
        return [x_q, y_val, side_q * z_val]

    def eval_flank(x_q, s_vert, side_q, offset_z=0.0):
        """Evaluates a point on the C2 Lower Flank surface (s_vert=0 at beltline crease, s_vert=1 at bottom sill)."""
        yb = float(f_y_belt(x_q))
        ysill = float(f_y_sill(x_q))
        zb = float(f_z_belt(x_q))
        zbot = float(f_z_bot(x_q))
        y_val = yb + (ysill - yb) * s_vert
        z_val = zb - (zb - zbot) * (s_vert ** 1.30) + offset_z
        return [x_q, y_val, side_q * z_val]

    def add_cpillar_stroke(p0, p1, width_xy, side_q, mat, offset_z=0.0022, n_seg=8):
        """Builds a conformal 3D ribbon stroke between 2D profile points p0=(x0,y0) and p1=(x1,y1) on the greenhouse."""
        x0, y0 = p0
        x1, y1 = p1
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy) + 1e-9
        nx_p, ny_p = -dy / length, dx / length
        hw = width_xy * 0.5
        stroke_grid = np.zeros((n_seg, 2, 3), dtype=np.float32)
        for i, t in enumerate(np.linspace(0.0, 1.0, n_seg)):
            xm = x0 + dx * t
            ym = y0 + dy * t
            stroke_grid[i, 0] = greenhouse_xyz_from_xy(xm - nx_p * hw, ym - ny_p * hw, side_q, offset_z=offset_z)
            stroke_grid[i, 1] = greenhouse_xyz_from_xy(xm + nx_p * hw, ym + ny_p * hw, side_q, offset_z=offset_z)
        mat.add_grid(stroke_grid, flip=(side_q < 0))

    def build_window_piece(x_bot_0, x_top_0, x_bot_1, x_top_1, side_q, nu=26, nv=16, is_pointed_front=False, is_pointed_rear=False):
        """
        Builds a distinct side window pane (glass mesh + 3D perimeter chrome molding + black weatherstrip seal)
        bounded horizontally by [x_bot_0..x_bot_1] along win_sill_y(x) and [x_top_0..x_top_1] along win_arch_y(x).
        """
        u_vals = np.linspace(0.0, 1.0, nu)
        v_vals = np.linspace(0.0, 1.0, nv)
        glass_grid = np.zeros((nu, nv, 3), dtype=np.float32)

        for i, u in enumerate(u_vals):
            u_in = 0.015 + 0.97 * u
            xb = x_bot_0 + u_in * (x_bot_1 - x_bot_0)
            xt = x_top_0 + u_in * (x_top_1 - x_top_0)
            yb = win_sill_y(xb)
            yt = win_arch_y(xt)
            for j, v in enumerate(v_vals):
                v_in = 0.02 + 0.96 * v
                x_curr = xb + v_in * (xt - xb)
                y_curr = yb + v_in * (yt - yb)
                glass_grid[i, j] = greenhouse_xyz_from_xy(x_curr, y_curr, side_q, offset_z=0.0)
        m_glass.add_grid(glass_grid, flip=(side_q < 0))

        # Top & Bottom Chrome + Black Weatherstrip Frame Moldings along this specific window piece
        top_cr = np.zeros((nu, 2, 3), dtype=np.float32)
        bot_cr = np.zeros((nu, 2, 3), dtype=np.float32)
        top_rb = np.zeros((nu, 2, 3), dtype=np.float32)
        bot_rb = np.zeros((nu, 2, 3), dtype=np.float32)

        for i, u in enumerate(u_vals):
            xb = x_bot_0 + u * (x_bot_1 - x_bot_0)
            xt = x_top_0 + u * (x_top_1 - x_top_0)
            yb = win_sill_y(xb)
            yt = win_arch_y(xt)

            bot_cr[i, 0] = greenhouse_xyz_from_xy(xb, yb - 0.0025, side_q, offset_z=0.0026)
            bot_cr[i, 1] = greenhouse_xyz_from_xy(xb, yb + 0.0030, side_q, offset_z=0.0026)
            bot_rb[i, 0] = greenhouse_xyz_from_xy(xb, yb + 0.0025, side_q, offset_z=0.0018)
            bot_rb[i, 1] = greenhouse_xyz_from_xy(xb, yb + 0.0055, side_q, offset_z=0.0018)

            top_cr[i, 0] = greenhouse_xyz_from_xy(xt, yt - 0.0030, side_q, offset_z=0.0026)
            top_cr[i, 1] = greenhouse_xyz_from_xy(xt, yt + 0.0025, side_q, offset_z=0.0026)
            top_rb[i, 0] = greenhouse_xyz_from_xy(xt, yt - 0.0055, side_q, offset_z=0.0018)
            top_rb[i, 1] = greenhouse_xyz_from_xy(xt, yt - 0.0025, side_q, offset_z=0.0018)

        m_chrome.add_grid(bot_cr, flip=(side_q < 0))
        m_chrome.add_grid(top_cr, flip=(side_q < 0))
        m_rubber.add_grid(bot_rb, flip=(side_q < 0))
        m_rubber.add_grid(top_rb, flip=(side_q < 0))

        # Front vertical/sloped chrome edge (for Piece 2 and Piece 3; Piece 1 converges to a sharp front apex!)
        if not is_pointed_front:
            p0_f = (x_bot_0, win_sill_y(x_bot_0))
            p1_f = (x_top_0, win_arch_y(x_top_0))
            add_cpillar_stroke(p0_f, p1_f, 0.0058, side_q, m_chrome, offset_z=0.0027, n_seg=14)
            add_cpillar_stroke(p0_f, p1_f, 0.0095, side_q, m_rubber, offset_z=0.0018, n_seg=14)

        # Rear vertical chrome edge (for Piece 1 and Piece 2; Piece 3 converges to a sharp rear apex!)
        if not is_pointed_rear:
            p0_r = (x_bot_1, win_sill_y(x_bot_1))
            p1_r = (x_top_1, win_arch_y(x_top_1))
            add_cpillar_stroke(p0_r, p1_r, 0.0058, side_q, m_chrome, offset_z=0.0027, n_seg=14)
            add_cpillar_stroke(p0_r, p1_r, 0.0095, side_q, m_rubber, offset_z=0.0018, n_seg=14)

    for side in (-1.0, 1.0):
        # =====================================================================
        # 1. THE 3 DISTINCT SIDE WINDOW PIECES (I 3 Pezzi Distinti dei Finestrini)
        # =====================================================================
        # PEZZO 1: Deflettore Anteriore Triangolare (Front Triangular Vent-Wing Window)
        # True triangle: front apex at (-0.305, 0.114), meeting sloped A-pillar along top and vertical divider bar at x=-0.165..-0.148
        build_window_piece(-0.305, -0.305, -0.165, -0.148, side, nu=20, nv=14, is_pointed_front=True, is_pointed_rear=False)

        # Triangular Matte-Black & Stainless Corner Gusset at front apex of Pezzo 1 + Chrome Swivel Latch
        gusset_rb = np.zeros((6, 6, 3), dtype=np.float32)
        for i, xg in enumerate(np.linspace(-0.304, -0.274, 6)):
            yb_g = win_sill_y(xg)
            yt_g = min(win_arch_y(xg), yb_g + 0.018 * (1.0 - (xg - (-0.304)) / 0.030))
            for j, yg in enumerate(np.linspace(yb_g, yt_g, 6)):
                gusset_rb[i, j] = greenhouse_xyz_from_xy(xg, yg, side, offset_z=0.0024)
        m_rubber.add_grid(gusset_rb, flip=(side < 0))

        # Matte-black weatherstrip channel bridging the divider post between Pezzo 1 and Pezzo 2
        add_cpillar_stroke((-0.161, win_sill_y(-0.161) - 0.002), (-0.144, win_arch_y(-0.144) + 0.002), 0.012, side, m_rubber, offset_z=0.0022, n_seg=14)

        latch_pt = greenhouse_xyz_from_xy(-0.174, win_sill_y(-0.174) + 0.012, side, offset_z=0.0038)
        m_chrome.add_box(latch_pt, [0.011, 0.009, 0.005])

        # PEZZO 2: Finestrino Principale Scendente della Portiera (5-Sided Pentagonal Main Door Drop Window)
        # Starts behind vent-wing bar (-0.157..-0.140), climbs upper A-pillar to roof corner (-0.055), runs to backward-tilted B-pillar (+0.140..+0.172)
        build_window_piece(-0.157, -0.140, 0.140, 0.172, side, nu=32, nv=16, is_pointed_front=False, is_pointed_rear=False)

        # Central Chrome & Matte-Black B-Pillar Post between Pezzo 2 and Pezzo 3 (tilted backward from x_bot=+0.148 to x_top=+0.179)
        add_cpillar_stroke((0.148, win_sill_y(0.148) - 0.003), (0.179, win_arch_y(0.179) + 0.002), 0.018, side, m_rubber, offset_z=0.0021, n_seg=16)
        add_cpillar_stroke((0.148, win_sill_y(0.148) - 0.002), (0.179, win_arch_y(0.179) + 0.002), 0.006, side, m_chrome, offset_z=0.0029, n_seg=16)

        # PEZZO 3: Finestrino Posteriore a Compasso a Punta (Rear Pointed Pop-Out Quarter Window)
        # Starts behind B-pillar (+0.155..+0.187), straight sill to x=0.440 then upward bevel, convex upper arch to (X_WIN_APEX=0.562, Y_WIN_APEX=0.192)
        build_window_piece(0.155, 0.187, X_WIN_APEX, X_WIN_APEX, side, nu=34, nv=16, is_pointed_front=False, is_pointed_rear=True)

        # Vertical Chrome Pop-Out Window Latch Strut near the rear corner of Pezzo 3
        add_cpillar_stroke((0.515, win_sill_y(0.515) + 0.003), (0.515, win_arch_y(0.515) - 0.003), 0.0045, side, m_chrome, offset_z=0.0025, n_seg=6)

        # =====================================================================
        # 2. SEAMLESS C2 PAINTED A-PILLAR, ROOF RAIL & C-PILLAR SAIL PANEL
        # =====================================================================
        # Evaluated directly on uniform vertical x-columns in (x, y) space across the full greenhouse [-0.305, 0.855]!
        cp_nx, cp_ny = 56, 14
        cp_xs = np.linspace(-0.305, 0.855, cp_nx)
        cp_top_grid = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_top_norm = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_low_grid = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_low_norm = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)

        def cp_split_line_y(x_q):
            """Seamless split line behind the pointed window tip (x >= X_WIN_APEX) to the base of the rear hatch (0.855)."""
            w = max(0.0, min(1.0, (x_q - X_WIN_APEX) / (0.855 - X_WIN_APEX)))
            return Y_WIN_APEX + (greenhouse_edge_y(0.855) - Y_WIN_APEX) * w

        for i, xc in enumerate(cp_xs):
            y_low_bound = win_arch_y(xc) if xc <= X_WIN_APEX else cp_split_line_y(xc)
            y_high_bound = greenhouse_edge_y(xc)
            for j, s_y in enumerate(np.linspace(0.0, 1.0, cp_ny)):
                yc = y_low_bound + (y_high_bound - y_low_bound) * s_y
                cp_top_grid[i, j] = greenhouse_xyz_from_xy(xc, yc, side, offset_z=0.0008)
                cp_top_norm[i, j] = greenhouse_xy_norm(xc, yc, side)

            y_sh_bound = float(f_y_shoulder(xc))
            y_sill_bound = win_sill_y(xc) if xc <= X_WIN_APEX else cp_split_line_y(xc)
            for j, s_y in enumerate(np.linspace(0.0, 1.0, cp_ny)):
                yc = y_sh_bound + (y_sill_bound - y_sh_bound) * s_y
                cp_low_grid[i, j] = greenhouse_xyz_from_xy(xc, yc, side, offset_z=0.0008)
                cp_low_norm[i, j] = greenhouse_xy_norm(xc, yc, side)

        m_paint.add_grid(cp_top_grid, grid_norm=cp_top_norm, flip=(side < 0))
        m_paint.add_grid(cp_low_grid, grid_norm=cp_low_norm, flip=(side < 0))

        # =====================================================================
        # 3. ICONIC TRIANGULAR "GTV" C-PILLAR SHIELD & BLACK FASTENER PIN
        # =====================================================================
        p_gtv_left = (0.585, 0.144)
        p_gtv_right = (0.785, 0.152)
        p_gtv_top_l = (0.664, 0.184)
        p_gtv_top_r = (0.678, 0.184)

        for mat_s, w_s, oz_s in ((m_rubber, 0.0034, 0.0024), (m_chrome, 0.0015, 0.0030)):
            add_cpillar_stroke(p_gtv_left, p_gtv_right, w_s, side, mat_s, offset_z=oz_s, n_seg=14)
            add_cpillar_stroke(p_gtv_left, p_gtv_top_l, w_s, side, mat_s, offset_z=oz_s, n_seg=10)
            add_cpillar_stroke(p_gtv_top_r, p_gtv_right, w_s, side, mat_s, offset_z=oz_s, n_seg=10)
            add_cpillar_stroke(p_gtv_top_l, (0.668, 0.178), w_s * 0.85, side, mat_s, offset_z=oz_s, n_seg=4)
            add_cpillar_stroke(p_gtv_top_r, (0.674, 0.178), w_s * 0.85, side, mat_s, offset_z=oz_s, n_seg=4)

        # Bold geometric "G T V" lettering inside the lower half of the triangle
        for s0, s1 in (
            # Letter 'G'
            ((0.650, 0.161), (0.618, 0.160)),
            ((0.618, 0.160), (0.618, 0.148)),
            ((0.618, 0.148), (0.650, 0.149)),
            ((0.650, 0.149), (0.650, 0.155)),
            ((0.650, 0.155), (0.634, 0.155)),
            # Letter 'T'
            ((0.661, 0.162), (0.691, 0.163)),
            ((0.676, 0.163), (0.676, 0.149)),
            # Letter 'V'
            ((0.702, 0.164), (0.718, 0.150)),
            ((0.718, 0.150), (0.734, 0.165)),
        ):
            add_cpillar_stroke(s0, s1, 0.0032, side, m_rubber, offset_z=0.0026, n_seg=5)
            add_cpillar_stroke(s0, s1, 0.0016, side, m_chrome, offset_z=0.0031, n_seg=5)

        # Small Black Cylindrical Fastener Pin on C-pillar above the rear slope of the GTV triangle
        pin_pt = greenhouse_xyz_from_xy(0.758, 0.172, side, offset_z=0.001)
        z_pin = abs(pin_pt[2])
        m_rubber.add_cylinder_z(pin_pt[0], pin_pt[1], side * (z_pin - 0.001), side * (z_pin + 0.0055), 0.0052, segs=20)

        # =====================================================================
        # 5. SCULPTED DOOR SHUT-LINES (Fughe delle Portiere) & ROCKER PANEL SILL
        # =====================================================================
        # 5a. Front Door Shut-Line (Fuga Anteriore: from base of A-pillar x=-0.305 across shoulder to x=-0.332, then vertical down to rocker)
        sh_seam_pts = 20
        fl_seam_pts = 24
        front_seam_sh = np.zeros((3, sh_seam_pts, 3), dtype=np.float32)
        for j, s_sh in enumerate(np.linspace(0.0, 1.0, sh_seam_pts)):
            x_f = -0.332 + 0.027 * ((1.0 - s_sh) ** 1.75)
            for i, dx in enumerate((-0.0022, 0.0, 0.0022)):
                front_seam_sh[i, j] = eval_shoulder(x_f + dx, s_sh, side, offset_z=0.0008, offset_y=0.0005)
        m_rubber.add_grid(front_seam_sh, flip=(side > 0))

        front_seam_fl = np.zeros((3, fl_seam_pts, 3), dtype=np.float32)
        for j, s_v in enumerate(np.linspace(0.0, 0.86, fl_seam_pts)):
            x_f_low = -0.332 + 0.002 * (s_v ** 2)
            for i, dx in enumerate((-0.0022, 0.0, 0.0022)):
                front_seam_fl[i, j] = eval_flank(x_f_low + dx, s_v, side, offset_z=0.0008)
        m_rubber.add_grid(front_seam_fl, flip=(side > 0))

        # 5b. Rear Door Shut-Line (Fuga Posteriore: from base of B-pillar x=+0.148 across shoulder to x=+0.140, then straight down through rocker)
        rear_seam_sh = np.zeros((3, sh_seam_pts, 3), dtype=np.float32)
        for j, s_sh in enumerate(np.linspace(0.0, 1.0, sh_seam_pts)):
            x_r = 0.140 + 0.008 * ((1.0 - s_sh) ** 1.65)
            for i, dx in enumerate((-0.0022, 0.0, 0.0022)):
                rear_seam_sh[i, j] = eval_shoulder(x_r + dx, s_sh, side, offset_z=0.0008, offset_y=0.0005)
        m_rubber.add_grid(rear_seam_sh, flip=(side > 0))

        rear_seam_fl = np.zeros((3, fl_seam_pts, 3), dtype=np.float32)
        for j, s_v in enumerate(np.linspace(0.0, 0.86, fl_seam_pts)):
            x_r_low = 0.140 - 0.002 * s_v
            for i, dx in enumerate((-0.0022, 0.0, 0.0022)):
                rear_seam_fl[i, j] = eval_flank(x_r_low + dx, s_v, side, offset_z=0.0008)
        m_rubber.add_grid(rear_seam_fl, flip=(side > 0))

        # 5c. Horizontal Lower Door Shut-Line & Rocker Panel Crease (Fuga Inferiore Portiera & Longherone Sottoporta)
        door_bot_xs = np.linspace(-0.412, 0.382, 64)
        horiz_seam = np.zeros((len(door_bot_xs), 3, 3), dtype=np.float32)
        rocker_paint = np.zeros((len(door_bot_xs), 5, 3), dtype=np.float32)
        rocker_black = np.zeros((len(door_bot_xs), 4, 3), dtype=np.float32)
        for i, x_q in enumerate(door_bot_xs):
            half_ds = 0.014 if (-0.332 <= x_q <= 0.140) else 0.008
            for j, ds in enumerate((-half_ds, 0.0, half_ds)):
                horiz_seam[i, j] = eval_flank(x_q, 0.730 + ds, side, offset_z=0.0008)
            for j, s_v in enumerate(np.linspace(0.744, 0.860, 5)):
                rocker_paint[i, j] = eval_flank(x_q, s_v, side, offset_z=0.0014)
            for j, s_v in enumerate(np.linspace(0.860, 1.000, 4)):
                rocker_black[i, j] = eval_flank(x_q, s_v, side, offset_z=0.0012)
        m_rubber.add_grid(horiz_seam, flip=(side > 0))
        m_paint.add_grid(rocker_paint, flip=(side > 0))
        m_rubber.add_grid(rocker_black, flip=(side > 0))

        # 5d. Rear Quarter Lower Vertical Joint & Black Lower Rear Valence behind Rear Wheel Arch (from alfa-profilo.jpeg)
        rq_seam = np.zeros((3, 14, 3), dtype=np.float32)
        for j, s_v in enumerate(np.linspace(0.45, 0.88, 14)):
            for i, dx in enumerate((-0.0018, 0.0, 0.0018)):
                rq_seam[i, j] = eval_flank(0.708 + dx, s_v, side, offset_z=0.0008)
        m_rubber.add_grid(rq_seam, flip=(side > 0))

        rq_black_xs = np.linspace(0.702, 0.905, 20)
        rq_black = np.zeros((len(rq_black_xs), 4, 3), dtype=np.float32)
        for i, x_q in enumerate(rq_black_xs):
            for j, s_v in enumerate(np.linspace(0.84, 1.00, 4)):
                rq_black[i, j] = eval_flank(x_q, s_v, side, offset_z=0.0012)
        m_rubber.add_grid(rq_black, flip=(side > 0))

        # =====================================================================
        # 6. CONFORMAL RECESSED DOOR HANDLE & KEYHOLE LOCK CYLINDER (Maniglia Incassata e Nottolino)
        # =====================================================================
        dh_bezel = np.zeros((8, 6, 3), dtype=np.float32)
        for i, x_h in enumerate(np.linspace(0.042, 0.116, 8)):
            for j, s_h in enumerate(np.linspace(0.46, 0.86, 6)):
                dh_bezel[i, j] = eval_shoulder(x_h, s_h, side, offset_z=0.0016, offset_y=0.0006)
        m_chrome.add_grid(dh_bezel, flip=(side > 0))

        dh_pocket = np.zeros((8, 6, 3), dtype=np.float32)
        for i, x_h in enumerate(np.linspace(0.046, 0.112, 8)):
            for j, s_h in enumerate(np.linspace(0.51, 0.81, 6)):
                dh_pocket[i, j] = eval_shoulder(x_h, s_h, side, offset_z=0.0024, offset_y=0.0009)
        m_rubber.add_grid(dh_pocket, flip=(side > 0))

        dh_lever = np.zeros((6, 5, 3), dtype=np.float32)
        for i, x_h in enumerate(np.linspace(0.048, 0.083, 6)):
            for j, s_h in enumerate(np.linspace(0.54, 0.78, 5)):
                dh_lever[i, j] = eval_shoulder(x_h, s_h, side, offset_z=0.0036, offset_y=0.0014)
        m_chrome.add_grid(dh_lever, flip=(side > 0))

        lock_pt = eval_flank(0.096, 0.105, side, offset_z=0.0)
        z_lock = abs(lock_pt[2])
        m_rubber.add_cylinder_z(lock_pt[0], lock_pt[1], side * (z_lock - 0.001), side * (z_lock + 0.0018), 0.0078, segs=24)
        m_chrome.add_cylinder_z(lock_pt[0], lock_pt[1], side * (z_lock + 0.0005), side * (z_lock + 0.0030), 0.0060, segs=24)
        m_rubber.add_box([lock_pt[0], lock_pt[1], side * (z_lock + 0.0032)], [0.0018, 0.0068, 0.0015])

        # Front Fender Amber Side Repeater (mounted just below the Giugiaro side crease at x = -0.805)
        m_chrome.add_box([-0.805, 0.020, side * 0.371], [0.026, 0.015, 0.006], rotation_y=-side * 0.08)
        m_amber.add_box([-0.805, 0.020, side * 0.374], [0.022, 0.011, 0.008], rotation_y=-side * 0.08)

    # Detailed Matte-Black Circular Fuel Filler Cap on Left Rear Quarter Panel (+Z, right below pointed quarter window tip)
    fuel_pt = eval_shoulder(0.542, 0.32, 1.0, offset_z=0.0)
    z_fuel = abs(fuel_pt[2])
    # Outer recessed black ring + circular cap disc + horizontal finger grip bar + central chrome keyhole
    m_rubber.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel - 0.002, z_fuel + 0.0025, 0.0225, segs=36)
    m_rubber.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel + 0.001, z_fuel + 0.0045, 0.0195, segs=36)
    m_rubber.add_box([fuel_pt[0], fuel_pt[1], z_fuel + 0.0055], [0.034, 0.0075, 0.0035], rotation_x=-0.32)
    m_chrome.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel + 0.0035, z_fuel + 0.0072, 0.0034, segs=18)

    # =========================================================================
    # 7. PEDESTAL CHROME EXTERIOR MIRROR ON DRIVER DOOR (+Z, Specchietto Cromato Alfa Romeo)
    # =========================================================================
    mir_base = eval_shoulder(-0.172, 0.25, 1.0, offset_z=0.001, offset_y=0.0005)
    mx, my, mz = mir_base[0], mir_base[1], mir_base[2]
    # Matte-black rubber mounting gasket & sculpted chrome pedestal foot
    m_rubber.add_box([mx, my, mz + 0.0015], [0.032, 0.008, 0.006], rotation_x=-0.38)
    m_chrome.add_box([mx, my + 0.0035, mz + 0.0075], [0.026, 0.009, 0.012], rotation_x=-0.28)
    # Angled chrome neck stalk rising outward and upward
    m_chrome.add_box([mx + 0.003, my + 0.0135, mz + 0.0175], [0.009, 0.022, 0.011], rotation_x=-0.42, rotation_z=-0.14)
    # Beveled rectangular chrome mirror housing + dark reflective mirror glass face
    m_chrome.add_box([mx + 0.008, my + 0.026, mz + 0.031], [0.034, 0.029, 0.048], rotation_y=-0.10)
    m_chrome.add_box([mx + 0.002, my + 0.026, mz + 0.031], [0.028, 0.023, 0.042], rotation_y=-0.10)
    m_glass.add_box([mx + 0.016, my + 0.026, mz + 0.031], [0.004, 0.024, 0.043], rotation_y=-0.10)

    # Articulated Twin Windshield Wipers + 20-Slot Stamped Cowl Grilles + Flush Hood Washer Nozzles
    for z_pivot in (-0.165, 0.055):
        y_piv = hood_surface_height(-0.318, abs(z_pivot)) + 0.003
        # Wiper pivot nut, metallic arm & matte-black rubber blade at base of windshield
        m_chrome.add_box([-0.318, y_piv, z_pivot], [0.008, 0.006, 0.008])
        m_chrome.add_box([-0.302, y_piv + 0.005, z_pivot + 0.055], [0.008, 0.004, 0.115], rotation_y=0.14)
        m_rubber.add_box([-0.292, y_piv + 0.009, z_pivot + 0.095], [0.006, 0.005, 0.165], rotation_y=0.08)

    for side in (-1.0, 1.0):
        # 20 individual stamped longitudinal air intake slots in the painted cowl panel (from alfa-raduno.jpeg)
        for z_slot in np.linspace(0.048, 0.218, 20):
            y_slot = hood_surface_height(-0.331, z_slot) + 0.0007
            m_rubber.add_box([-0.331, y_slot, side * z_slot], [0.024, 0.0016, 0.0036], rotation_z=0.05)

        # Dual-jet black windshield washer nozzles mounted flush on the hood panel
        x_noz, z_noz = -0.455, 0.148
        y_noz = hood_surface_height(x_noz, z_noz) + 0.0025
        m_rubber.add_box([x_noz, y_noz, side * z_noz], [0.010, 0.0055, 0.0065], rotation_z=0.06)

    # Front grille recess, smooth lower front valence under bumper & rear Kamm tail panel
    m_rubber.add_box([-0.942, 0.002, 0.0], [0.025, 0.066, 0.610])
    m_paint.add_box([-0.946, -0.038, 0.0], [0.024, 0.022, 0.610])
    m_paint.add_box([-0.930, -0.082, 0.0], [0.028, 0.032, 0.560], rotation_z=0.28)
    m_rubber.add_box([-0.912, -0.106, 0.0], [0.024, 0.022, 0.520], rotation_z=0.22)
    TAIL_YC = 0.0365  # slab centre height; face leans 0.06 rad (top further back)
    m_paint.add_box([0.924, TAIL_YC, 0.0], [0.024, 0.167, 0.610], rotation_z=-0.06)

    # Slim matte-black underbody floor pan, tucked inside the sills and kept clear of the tyres:
    # - central section between the wheel arches spans the full width up to the rocker sills
    # - nose & tail sections stay narrower than the tyres' inner faces (|z| = 0.235) and never protrude past the valence
    FLOOR_Y = -0.172
    m_rubber.add_box([-0.003, FLOOR_Y, 0.0], [0.770, 0.010, 0.660])            # between the arches
    m_rubber.add_box([-0.575, FLOOR_Y + 0.010, 0.0], [0.360, 0.010, 0.400])    # front, between the wheels (stops at x=-0.755)
    m_rubber.add_box([-0.815, -0.136, 0.0], [0.130, 0.010, 0.380], rotation_z=0.18) # front angled splash guard behind valence
    m_rubber.add_box([0.570, FLOOR_Y + 0.010, 0.0], [0.360, 0.010, 0.400])     # rear, between the wheels (stops at x=0.750)
    m_rubber.add_box([0.795, -0.142, 0.0], [0.120, 0.010, 0.380], rotation_z=-0.16) # rear angled splash guard behind Kamm tail

    # Open wheel-arch liners: thin curved shells ABOVE the tyres tucked safely inside the wheel wells
    # (r = 0.176, z_out = 0.310, well clear of the outer painted fender arch at z = 0.380+) + inner wall.
    LINER_R = 0.176
    LINER_Z_IN = 0.212
    a_floor = math.asin(max(-1.0, min(1.0, (FLOOR_Y - AXLE_Y) / LINER_R)))
    liner_angles = np.linspace(a_floor, math.pi - a_floor, 36)
    for ax in (FRONT_AXLE_X, REAR_AXLE_X):
        for side in (-1.0, 1.0):
            z_out = side * 0.310
            shell = np.zeros((len(liner_angles), 2, 3), dtype=np.float32)
            wall = np.zeros((len(liner_angles), 2, 3), dtype=np.float32)
            for i, a in enumerate(liner_angles):
                px = ax + LINER_R * math.cos(a)
                py = AXLE_Y + LINER_R * math.sin(a)
                shell[i, 0] = [px, py, side * LINER_Z_IN]
                shell[i, 1] = [px, py, z_out]
                wall[i, 0] = [px, py, side * LINER_Z_IN]
                wall[i, 1] = [px, FLOOR_Y, side * LINER_Z_IN]
            m_rubber.add_grid(shell, flip=(side < 0))
            m_rubber.add_grid(wall, flip=(side > 0))

    # =========================================================================
    # 3. FRONT CALANDRA, SCUDETTO ALFA ROMEO, CHROME BAFFO & 4 CARELLO HEADLIGHTS
    # =========================================================================
    # Horizontal black slats across the recessed upper grille
    for y_slat in np.linspace(-0.024, 0.026, 7):
        m_rubber.add_box([-0.950, y_slat, 0.0], [0.012, 0.0035, 0.620])

    # Signature single horizontal chrome bar ("baffo cromato") on left & right of Scudetto
    for side in (-1.0, 1.0):
        m_chrome.add_box([-0.955, 0.002, side * 0.098], [0.012, 0.0065, 0.098])
        # Lower front valence horizontal air slots (between grille and bumper) with chrome surround
        m_rubber.add_box([-0.954, -0.038, side * 0.096], [0.014, 0.011, 0.106])
        m_chrome.add_box([-0.956, -0.032, side * 0.096], [0.014, 0.0025, 0.108])
        m_chrome.add_box([-0.956, -0.044, side * 0.096], [0.014, 0.0025, 0.108])

    # Central 3D Chrome Alfa Romeo Scudetto Shield (Smooth 64-segment swept tubular frame + inner slats)
    scud_segs = 64
    scud_r_tube = 0.0052
    t_segs = 14
    scud_grid = np.zeros((scud_segs, t_segs, 3), dtype=np.float32)

    # Parametric heart-shield contour in (y, z) from top-center -> top-right corner -> bottom point -> top-left corner -> top-center
    spine_pts = []
    for i in range(scud_segs):
        u = i / scud_segs
        ang = u * 2.0 * math.pi
        # Classic Alfa Scudetto: wide flat top at y=+0.030 (|z| up to 0.048), tapering V-sides down to rounded point at y=-0.055, z=0
        s = math.sin(ang)
        c = math.cos(ang)
        if c >= 0:
            # Upper half / top bar with rounded corners
            y_p = 0.030 - 0.012 * (1.0 - (c ** 0.35))
            z_p = 0.048 * math.copysign(abs(s) ** 0.65, s)
        else:
            # Lower V-taper down to rounded tip at y = -0.055 (reaching down toward the chrome bumper)
            t_low = abs(c)
            y_p = 0.018 - 0.073 * (t_low ** 0.85)
            z_p = 0.048 * s * ((1.0 - t_low) ** 0.58 + 0.08 * (1.0 - t_low))
        # Forward rake following the shark-nose angle
        x_p = -0.962 + (0.030 - y_p) * 0.075
        spine_pts.append(np.array([x_p, y_p, z_p], dtype=np.float64))

    spine_pts = np.array(spine_pts)
    for i in range(scud_segs):
        p_prev = spine_pts[(i - 1) % scud_segs]
        p_curr = spine_pts[i]
        p_next = spine_pts[(i + 1) % scud_segs]
        tang = p_next - p_prev
        tang /= np.linalg.norm(tang) + 1e-9
        n1 = np.array([-1.0, 0.0, 0.0], dtype=np.float64)
        n2 = np.cross(tang, n1)
        n2 /= np.linalg.norm(n2) + 1e-9
        for j in range(t_segs):
            phi = (j / t_segs) * 2.0 * math.pi
            offset = scud_r_tube * (math.cos(phi) * n1 + math.sin(phi) * n2)
            scud_grid[i, j] = p_curr + offset

    m_chrome.add_grid(scud_grid, flip=False, close_u=True, close_v=True)

    # Dark recessed backing inside Scudetto + 5 horizontal chrome slats + central vertical chrome spine
    for y_s in [-0.040, -0.028, -0.016, -0.004, 0.008]:
        w_slat = max(0.012, 0.018 + (y_s + 0.046) * 0.96)
        x_s = -0.959 + (0.030 - y_s) * 0.075
        m_chrome.add_box([x_s, y_s, 0.0], [0.006, 0.0028, w_slat])
        m_rubber.add_box([x_s + 0.003, y_s, 0.0], [0.004, 0.009, w_slat * 0.96])

    # Central vertical chrome spine inside Scudetto below the circular badge
    m_chrome.add_box([-0.958, -0.018, 0.0], [0.007, 0.062, 0.0040], rotation_z=0.075)

    # Sculpted Circular Chrome Bezel at top center of Scudetto for the Alfa Romeo Milano Enameled Badge
    m_chrome.add_cylinder_x(-0.968, -0.957, 0.020, 0.0, 0.0160, r_inner=0.0136, segs=48, bevel=0.0012)
    m_chrome.add_cylinder_x(-0.966, -0.957, 0.020, 0.0, 0.0140, r_inner=0.0, segs=48)

    # 4 Circular Carello Headlights with deep chrome bezels
    for side in (-1.0, 1.0):
        for z_pos, radius in [(0.258, 0.033), (0.180, 0.030)]:
            cz = side * z_pos
            cy = 0.004
            m_chrome.add_cylinder_x(-0.962, -0.942, cy, cz, radius + 0.0045, r_inner=radius - 0.002, segs=36, bevel=0.001)
            m_headlight.add_cylinder_x(-0.960, -0.948, cy, cz, radius - 0.001, r_inner=0.0, segs=36, bevel=0.002)

    # =========================================================================
    # 4. FRONT & REAR CHROME BLADE BUMPERS + RUBBER OVERRIDERS + BICOLOR TURN SIGNALS
    # =========================================================================
    # Bicolor Front Turn Signals / Parking Lights mounted ABOVE the bumper (amber outer, clear inner)
    for side in (-1.0, 1.0):
        m_chrome.add_box([-0.955, -0.038, side * 0.224], [0.016, 0.016, 0.096])
        m_amber.add_box([-0.958, -0.038, side * 0.246], [0.016, 0.013, 0.048])
        m_headlight.add_box([-0.958, -0.038, side * 0.198], [0.016, 0.013, 0.044])

    # Front Chrome Blade Bumper with black rubber insert strip & rubber overriders (rostri)
    m_chrome.add_box([-0.966, -0.068, 0.0], [0.034, 0.025, 0.665])
    m_rubber.add_box([-0.980, -0.068, 0.0], [0.008, 0.010, 0.655])
    for side in (-1.0, 1.0):
        m_chrome.add_box([-0.918, -0.068, side * 0.342], [0.098, 0.024, 0.028], rotation_y=side * 0.22)
        m_rubber.add_box([-0.974, -0.066, side * 0.162], [0.042, 0.044, 0.036])

    # =========================================================================
    # 4b. REAR END — rebuilt from "WhatsApp Image 2026-10-18 at 19.36.00.jpeg"
    # Photo-derived scale at the tail plane: 1 px = 0.000426 u horizontally, 0.000405 u vertically
    # (calibrated on the bumper blade y = -0.055 and the decklid trailing edge y = +0.112).
    # Anything marked [PLACEHOLDER] could not be measured reliably from the single photo.
    # =========================================================================
    def tail_face_x(y_q):
        """World x of the (3.4 deg leaning) Kamm panel face at height y_q."""
        return 0.936 + (y_q - TAIL_YC) * 0.06

    # --- Chrome blade bumper: thin top lip + black rubber band + deep lower blade (3 layers in photo) ---
    m_chrome.add_box([0.948, -0.0375, 0.0], [0.030, 0.007, 0.650])      # thin upper chrome lip
    m_rubber.add_box([0.950, -0.0465, 0.0], [0.028, 0.012, 0.650])      # black rubber band between lips
    m_chrome.add_box([0.950, -0.0630, 0.0], [0.034, 0.0235, 0.650])     # lower chrome blade
    for side in (-1.0, 1.0):
        # Wrap-around bumper ends
        m_chrome.add_box([0.900, -0.055, side * 0.336], [0.095, 0.026, 0.028], rotation_y=-side * 0.20)
        # Two big black rubber overriders sitting INBOARD, like the photo (|z| 0.222 .. 0.298)
        m_rubber.add_box([0.957, -0.052, side * 0.260], [0.038, 0.059, 0.077])
        # [PLACEHOLDER] rounded/chamfered edges of the overriders (currently sharp boxes)

    # --- Black lower apron under the bumper (visible in the photo between bumper and ground) ---
    m_rubber.add_box([0.926, -0.085, 0.0], [0.026, 0.078, 0.600], rotation_z=-0.06)

    # --- Rear lamp clusters: raised painted bezel, red lamp (top) + amber indicator (bottom) ---
    CLUSTER_Y = (0.0125, 0.105)
    for side in (-1.0, 1.0):
        def S(poly):
            return [(side * z, y) for z, y in poly]

        bezel = [(0.142, 0.105), (0.300, 0.105), (0.305, 0.090), (0.305, 0.028), (0.300, 0.0125), (0.142, 0.0125)]
        add_prism_x(m_paint, S(bezel), 0.930, 0.944)

        # Red tail lamp: vertical inner end, slanted outer end
        red = [(0.153, 0.0975), (0.2785, 0.0975), (0.298, 0.0675), (0.153, 0.0675)]
        add_prism_x(m_chrome, S(expand_poly(red, 0.003)), 0.943, 0.9455)
        add_prism_x(m_taillight, S(red), 0.944, 0.9475)
        # Orange-red reflex panel at the inner end of the red lamp ([PLACEHOLDER] exact tint -> uses amber material)
        reflex = [(0.165, 0.0936), (0.2055, 0.0936), (0.2055, 0.0746), (0.165, 0.0746)]
        add_prism_x(m_amber, S(reflex), 0.9465, 0.9485)

        # Amber rear indicator with clear/white reflector at the inner end
        amber = [(0.153, 0.0535), (0.3025, 0.0535), (0.2955, 0.0240), (0.153, 0.0240)]
        add_prism_x(m_chrome, S(expand_poly(amber, 0.003)), 0.943, 0.9455)
        add_prism_x(m_amber, S(amber), 0.944, 0.9475)
        clear = [(0.155, 0.0505), (0.202, 0.0505), (0.202, 0.0270), (0.155, 0.0270)]
        add_prism_x(m_headlight, S(clear), 0.9465, 0.9485)

    # --- Licence plate pocket: thin dark crease outline (pocket z +-0.136, y 0.008 .. 0.097) ---
    P_TOP, P_BOT, P_HALF = 0.097, 0.008, 0.136
    m_rubber.add_box([tail_face_x(P_TOP) + 0.0003, P_TOP, 0.0], [0.003, 0.0016, 2 * P_HALF + 0.0016])
    m_rubber.add_box([tail_face_x(P_BOT) + 0.0003, P_BOT, 0.0], [0.003, 0.0016, 2 * P_HALF + 0.0016])
    for side in (-1.0, 1.0):
        y_mid = 0.5 * (P_TOP + P_BOT)
        m_rubber.add_box([tail_face_x(y_mid) + 0.0003, y_mid, side * P_HALF], [0.003, P_TOP - P_BOT, 0.0016])

    # --- Two small black pods under the ALFA ROMEO lettering (asymmetric in the photo) ---
    m_rubber.add_box([tail_face_x(0.1035) + 0.001, 0.1035, 0.065], [0.004, 0.0065, 0.035])
    m_rubber.add_box([tail_face_x(0.1035) + 0.001, 0.1035, -0.060], [0.004, 0.0065, 0.047])

    # --- Decklid lock + emblem base: the Alfa badge sits HIGH on the hatch sill, the lock below it ---
    def deck_frame(x_q):
        y_q = float(f_y_center(x_q))
        slope = (float(f_y_center(x_q + 0.004)) - float(f_y_center(x_q - 0.004))) / 0.008
        n_vec = np.array([-slope, 1.0, 0.0])
        n_vec /= np.linalg.norm(n_vec)
        return y_q, n_vec

    EMBLEM_X, LOCK_X = 0.862, 0.905
    ey, en = deck_frame(EMBLEM_X)
    add_cyl_axis(m_chrome, [EMBLEM_X, ey - 0.0004, 0.0], en, 0.0152, 0.0016, segs=48)
    add_cyl_axis(m_chrome, [EMBLEM_X, ey + 0.0010, 0.0], en, 0.0152, 0.0014, r_in=0.0128, segs=48)
    ly, ln = deck_frame(LOCK_X)
    add_cyl_axis(m_chrome, [LOCK_X, ly - 0.0004, 0.0], ln, 0.0068, 0.0016, segs=32)
    add_cyl_axis(m_rubber, [LOCK_X, ly + 0.0008, 0.0], ln, 0.0036, 0.0010, segs=24)
    print(f"[rear] emblem  x={EMBLEM_X} y={ey:.5f} normal=({en[0]:.4f},{en[1]:.4f})")
    print(f"[rear] lock    x={LOCK_X} y={ly:.5f} normal=({ln[0]:.4f},{ln[1]:.4f})")

    # --- Exhaust: single pipe offset to +Z, emerges from under the apron and ARCS DOWNWARD ---
    ex_p0 = np.array([0.795, -0.098, 0.012])
    ex_p1 = np.array([0.900, -0.098, 0.030])
    ex_p2 = np.array([0.945, -0.098, 0.072])
    ex_p3 = np.array([0.972, -0.136, 0.118])
    spine = []
    for tt in np.linspace(0.0, 1.0, 22):
        spine.append(((1 - tt) ** 3) * ex_p0 + 3 * ((1 - tt) ** 2) * tt * ex_p1
                     + 3 * (1 - tt) * tt * tt * ex_p2 + (tt ** 3) * ex_p3)
    # Photo: dull gun-metal pipe (dark) with a bright rolled tip -> body in dark rubber material, rim in chrome
    t_end = add_tube(m_rubber, spine, 0.0125, segs=28, r_inner_cap=0.0098)
    add_cyl_axis(m_chrome, spine[-1] - t_end * 0.005, t_end, 0.0131, 0.0052, r_in=0.0096, segs=28)
    # Dark interior of the tailpipe ([PLACEHOLDER] muffler box / hanger visible behind pipe not modelled)
    add_cyl_axis(m_rubber, spine[-1] - t_end * 0.014, t_end, 0.0094, 0.0100, segs=28)

    # =========================================================================
    # 5. FOUR TRUE 3D CAMPAGNOLO / FPS ALFA ROMEO ALLOY WHEELS & PIRELLI TIRES
    # Matching alfa-parco.jpeg & alfa-profilo.jpeg:
    # - Stepped deep-dish machined outer rim lip (canale esterno a gradini) + chrome valve stem
    # - 20 true open rectangular radial cooling slots (20 feritoie rettangolari passanti)
    #   with 20 raised 3D radial alloy spokes over a dark brake/hub backing
    # - Sculpted inner dome ring & recessed central lug bowl
    # - 4x98 PCD: 4 recessed lug pockets with 4 chrome hexagonal lug bolts (4 colonnette)
    # - Protruding metallic center cap (coprimozzo centrale metallizzato) with beveled bezel
    # =========================================================================
    R_TIRE = 0.168
    R_RIM = 0.108
    R_HUB = 0.023

    def add_wheel(ax, ay, side, m_rubber, m_rim, m_chrome):
        """Builds one wheel into the given builders. Called with ax=ay=0 so the geometry is
        centred on the hub and the exported node can spin around its local Z axis."""
        z_inner = side * 0.235
        z_outer = side * 0.368
        z_face = side * 0.354

        # 1. Pirelli Cinturato CN36 Tire Carcass & Sidewall Profile (64 angular segments)
        u_segs = 18
        v_segs = 64
        tire_grid = np.zeros((u_segs, v_segs, 3), dtype=np.float32)
        u_angles = np.linspace(-math.pi * 0.86, math.pi * 0.86, u_segs)
        r_mid = 0.5 * (R_TIRE + R_RIM)
        r_tube = 0.5 * (R_TIRE - R_RIM)
        z_mid = 0.5 * (z_inner + z_outer)
        z_half_w = 0.5 * abs(z_outer - z_inner)

        for i, ua in enumerate(u_angles):
            su = math.sin(ua)
            cu = math.cos(ua)
            # Subtle tread shoulder block & sidewall contour
            tread_groove = -0.0015 * math.cos(ua * 10.0) if abs(ua) < 0.55 else 0.0
            r_curr = r_mid + r_tube * (abs(cu) ** 0.62) * (1.0 if cu >= 0 else -1.0) + tread_groove
            z_curr = z_mid + side * z_half_w * (abs(su) ** 0.74) * (1.0 if su >= 0 else -1.0)
            for j in range(v_segs):
                va = (j / v_segs) * 2.0 * math.pi
                tire_grid[i, j] = [
                    ax + r_curr * math.cos(va),
                    ay + r_curr * math.sin(va),
                    z_curr,
                ]
        m_rubber.add_grid(tire_grid, flip=(side > 0), close_v=True)

        # 2. Dark Recessed Brake Disc & Backing Plate behind the open 20 wheel slots
        m_rubber.add_cylinder_z(
            ax, ay,
            z_face - side * 0.014,
            z_face - side * 0.0035,
            R_RIM * 0.96,
            segs=48
        )

        # 3. Continuous Stepped Alloy Rim Profile (from outer bead flange r=0.108 down to center cap r=0.023)
        # Note: Between r=0.062 and r=0.083 (the 20-slot zone), the base surface dips back into the
        # dark recess so the 20 individual 3D radial alloy spokes stand out in crisp relief!
        profile_rz = [
            # (radius, z_offset_from_z_face)
            (0.1095,  0.0085),  # Outer tire bead flange lip
            (0.1055,  0.0110),  # Bright outer rim flange crest (bordino esterno)
            (0.1015,  0.0045),  # First machined step inward
            (0.0955,  0.0035),  # Mid step ledge
            (0.0905, -0.0020),  # Deep-dish barrel channel (canale profondo)
            (0.0865, -0.0020),  # Inner corner of barrel channel
            (0.0840,  0.0045),  # Raised outer perimeter ring around the 20 slots
            (0.0815,  0.0042),  # Outer edge of slot ring
            (0.0625,  0.0042),  # Inner edge of slot ring (bridged by the 20 radial spokes below)
            (0.0595,  0.0068),  # Raised convex inner alloy ring (anello bombato interno)
            (0.0525,  0.0075),  # Peak of inner alloy dome ring
            (0.0465,  0.0045),  # Inner shoulder of dome ring
            (0.0425, -0.0025),  # Recessed central lug-nut bowl (vano colonnette)
            (0.0255, -0.0025),  # Inner floor of lug-nut bowl around center cap
            (0.0235,  0.0020),  # Base collar of central hubcap
        ]

        # Build the outer stepped lip (r = 0.1095 down to 0.0815) and inner sculpted hub ring (r = 0.0625 down to 0.0235)
        # leaving the slot band (0.0625 .. 0.0815) open to the dark backing except where the 20 radial spokes cross!
        outer_rz = profile_rz[:8]   # r = 0.1095 .. 0.0815
        inner_rz = profile_rz[8:]   # r = 0.0625 .. 0.0235

        a_segs = 80
        for ring_rz in (outer_rz, inner_rz):
            ring_grid = np.zeros((len(ring_rz), a_segs, 3), dtype=np.float32)
            for i, (r_val, dz_val) in enumerate(ring_rz):
                for j in range(a_segs):
                    va = (j / a_segs) * 2.0 * math.pi
                    ring_grid[i, j] = [
                        ax + r_val * math.cos(va),
                        ay + r_val * math.sin(va),
                        z_face + side * dz_val,
                    ]
            m_rim.add_grid(ring_grid, flip=(side > 0), close_v=True)

        # 4. 20 True 3D Radial Alloy Spokes separating the 20 Open Rectangular Black Cooling Slots
        # (Stile Campagnolo / FPS originale visibile in alfa-parco.jpeg e alfa-profilo.jpeg)
        num_slots = 20
        r_slot_in = 0.0615
        r_slot_out = 0.0825
        for k in range(num_slots):
            ang_c = (k / num_slots) * 2.0 * math.pi
            # Spoke angular half-width (~42% metal spoke, ~58% open black rectangular slot)
            d_ang = (2.0 * math.pi / num_slots) * 0.21
            a0 = ang_c - d_ang
            a1 = ang_c + d_ang

            # 3D spoke with beveled side walls from z_face - 0.003 up to z_face + 0.0045
            spoke_angles = [a0 - 0.012, a0, a1, a1 + 0.012]
            spoke_z_offs = [-0.0030, 0.0044, 0.0044, -0.0030]
            spoke_radii = [r_slot_in, 0.5 * (r_slot_in + r_slot_out), r_slot_out]

            spoke_grid = np.zeros((len(spoke_radii), len(spoke_angles), 3), dtype=np.float32)
            for ir, rr in enumerate(spoke_radii):
                for ia, (aa, zz) in enumerate(zip(spoke_angles, spoke_z_offs)):
                    spoke_grid[ir, ia] = [
                        ax + rr * math.cos(aa),
                        ay + rr * math.sin(aa),
                        z_face + side * zz,
                    ]
            m_rim.add_grid(spoke_grid, flip=(side < 0))

        # 5. 4x98 PCD: 4 Recessed Dark Lug Wells + 4 Chrome Hexagonal Lug Bolts (Bulloni Ruota Cromati)
        r_lug_pcd = 0.0345
        for k in range(4):
            la = (k / 4.0) * 2.0 * math.pi + math.pi * 0.25
            lx = ax + r_lug_pcd * math.cos(la)
            ly = ay + r_lug_pcd * math.sin(la)
            # Dark recessed lug pocket collar
            m_rubber.add_cylinder_z(
                lx, ly,
                z_face - side * 0.003,
                z_face + side * 0.0015,
                0.0062,
                r_inner=0.0,
                segs=16
            )
            # Bright chrome hexagonal lug bolt head inside the pocket
            m_chrome.add_cylinder_z(
                lx, ly,
                z_face - side * 0.001,
                z_face + side * 0.0065,
                0.0040,
                r_inner=0.0,
                segs=6
            )

        # Chrome Tire Valve Stem on the outer rim lip
        val_ang = -math.pi * 0.35
        vx = ax + 0.092 * math.cos(val_ang)
        vy = ay + 0.092 * math.sin(val_ang)
        m_chrome.add_cylinder_z(vx, vy, z_face - side * 0.001, z_face + side * 0.007, 0.0022, segs=8)

        # 6. Protruding Sculpted Metallic Center Cap (Coprimozzo Centrale Metallizzato Alfa Romeo)
        # Base metallic cup cylinder + beveled chrome crown ring at z = z_face + side * 0.0155
        m_rim.add_cylinder_z(
            ax, ay,
            z_face - side * 0.001,
            z_face + side * 0.0135,
            0.0225,
            r_inner=0.0,
            segs=48
        )
        m_chrome.add_cylinder_z(
            ax, ay,
            z_face + side * 0.0120,
            z_face + side * 0.0158,
            0.0212,
            r_inner=0.0182,
            segs=48
        )
        m_rim.add_cylinder_z(
            ax, ay,
            z_face + side * 0.0135,
            z_face + side * 0.0155,
            0.0185,
            r_inner=0.0,
            segs=48
        )

    # Each wheel gets its own builders (same material indices as the body) so it exports as a
    # separate node: Wheel_FL / Wheel_FR / Wheel_RL / Wheel_RR ("L" = +Z side, "R" = -Z side).
    wheel_sets = []
    for ax, axle_tag in ((FRONT_AXLE_X, "F"), (REAR_AXLE_X, "R")):
        for side, side_tag in ((1.0, "L"), (-1.0, "R")):
            w_rubber = MeshBuilder("Wheel_Rubber", m_rubber.material_idx)
            w_rim = MeshBuilder("Wheel_Rim", m_rim.material_idx)
            w_chrome = MeshBuilder("Wheel_Chrome", m_chrome.material_idx)
            add_wheel(0.0, 0.0, side, w_rubber, w_rim, w_chrome)
            wheel_sets.append({
                "name": f"Wheel_{axle_tag}{side_tag}",
                "translation": [float(ax), float(AXLE_Y), 0.0],
                "builders": [w_chrome, w_rubber, w_rim],
            })

    # =========================================================================
    # 6. INTERIOR CABIN: DASHBOARD POD, WOOD STEERING WHEEL & BUCKET SEATS
    # =========================================================================
    m_interior.add_box([0.12, -0.04, 0.0], [0.85, 0.03, 0.58])
    m_interior.add_box([0.58, 0.09, 0.0], [0.36, 0.03, 0.52])
    m_interior.add_box([-0.22, 0.095, 0.0], [0.16, 0.065, 0.58])
    m_interior.add_box([-0.17, 0.132, 0.145], [0.10, 0.042, 0.16])
    for side in (-1.0, 1.0):
        m_interior.add_box([0.06, 0.01, side * 0.145], [0.22, 0.06, 0.19])
        m_interior.add_box([0.16, 0.115, side * 0.145], [0.06, 0.20, 0.18], rotation_z=-0.18)
        m_interior.add_box([0.19, 0.225, side * 0.145], [0.045, 0.055, 0.11])
        m_interior.add_box([0.42, 0.03, side * 0.135], [0.18, 0.05, 0.18])
        m_interior.add_box([0.50, 0.12, side * 0.135], [0.05, 0.16, 0.18], rotation_z=-0.20)

    sw_cx, sw_cy, sw_cz = -0.105, 0.125, 0.145
    m_wood.add_cylinder_x(sw_cx - 0.006, sw_cx + 0.006, sw_cy, sw_cz, 0.058, r_inner=0.048, segs=32)
    m_chrome.add_cylinder_x(sw_cx - 0.035, sw_cx + 0.004, sw_cy, sw_cz, 0.012, segs=16)

    # =========================================================================
    # 7. EXPORT COMPLETE MULTI-MESH, MULTI-MATERIAL GLB
    # =========================================================================
    builders = [
        m_paint,
        m_chrome,
        m_glass,
        m_rubber,
        m_rim,
        m_headlight,
        m_amber,
        m_taillight,
        m_interior,
        m_wood,
    ]

    materials = [
        {
            "name": "CarPaint",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.737, 0.780, 0.824, 1.0],
                "metallicFactor": 0.52,
                "roughnessFactor": 0.26,
            },
        },
        {
            "name": "Chrome",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.95, 0.97, 0.99, 1.0],
                "metallicFactor": 0.96,
                "roughnessFactor": 0.07,
            },
        },
        {
            "name": "Glass",
            "alphaMode": "BLEND",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.12, 0.22, 0.20, 0.58],
                "metallicFactor": 0.15,
                "roughnessFactor": 0.04,
            },
        },
        {
            "name": "RubberBlack",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.075, 0.080, 0.088, 1.0],
                "metallicFactor": 0.04,
                "roughnessFactor": 0.84,
            },
        },
        {
            "name": "AlloyRim",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.83, 0.86, 0.90, 1.0],
                "metallicFactor": 0.82,
                "roughnessFactor": 0.20,
            },
        },
        {
            "name": "HeadlightLens",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.96, 0.98, 1.0, 1.0],
                "metallicFactor": 0.25,
                "roughnessFactor": 0.04,
            },
            "emissiveFactor": [0.15, 0.16, 0.18],
        },
        {
            "name": "AmberLens",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.90, 0.45, 0.05, 1.0],
                "metallicFactor": 0.10,
                "roughnessFactor": 0.12,
            },
            "emissiveFactor": [0.08, 0.03, 0.0],
        },
        {
            "name": "RedTaillight",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.72, 0.07, 0.09, 1.0],
                "metallicFactor": 0.10,
                "roughnessFactor": 0.12,
            },
            "emissiveFactor": [0.08, 0.01, 0.01],
        },
        {
            "name": "InteriorDark",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.09, 0.095, 0.105, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.75,
            },
        },
        {
            "name": "InteriorWood",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.44, 0.22, 0.09, 1.0],
                "metallicFactor": 0.08,
                "roughnessFactor": 0.24,
            },
        },
    ]

    buffer_views = []
    accessors = []
    bin_chunks = bytearray()

    def pack_primitives(builder_list):
        """Writes each non-empty builder into the shared binary buffer and returns its glTF primitives."""
        primitives = []
        for b in builder_list:
            if not b.indices:
                continue
            pos_arr = np.asarray(b.positions, dtype=np.float32)
            norm_arr = np.asarray(b.normals, dtype=np.float32)
            idx_arr = np.asarray(b.indices, dtype=np.uint32)

            pos_bytes = pos_arr.tobytes()
            norm_bytes = norm_arr.tobytes()
            idx_bytes = idx_arr.tobytes()

            bv_pos = len(buffer_views)
            buffer_views.append({
                "buffer": 0,
                "byteOffset": len(bin_chunks),
                "byteLength": len(pos_bytes),
                "target": 34962,
            })
            bin_chunks.extend(pos_bytes)
            acc_pos = len(accessors)
            accessors.append({
                "bufferView": bv_pos,
                "componentType": 5126,
                "count": len(pos_arr),
                "type": "VEC3",
                "min": pos_arr.min(axis=0).astype(float).tolist(),
                "max": pos_arr.max(axis=0).astype(float).tolist(),
            })

            bv_norm = len(buffer_views)
            buffer_views.append({
                "buffer": 0,
                "byteOffset": len(bin_chunks),
                "byteLength": len(norm_bytes),
                "target": 34962,
            })
            bin_chunks.extend(norm_bytes)
            acc_norm = len(accessors)
            accessors.append({
                "bufferView": bv_norm,
                "componentType": 5126,
                "count": len(norm_arr),
                "type": "VEC3",
            })

            bv_idx = len(buffer_views)
            buffer_views.append({
                "buffer": 0,
                "byteOffset": len(bin_chunks),
                "byteLength": len(idx_bytes),
                "target": 34963,
            })
            bin_chunks.extend(idx_bytes)
            acc_idx = len(accessors)
            accessors.append({
                "bufferView": bv_idx,
                "componentType": 5125,
                "count": len(idx_arr),
                "type": "SCALAR",
            })

            primitives.append({
                "attributes": {
                    "POSITION": acc_pos,
                    "NORMAL": acc_norm,
                },
                "indices": acc_idx,
                "material": b.material_idx,
            })
        return primitives

    body_primitives = pack_primitives(builders)
    meshes = [{"name": "Alfetta_GTV_Body_Mesh", "primitives": body_primitives}]
    nodes = [
        {"name": "Alfa_Romeo_Alfetta_GTV_1973", "children": list(range(1, 2 + len(wheel_sets)))},
        {"name": "Body", "mesh": 0},
    ]
    for ws in wheel_sets:
        meshes.append({"name": ws["name"] + "_Mesh", "primitives": pack_primitives(ws["builders"])})
        nodes.append({"name": ws["name"], "mesh": len(meshes) - 1, "translation": ws["translation"]})

    while len(bin_chunks) % 4 != 0:
        bin_chunks.append(0)

    gltf = {
        "asset": {
            "generator": "Alfa-Romeo-Centro-Stile-Parametric-CAD-v5",
            "version": "2.0",
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_chunks)}],
    }

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunks)
    for out_path in ["public/models/alfa-romeo-1973.glb", "public/models/alfa-romeo-1973-cad.glb"]:
        with open(out_path, "wb") as f:
            f.write(struct.pack("<4sII", b"glTF", 2, total_len))
            f.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
            f.write(json_bytes)
            f.write(struct.pack("<I4s", len(bin_chunks), b"BIN\x00"))
            f.write(bin_chunks)

    all_builders = builders + [b for ws in wheel_sets for b in ws["builders"]]
    total_verts = sum(len(b.positions) for b in all_builders)
    total_tris = sum(len(b.indices) // 3 for b in all_builders)
    print(f"Built coachbuilt GLB v5: {len(nodes)} nodes (Body + {len(wheel_sets)} wheels), {total_verts} verts, {total_tris} tris, {total_len} bytes")


if __name__ == "__main__":
    build_alfetta_gtv()
