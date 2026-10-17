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
        [-0.352,  0.117,        0.110,       0.059,  -0.186,   0.392,   0.344,   0.346], # Rear hood seam before cowl louvers
        [-0.305,  0.120,        0.113,       0.061,  -0.186,   0.392,   0.336,   0.346], # Base of windshield (cowl)
        [-0.160,  0.208,        0.117,       0.066,  -0.186,   0.394,   0.302,   0.346], # Mid windshield
        [-0.015,  0.292,        0.120,       0.071,  -0.186,   0.396,   0.278,   0.346], # Windshield header / A-pillar top
        [ 0.155,  0.304,        0.124,       0.076,  -0.186,   0.396,   0.276,   0.346], # Roof peak / B-pillar
        [ 0.355,  0.294,        0.129,       0.083,  -0.186,   0.395,   0.272,   0.345], # Rear roof crown
        [ 0.500,  0.258,        0.136,       0.090,  -0.184,   0.395,   0.266,   0.344], # Fastback slope / C-pillar
        [ 0.570,  0.238,        0.140,       0.094,  -0.182,   0.396,   0.262,   0.342], # Rear axle center
        [ 0.720,  0.190,        0.142,       0.102,  -0.174,   0.386,   0.258,   0.332], # Lower fastback hatch
        [ 0.855,  0.144,        0.140,       0.106,  -0.156,   0.368,   0.254,   0.314], # Rear decklid base of glass
        [ 0.915,  0.130,        0.128,       0.102,  -0.132,   0.348,   0.248,   0.295], # Kamm tail sharp trailing edge
        [ 0.932,  0.112,        0.110,       0.060,  -0.118,   0.335,   0.242,   0.282], # Kamm tail vertical face
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
    def greenhouse_top_point(x, s, offset_y=0.0):
        """s in [-1, 1] across the width of the greenhouse top/glass."""
        yc = float(f_y_center(x))
        zt = float(f_z_top(x))
        z = s * zt
        y = yc - 0.014 * (s ** 2) + offset_y
        return [x, y, z]

    # 1. Front Laminated Windshield (-0.305 <= x <= -0.105, |s| <= 0.92)
    ws_nx, ws_nv = 28, 30
    ws_grid = np.zeros((ws_nx, ws_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(-0.305, -0.105, ws_nx)):
        for j, s in enumerate(np.linspace(-0.92, 0.92, ws_nv)):
            ws_grid[i, j] = greenhouse_top_point(x, s)
    m_glass.add_grid(ws_grid, flip=False)

    # Painted A-Pillars on the outer edges (0.90 <= |s| <= 1.02) of the windshield
    for side in (-1.0, 1.0):
        ap_grid = np.zeros((ws_nx, 5, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(-0.305, -0.105, ws_nx)):
            for j, s_abs in enumerate(np.linspace(0.90, 1.02, 5)):
                ap_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.001)
        m_paint.add_grid(ap_grid, flip=(side < 0))
        # Chrome windshield side molding
        cr_grid = np.zeros((ws_nx, 3, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(-0.305, -0.105, ws_nx)):
            for j, s_abs in enumerate(np.linspace(0.89, 0.92, 3)):
                cr_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.002)
        m_chrome.add_grid(cr_grid, flip=(side < 0))

    # Chrome windshield top & bottom moldings
    for x_edge in (-0.304, -0.106):
        cr_bar = np.zeros((2, ws_nv, 3), dtype=np.float32)
        for j, s in enumerate(np.linspace(-0.92, 0.92, ws_nv)):
            cr_bar[0, j] = greenhouse_top_point(x_edge - 0.004, s, offset_y=0.002)
            cr_bar[1, j] = greenhouse_top_point(x_edge + 0.004, s, offset_y=0.002)
        m_chrome.add_grid(cr_bar, flip=False)

    # 2. Painted Roof Panel Crown (-0.105 <= x <= 0.500, |s| <= 1.0)
    roof_nx, roof_nv = 36, 30
    roof_grid = np.zeros((roof_nx, roof_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(-0.105, 0.500, roof_nx)):
        for j, s in enumerate(np.linspace(-1.0, 1.0, roof_nv)):
            roof_grid[i, j] = greenhouse_top_point(x, s, offset_y=0.001)
    m_paint.add_grid(roof_grid, flip=False)

    # 3. Rear Fastback Hatch Window (0.500 <= x <= 0.855, |s| <= 0.88) — ZERO SPOILER!
    rw_nx, rw_nv = 32, 30
    rw_grid = np.zeros((rw_nx, rw_nv, 3), dtype=np.float32)
    for i, x in enumerate(np.linspace(0.500, 0.855, rw_nx)):
        for j, s in enumerate(np.linspace(-0.88, 0.88, rw_nv)):
            rw_grid[i, j] = greenhouse_top_point(x, s)
    m_glass.add_grid(rw_grid, flip=False)

    # Painted Rear Hatch Side Pillars (0.87 <= |s| <= 1.0) & Chrome Rear Window Frame
    for side in (-1.0, 1.0):
        rh_grid = np.zeros((rw_nx, 5, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(0.500, 0.855, rw_nx)):
            for j, s_abs in enumerate(np.linspace(0.87, 1.00, 5)):
                rh_grid[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.001)
        m_paint.add_grid(rh_grid, flip=(side < 0))

        cr_rw = np.zeros((rw_nx, 3, 3), dtype=np.float32)
        for i, x in enumerate(np.linspace(0.500, 0.855, rw_nx)):
            for j, s_abs in enumerate(np.linspace(0.855, 0.885, 3)):
                cr_rw[i, j] = greenhouse_top_point(x, side * s_abs, offset_y=0.002)
        m_chrome.add_grid(cr_rw, flip=(side < 0))

    for x_edge in (0.501, 0.854):
        cr_bar = np.zeros((2, rw_nv, 3), dtype=np.float32)
        for j, s in enumerate(np.linspace(-0.88, 0.88, rw_nv)):
            cr_bar[0, j] = greenhouse_top_point(x_edge - 0.004, s, offset_y=0.002)
            cr_bar[1, j] = greenhouse_top_point(x_edge + 0.004, s, offset_y=0.002)
        m_chrome.add_grid(cr_bar, flip=False)

    # =========================================================================
    # C) UNIFIED GREENHOUSE SIDE TUMBLEHOME SURFACE & GIUGIARO DOOR ARCHITECTURE
    # Includes Triangular Vent Window, Aligned B-Pillar, Crisp Door Shut-Lines,
    # Recessed Door Handle + Keyhole Lock, Pedestal Chrome Mirror & Rocker Sill
    # =========================================================================
    def greenhouse_side_point(tx, ty, side, offset_z=0.0):
        """
        ty in [0, 1] from window sill (ys) up to roof rail (yc - 0.014).
        tx in [0, 1] from front A-pillar (-0.305.. -0.105) to rear hatch edge (0.855.. 0.500).
        """
        x_front = -0.305 + ty * (-0.105 - (-0.305))
        x_rear = 0.855 + ty * (0.500 - 0.855)
        x = x_front + tx * (x_rear - x_front)

        ys = float(f_y_shoulder(x))
        y_top = float(f_y_center(x)) - 0.014
        y = ys + ty * (y_top - ys)

        z_sill = get_z_shoulder(x)
        z_roof = float(f_z_top(x))
        # Smooth tumblehome curve
        z_abs = z_sill + (z_roof - z_sill) * (ty ** 0.92) + offset_z
        return [x, y, side * z_abs]

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

    def greenhouse_side_norm(tx, ty, side):
        """Computes the exact analytical unit normal (pre-flip) on the smooth C2 greenhouse tumblehome surface."""
        eps = 0.005
        p_u1 = np.array(greenhouse_side_point(min(1.0, tx + eps), ty, side), dtype=np.float64)
        p_u0 = np.array(greenhouse_side_point(max(0.0, tx - eps), ty, side), dtype=np.float64)
        p_v1 = np.array(greenhouse_side_point(tx, min(1.0, ty + eps), side), dtype=np.float64)
        p_v0 = np.array(greenhouse_side_point(tx, max(0.0, ty - eps), side), dtype=np.float64)
        n_vec = np.cross(p_u1 - p_u0, p_v1 - p_v0)
        n_vec /= np.linalg.norm(n_vec) + 1e-9
        return n_vec.astype(np.float32)

    def greenhouse_xyz_from_xy(x_q, y_q, side_q, offset_z=0.0):
        """Projects any 2D profile point (x_q, y_q) directly onto the 3D greenhouse tumblehome surface."""
        ys = float(f_y_shoulder(x_q))
        y_top = float(f_y_center(x_q)) - 0.014
        ty = max(0.0, min(1.0, (y_q - ys) / max(1e-5, y_top - ys)))
        z_sill = get_z_shoulder(x_q)
        z_roof = float(f_z_top(x_q))
        z_abs = z_sill + (z_roof - z_sill) * (ty ** 0.92) + offset_z
        return [x_q, y_q, side_q * z_abs]

    def add_cpillar_stroke(p0, p1, width_xy, side_q, mat, offset_z=0.0022, n_seg=8):
        """Builds a conformal 3D ribbon stroke between 2D profile points p0=(x0,y0) and p1=(x1,y1) on the C-pillar."""
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

    # Pointed Rear Quarter Window & C-Pillar Sail Panel geometry helpers (matching alfa-profilo.jpeg)
    # Intermediate vertical divider bar (montantino verticale secondario) at u = 0.66,
    # and sharp pointed rear window apex at (tx_apex = 0.769, ty_apex = 0.255) -> (x = 0.530, y = 0.160)
    TX_APEX = 0.769
    TY_APEX = 0.255

    def tx_mid_bar(ty):
        return 0.526 * (1.0 - ty) + 0.653 * ty

    def win_bounds_at_u(u):
        """Returns (ty_bot, ty_top) for normalized window length u in [0, 1] (u=1 is the pointed rear tip)."""
        if u <= 0.66:
            return 0.0, 1.0
        w = (u - 0.66) / (1.0 - 0.66)
        ty_b = TY_APEX * (w ** 1.15)
        ty_t = 1.0 - (1.0 - TY_APEX) * (w ** 1.10)
        return ty_b, ty_t

    def win_tx_at_u(u, ty):
        tm = tx_mid_bar(ty)
        if u <= 0.66:
            return (u / 0.66) * tm
        w = (u - 0.66) / (1.0 - 0.66)
        return tm * (1.0 - w) + TX_APEX * w

    for side in (-1.0, 1.0):
        # 1. Pointed Side Window Glass (Front Vent-Wing + Door Glass + Rear 2-Pane Pointed Quarter Window)
        sw_nx, sw_ny = 52, 18
        sw_grid = np.zeros((sw_nx, sw_ny, 3), dtype=np.float32)
        for i, u in enumerate(np.linspace(0.015, 0.992, sw_nx)):
            ty_b, ty_t = win_bounds_at_u(u)
            ty_b_eff = max(0.02, ty_b + 0.012)
            ty_t_eff = min(0.97, ty_t - 0.012)
            for j, s_y in enumerate(np.linspace(0.0, 1.0, sw_ny)):
                ty = ty_b_eff + (ty_t_eff - ty_b_eff) * s_y
                tx = win_tx_at_u(u, ty)
                sw_grid[i, j] = greenhouse_side_point(tx, ty, side, offset_z=0.0)
        m_glass.add_grid(sw_grid, flip=(side < 0))

        # 2. Giugiaro Painted C-Pillar Sail Panel wrapping seamlessly around the pointed rear quarter window!
        # Split into cp_low_grid (below ty_bot / ty_apex) and cp_top_grid (above ty_top / ty_apex) with analytical C2 normals
        cp_nx, cp_ny = 36, 14
        cp_low_grid = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_low_norm = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_top_grid = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)
        cp_top_norm = np.zeros((cp_nx, cp_ny, 3), dtype=np.float32)

        for i, u_cp in enumerate(np.linspace(0.66, 1.38, cp_nx)):
            if u_cp <= 1.0:
                ty_b, ty_t = win_bounds_at_u(u_cp)
            else:
                ty_b, ty_t = TY_APEX, TY_APEX

            for j, s_y in enumerate(np.linspace(0.0, 1.0, cp_ny)):
                # Lower C-pillar & quarter-window under-wedge (0.0 <= ty <= ty_b)
                ty_low = ty_b * s_y
                if u_cp <= 1.0:
                    tx_low = win_tx_at_u(u_cp, ty_low)
                else:
                    w_post = (u_cp - 1.0) / 0.38
                    tx_low = TX_APEX + (1.0 - TX_APEX) * w_post
                cp_low_grid[i, j] = greenhouse_side_point(tx_low, ty_low, side, offset_z=0.001)
                cp_low_norm[i, j] = greenhouse_side_norm(tx_low, ty_low, side)

                # Upper C-pillar & fastback roof sail panel (ty_t <= ty <= 1.0)
                ty_high = ty_t + (1.0 - ty_t) * s_y
                if u_cp <= 1.0:
                    tx_high = win_tx_at_u(u_cp, ty_high)
                else:
                    w_post = (u_cp - 1.0) / 0.38
                    tx_high = TX_APEX + (1.0 - TX_APEX) * w_post
                cp_top_grid[i, j] = greenhouse_side_point(tx_high, ty_high, side, offset_z=0.001)
                cp_top_norm[i, j] = greenhouse_side_norm(tx_high, ty_high, side)

        m_paint.add_grid(cp_low_grid, grid_norm=cp_low_norm, flip=(side < 0))
        m_paint.add_grid(cp_top_grid, grid_norm=cp_top_norm, flip=(side < 0))

        # 3. Iconic Triangular "GTV" C-Pillar Shield (Scudetto Triangolare GTV) + Black C-Pillar Pin (from alfa-profilo.jpeg)
        # Triangle vertices on the painted silver C-pillar:
        p_gtv_left = (0.554, 0.137)
        p_gtv_right = (0.768, 0.146)
        p_gtv_top_l = (0.638, 0.178)
        p_gtv_top_r = (0.652, 0.178)

        # Crisp dark-gunmetal + chrome triangular outline border with authentic top chevron opening
        for mat_s, w_s, oz_s in ((m_rubber, 0.0034, 0.0024), (m_chrome, 0.0015, 0.0030)):
            add_cpillar_stroke(p_gtv_left, p_gtv_right, w_s, side, mat_s, offset_z=oz_s, n_seg=14)
            add_cpillar_stroke(p_gtv_left, p_gtv_top_l, w_s, side, mat_s, offset_z=oz_s, n_seg=10)
            add_cpillar_stroke(p_gtv_top_r, p_gtv_right, w_s, side, mat_s, offset_z=oz_s, n_seg=10)
            # Top apex inward chevron hooks
            add_cpillar_stroke(p_gtv_top_l, (0.642, 0.172), w_s * 0.85, side, mat_s, offset_z=oz_s, n_seg=4)
            add_cpillar_stroke(p_gtv_top_r, (0.648, 0.172), w_s * 0.85, side, mat_s, offset_z=oz_s, n_seg=4)

        # Bold geometric "G T V" lettering inside the lower half of the triangle
        # Letter 'G' (x in [0.592, 0.624], y in [0.143, 0.156])
        for s0, s1 in (
            ((0.624, 0.155), (0.592, 0.154)),
            ((0.592, 0.154), (0.592, 0.142)),
            ((0.592, 0.142), (0.624, 0.143)),
            ((0.624, 0.143), (0.624, 0.149)),
            ((0.624, 0.149), (0.608, 0.149)),
            # Letter 'T' (x in [0.635, 0.665], y in [0.143, 0.157])
            ((0.635, 0.156), (0.665, 0.157)),
            ((0.650, 0.157), (0.650, 0.143)),
            # Letter 'V' (x in [0.676, 0.708], y in [0.144, 0.158])
            ((0.676, 0.158), (0.692, 0.144)),
            ((0.692, 0.144), (0.708, 0.159)),
        ):
            add_cpillar_stroke(s0, s1, 0.0032, side, m_rubber, offset_z=0.0026, n_seg=5)
            add_cpillar_stroke(s0, s1, 0.0016, side, m_chrome, offset_z=0.0031, n_seg=5)

        # Small Black Cylindrical Fastener Pin on C-pillar above the rear slope of the GTV triangle (from alfa-profilo.jpeg)
        pin_pt = greenhouse_xyz_from_xy(0.736, 0.166, side, offset_z=0.001)
        z_pin = abs(pin_pt[2])
        m_rubber.add_cylinder_z(pin_pt[0], pin_pt[1], side * (z_pin - 0.001), side * (z_pin + 0.0055), 0.0052, segs=20)

        # 4. Pointed Chrome Window Perimeter Moldings, Intermediate Vertical Bar, Vent-Wing & Aligned B-Pillar
        # Lower sill chrome molding following ty_bot(u) all the way to the sharp pointed rear apex!
        sill_cr = np.zeros((48, 3, 3), dtype=np.float32)
        top_cr = np.zeros((48, 3, 3), dtype=np.float32)
        for i, u in enumerate(np.linspace(0.0, 1.0, 48)):
            ty_b, ty_t = win_bounds_at_u(u)
            for j, dty in enumerate((-0.012, 0.008, 0.028)):
                ty_c = max(0.0, min(1.0, ty_b + dty))
                tx_c = win_tx_at_u(u, ty_c)
                sill_cr[i, j] = greenhouse_side_point(tx_c, ty_c, side, offset_z=0.0026)
            for j, dty in enumerate((-0.028, -0.008, 0.012)):
                ty_c = max(0.0, min(1.0, ty_t + dty))
                tx_c = win_tx_at_u(u, ty_c)
                top_cr[i, j] = greenhouse_side_point(tx_c, ty_c, side, offset_z=0.0026)
        m_chrome.add_grid(sill_cr, flip=(side < 0))
        m_chrome.add_grid(top_cr, flip=(side < 0))

        # Front A-pillar chrome window frame along the leading edge of the triangular vent window
        ap_cr = np.zeros((3, 18, 3), dtype=np.float32)
        for i, tx in enumerate(np.linspace(0.0, 0.016, 3)):
            for j, ty in enumerate(np.linspace(0.0, 1.0, 18)):
                ap_cr[i, j] = greenhouse_side_point(tx, ty, side, offset_z=0.0026)
        m_chrome.add_grid(ap_cr, flip=(side < 0))

        # Triangular Stainless Corner Gusset at the front-bottom apex of the vent window (from alfa-profilo.jpeg)
        gusset_cr = np.zeros((6, 6, 3), dtype=np.float32)
        for j, ty in enumerate(np.linspace(0.02, 0.22, 6)):
            tx_max = 0.040 * (1.0 - (ty - 0.02) / 0.20) + 0.008
            for i, tx in enumerate(np.linspace(0.006, tx_max, 6)):
                gusset_cr[i, j] = greenhouse_side_point(tx, ty, side, offset_z=0.0028)
        m_chrome.add_grid(gusset_cr, flip=(side < 0))

        # Vertical Chrome Vent-Wing Divider Bar (Barra Verticale Deflettore Anteriore: rises vertically from x=-0.134 at sill to top of A-pillar!)
        vw_cr = np.zeros((3, 18, 3), dtype=np.float32)
        for j, ty in enumerate(np.linspace(0.02, 0.97, 18)):
            tx_center = 0.1474 * (1.0 - ty) + 0.0083 * ty
            for i, dtx in enumerate((-0.0055, 0.0, 0.0055)):
                vw_cr[i, j] = greenhouse_side_point(tx_center + dtx, ty, side, offset_z=0.0028)
        m_chrome.add_grid(vw_cr, flip=(side < 0))

        # Chrome Vent-Window Swivel Latch Knob at lower rear corner of the vent wing
        latch_pt = greenhouse_side_point(0.136, 0.10, side, offset_z=0.0040)
        m_chrome.add_box(latch_pt, [0.012, 0.010, 0.005])

        # B-Pillar (Montante B) aligned with Rear Door Shut-Line (x = +0.148 at sill, tilting forward to x = +0.116 at roof)
        b_black = np.zeros((3, 18, 3), dtype=np.float32)
        b_cr_front = np.zeros((3, 18, 3), dtype=np.float32)
        b_cr_rear = np.zeros((3, 18, 3), dtype=np.float32)
        for j, ty in enumerate(np.linspace(0.0, 0.98, 18)):
            tx_b = 0.3905 * (1.0 - ty) + 0.3653 * ty
            for i, dtx in enumerate((-0.0035, 0.0, 0.0035)):
                b_black[i, j] = greenhouse_side_point(tx_b + dtx, ty, side, offset_z=0.0029)
            for i, dtx in enumerate((-0.0145, -0.0090, -0.0035)):
                b_cr_front[i, j] = greenhouse_side_point(tx_b + dtx, ty, side, offset_z=0.0027)
            for i, dtx in enumerate((0.0035, 0.0090, 0.0145)):
                b_cr_rear[i, j] = greenhouse_side_point(tx_b + dtx, ty, side, offset_z=0.0027)
        m_rubber.add_grid(b_black, flip=(side < 0))
        m_chrome.add_grid(b_cr_front, flip=(side < 0))
        m_chrome.add_grid(b_cr_rear, flip=(side < 0))

        # Intermediate Vertical Divider Bar in Rear Quarter Window (Montantino Verticale Secondario at u = 0.66)
        mid_black = np.zeros((3, 18, 3), dtype=np.float32)
        mid_cr = np.zeros((3, 18, 3), dtype=np.float32)
        for j, ty in enumerate(np.linspace(0.02, 0.97, 18)):
            tx_m = tx_mid_bar(ty)
            for i, dtx in enumerate((-0.0030, 0.0, 0.0030)):
                mid_black[i, j] = greenhouse_side_point(tx_m + dtx, ty, side, offset_z=0.0026)
            for i, dtx in enumerate((-0.0055, 0.0, 0.0055)):
                mid_cr[i, j] = greenhouse_side_point(tx_m + dtx, ty, side, offset_z=0.0022)
        m_rubber.add_grid(mid_black, flip=(side < 0))
        m_chrome.add_grid(mid_cr, flip=(side < 0))

        # Vertical Chrome Pop-Out Window Latch Strut near the pointed rear apex of the quarter window
        pop_cr = np.zeros((3, 8, 3), dtype=np.float32)
        ty_b_pop, ty_t_pop = win_bounds_at_u(0.92)
        for j, ty in enumerate(np.linspace(ty_b_pop + 0.02, ty_t_pop - 0.02, 8)):
            tx_p = win_tx_at_u(0.92, ty)
            for i, dtx in enumerate((-0.0035, 0.0, 0.0035)):
                pop_cr[i, j] = greenhouse_side_point(tx_p + dtx, ty, side, offset_z=0.0027)
        m_chrome.add_grid(pop_cr, flip=(side < 0))

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
    fuel_pt = eval_shoulder(0.496, 0.30, 1.0, offset_z=0.0)
    z_fuel = abs(fuel_pt[2])
    # Outer recessed black ring + circular cap disc + horizontal finger grip bar + central chrome keyhole
    m_rubber.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel - 0.002, z_fuel + 0.0025, 0.0225, segs=36)
    m_rubber.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel + 0.001, z_fuel + 0.0045, 0.0195, segs=36)
    m_rubber.add_box([fuel_pt[0], fuel_pt[1], z_fuel + 0.0055], [0.034, 0.0075, 0.0035], rotation_x=-0.32)
    m_chrome.add_cylinder_z(fuel_pt[0], fuel_pt[1], z_fuel + 0.0035, z_fuel + 0.0072, 0.0034, segs=18)

    # =========================================================================
    # 7. PEDESTAL CHROME EXTERIOR MIRROR ON DRIVER DOOR (+Z, Specchietto Cromato Alfa Romeo)
    # =========================================================================
    mir_base = eval_shoulder(-0.106, 0.25, 1.0, offset_z=0.001, offset_y=0.0005)
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
    m_paint.add_box([0.924, 0.018, 0.0], [0.024, 0.210, 0.610], rotation_z=-0.06)

    # Matte-black underbody floor pan & solid inner wheel-well walls behind the tires
    m_rubber.add_box([0.0, -0.168, 0.0], [1.72, 0.032, 0.62])
    for ax in (FRONT_AXLE_X, REAR_AXLE_X):
        for side in (-1.0, 1.0):
            m_rubber.add_cylinder_z(ax, AXLE_Y, side * 0.16, side * 0.230, ARCH_RADIUS * 1.02, r_inner=0.0, segs=48)

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

    m_chrome.add_box([0.948, -0.055, 0.0], [0.032, 0.028, 0.650])
    for side in (-1.0, 1.0):
        m_chrome.add_box([0.900, -0.055, side * 0.336], [0.095, 0.026, 0.028], rotation_y=-side * 0.20)
        m_rubber.add_box([0.955, -0.053, side * 0.175], [0.036, 0.046, 0.034])

    m_chrome.add_cylinder_x(0.84, 0.965, -0.140, -0.195, 0.014, r_inner=0.010, segs=24)

    for side in (-1.0, 1.0):
        m_chrome.add_box([0.934, 0.042, side * 0.242], [0.014, 0.052, 0.148])
        m_taillight.add_box([0.938, 0.033, side * 0.242], [0.014, 0.030, 0.140])
        m_amber.add_box([0.938, 0.055, side * 0.242], [0.014, 0.016, 0.140])

    m_chrome.add_cylinder_x(0.930, 0.940, 0.068, 0.0, 0.015, segs=24)

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

    def add_wheel(ax, ay, side):
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

    for ax in (FRONT_AXLE_X, REAR_AXLE_X):
        for side in (-1.0, 1.0):
            add_wheel(ax, AXLE_Y, side)

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
    primitives = []
    bin_chunks = bytearray()

    for b in builders:
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

    while len(bin_chunks) % 4 != 0:
        bin_chunks.append(0)

    gltf = {
        "asset": {
            "generator": "Alfa-Romeo-Centro-Stile-Parametric-CAD-v4",
            "version": "2.0",
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "Alfa_Romeo_Alfetta_GTV_1973", "mesh": 0}],
        "meshes": [{"name": "Alfetta_GTV_MultiMaterial_Mesh", "primitives": primitives}],
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

    total_verts = sum(len(b.positions) for b in builders)
    total_tris = sum(len(b.indices) // 3 for b in builders)
    print(f"Built coachbuilt multi-material GLB v4: {len(primitives)} sub-meshes, {total_verts} verts, {total_tris} tris, {total_len} bytes")


if __name__ == "__main__":
    build_alfetta_gtv()
