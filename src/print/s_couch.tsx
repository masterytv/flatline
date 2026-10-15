import React, {useId, useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, beatsIn, bt, lastBeatIndex, pulse} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, MONO, SERIF} from './ink';
import {clamp01, CropMarks, easeIn, easeInOut, easeOut, ecg, FlatlineBar, inked, kickNudge, lerp, RegTarget, Rule, Slug, stamp} from './kit';
import {bbox, FRIENDS, Friend, inPoly, P11_SPIN, P12_MAYA, P7_FACES, P7_HAND, P7_LAMP, P7_PALM, P7_PEOPLE, P7_PHONES, P7_PULL, P8_LAMP, P9_GAP, Poly} from './masks';
import {Cam, Plate, plateDots, Sheet, sheetMatrix} from './press';
import {CamLayer, Paper, Press} from './Press';
import {ReverseSheetV} from './s_dancing';
import {bleed, Frame, K_FILL, K_FIT, useStage, VH, VMap, vtrack, VW} from './stage';

// 1:56.1-2:07.1, drop 2 (bars 62-67).
// Couch (62.1-64.4): the black FLATLINE sheet peels off P7, printed cold (the screen world): four friends on the sofa,
//   their phones glowing as blooms of bare paper. Maya's ringed hand reaches in from the corner, warm from frame one.
//   A punch-in on each face, then on the next beat that friend's stencil is pulled warm (orange + black), travelling
//   away from her hand; the glow dies and the phone inks black; their name stamps in orange. Wide on 64.2, the room
//   floods warm out of her palm on 64.3, the sheet buckles on 64.4.
// Join (65.1-67.4): they get up. A burst of full-bleed prints, a new photo every 2 beats with a print variation in
//   between: P8 registered on P7 (same lamp, same sofa, now empty), P8 key only, P9, its macro, P10, off register, P11,
//   its dots spun out, P12, Maya's face, the pile, and the whip off to the right into the roof.

/* ------------------------------------------------------------------------------------------------------------ */
/* shared                                                                                                       */

const W = 1920;
const H = 1080;

type Pose = {w: number; h: number; cx: number; cy: number; rot?: number; s?: number};

/** World point of image fraction (u, v) on a sheet. */
const onSheet = (sh: Pose, u: number, v: number): [number, number] => {
	const r = ((sh.rot ?? 0) * Math.PI) / 180;
	const k = sh.s ?? 1;
	const x = (u - 0.5) * sh.w * k;
	const y = (v - 0.5) * sh.h * k;
	return [sh.cx + x * Math.cos(r) - y * Math.sin(r), sh.cy + x * Math.sin(r) + y * Math.cos(r)];
};

/** Screen point of a world point through a camera (the same transform as CamLayer and sheetMatrix). */
const toScreen = (cam: Cam, [x, y]: [number, number]): [number, number] => {
	const r = ((cam.rot ?? 0) * Math.PI) / 180;
	const dx = (x - cam.cx) * cam.s;
	const dy = (y - cam.cy) * cam.s;
	return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
};

/** The camera that puts world point w at screen point p, at scale s and rotation rot. */
const camAt = (w: [number, number], p: [number, number], s: number, rot = 0): Cam => {
	const r = (-rot * Math.PI) / 180;
	const dx = (p[0] - W / 2) / s;
	const dy = (p[1] - H / 2) / s;
	return {cx: w[0] - (dx * Math.cos(r) - dy * Math.sin(r)), cy: w[1] - (dx * Math.sin(r) + dy * Math.cos(r)), s, rot};
};

const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({
	cx: lerp(a.cx, b.cx, k),
	cy: lerp(a.cy, b.cy, k),
	s: a.s * Math.pow(b.s / a.s, k),
	rot: lerp(a.rot ?? 0, b.rot ?? 0, k),
});

const zoom = (c: Cam, k: number): Cam => ({...c, s: c.s * k});

/** The rostrum's hit on every beat: a few px of shake and a 1.4% punch, gone in a quarter beat. */
const beatHit = (cam: Cam, t: number, amp = 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || amp <= 0) return cam;
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * amp;
	const s = cam.s * (1 + 0.014 * k);
	return {
		cx: cam.cx - ((hash2(i, 3, 77) - 0.5) * 14 * k) / s,
		cy: cam.cy - ((hash2(i, 5, 77) - 0.5) * 10 * k) / s,
		s,
		rot: (cam.rot ?? 0) + (hash2(i, 7, 77) - 0.5) * 0.4 * k,
	};
};

/** ECG trace points for an SVG polyline, newest moment at the right end. */
const ecgPoints = (t: number, w: number, amp: number, win: number, alive: (b: number) => boolean) => {
	const live = beatsIn(t - win - 0.3, t + 0.05)
		.map((b) => b.t)
		.filter((b) => b <= t && alive(b));
	const pts: string[] = [];
	for (let px = 0; px <= w; px += 2) {
		const tx = t - (1 - px / w) * win;
		let v = 0;
		for (const b of live) {
			const dt = tx - b;
			if (dt > -0.2 && dt < 0.25) v += ecg(dt);
		}
		pts.push(`${px},${(-v * amp).toFixed(1)}`);
	}
	return pts.join(' ');
};

/** Fills polygons given in image fractions of a sheet, through the sheet's paper -> screen matrix. */
const fillPolys = (ctx: CanvasRenderingContext2D, sheet: Pose, cam: Cam, polys: {poly: Poly; s: number}[], ink: string) => {
	const m = sheetMatrix({...sheet}, cam, W, H);
	ctx.save();
	ctx.globalCompositeOperation = 'multiply';
	ctx.fillStyle = ink;
	ctx.beginPath();
	for (const {poly, s} of polys) {
		const cu = poly.reduce((a, p) => a + p[0], 0) / poly.length;
		const cv = poly.reduce((a, p) => a + p[1], 0) / poly.length;
		poly.forEach(([u0, v0], i) => {
			const px = (cu + (u0 - cu) * s) * sheet.w;
			const py = (cv + (v0 - cv) * s) * sheet.h;
			const x = m[0] * px + m[2] * py + m[4];
			const y = m[1] * px + m[3] * py + m[5];
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		ctx.closePath();
	}
	ctx.fill();
	ctx.restore();
};

/* ------------------------------------------------------------------------------------------------------------ */
/* COUCH (116.100 to 121.626)                                                                                   */

/** P7's sheet: the same sheet in the same place as the reverse pull's FLATLINE windows (s_dancing P7_SHEET). */
const P7S = {w: 1760, h: 982, cx: 960, cy: 520};
const A7 = 2752 / 1536; // the photo's aspect: (u * A7, v) are square units

const WARM: Record<Friend, number> = {jess: F.glowsOff[0], dev: F.glowsOff[1], kai: F.glowsOff[2], sam: F.glowsOff[3]};
const PUNCH: Record<Friend, number> = {jess: bt(62, 2), dev: bt(62, 4), kai: bt(63, 2), sam: bt(63, 4)};
const WIDE = bt(64, 2);
const WASH = F.glowsOff[4];
const BUCKLE = bt(64, 4);
const PULL = 0.16; // a stencil pull, seconds (already 40% through on the beat's own frame, so the change lands on the beat)
const RIDGE = 1.35; // the ink ridge the squeegee leaves at its edge
const HAND = 1.6; // Maya's hand prints with a heavier orange: the one warm thing in the cold room

// Who is where, as a 688x384 label raster (0 room, 1-4 the friends, 5 Maya's hand): the masks run per dot.
const LW = 688;
const LH = 384;
let LABELS: Uint8Array | null = null;
const labels = (): Uint8Array => {
	if (LABELS) return LABELS;
	const L = new Uint8Array(LW * LH);
	const boxes = FRIENDS.map((f) => bbox(P7_PEOPLE[f]));
	const hb = bbox(P7_HAND);
	for (let y = 0; y < LH; y++) {
		const v = (y + 0.5) / LH;
		for (let x = 0; x < LW; x++) {
			const u = (x + 0.5) / LW;
			let lab = 0;
			if (u >= hb.x0 && u <= hb.x1 && v >= hb.y0 && inPoly(P7_HAND, u, v)) lab = 5;
			else
				for (let k = 0; k < 4; k++) {
					const b = boxes[k];
					if (u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1 && inPoly(P7_PEOPLE[FRIENDS[k]], u, v)) {
						lab = k + 1;
						break;
					}
				}
			L[y * LW + x] = lab;
		}
	}
	LABELS = L;
	return L;
};
const labelAt = (L: Uint8Array, u: number, v: number) => L[Math.min(LH - 1, Math.max(0, (v * LH) | 0)) * LW + Math.min(LW - 1, Math.max(0, (u * LW) | 0))];

/** Each pull's direction (unit, in square units) and the person's extent along it. */
const DIR = FRIENDS.map((f) => {
	const [dx, dy] = P7_PULL[f];
	const n = Math.hypot(dx, dy);
	const ux = dx / n;
	const uy = dy / n;
	const ps = P7_PEOPLE[f].map(([u, v]) => u * A7 * ux + v * uy);
	return {ux, uy, p0: Math.min(...ps), p1: Math.max(...ps)};
});

/** 0 cold, 1 warm (RIDGE at a pull's leading edge), at image fraction (u, v) and time t. */
const warmth = (t: number) => {
	const L = labels();
	const fronts = FRIENDS.map((f, k) => {
		const x = (t - WARM[f]) / PULL;
		return {on: x >= 0, done: x >= 1, front: DIR[k].p0 + (0.4 + 0.6 * easeOut(x)) * (DIR[k].p1 - DIR[k].p0)};
	});
	// the room floods warm out of Maya's palm, its edge ragged like a hand-pulled flood
	const R = t >= WASH ? (0.3 + 0.7 * easeOut((t - WASH) / 0.34)) * 1.8 : -1;
	return (u: number, v: number): number => {
		const lab = labelAt(L, u, v);
		if (lab === 5) return HAND;
		if (lab > 0) {
			const fr = fronts[lab - 1];
			if (fr.done) return 1;
			if (!fr.on) return 0;
			const d = DIR[lab - 1];
			const p = u * A7 * d.ux + v * d.uy;
			if (p > fr.front) return 0;
			return fr.front - p < 0.03 ? RIDGE : 1;
		}
		if (R < 0) return 0;
		const dx = (u - P7_PALM.u) * A7;
		const dy = v - P7_PALM.v;
		const a = Math.atan2(dy, dx);
		const edge = R + 0.045 * Math.sin(a * 7 + 1.3) + 0.022 * Math.sin(a * 17 + 0.4);
		const r = Math.hypot(dx, dy);
		if (r > edge) return 0;
		return edge - r < 0.04 ? RIDGE : 1;
	};
};

// The phones face their owners, so their glow shows as light on hands, chest and chin: a bloom of bare paper in the
// cold print around a phone that stays dark. It throbs on the beat until that friend's stencil is pulled.
const PHONE = FRIENDS.map((f) => {
	const q = P7_PHONES[f];
	return {f, poly: q, b: bbox(q), u: q.reduce((a, p) => a + p[0], 0) / 4, v: q.reduce((a, p) => a + p[1], 0) / 4};
});
const bloom = (t: number) => {
	const g = 0.7 + 0.25 * pulse(t, 0.16);
	const live = PHONE.filter((p) => t < WARM[p.f] + PULL);
	return (u: number, v: number): number => {
		let b = 0;
		for (const p of live) {
			const dx = ((u - p.u) * A7) / 0.075;
			const dy = (v - (p.v - 0.04)) / 0.105;
			const e = dx * dx + dy * dy;
			if (e > 5) continue;
			if (u >= p.b.x0 && u <= p.b.x1 && v >= p.b.y0 && v <= p.b.y1 && inPoly(p.poly, u, v)) return 0;
			b = Math.max(b, g * Math.exp(-e));
		}
		return b;
	};
};

/**
 * P7's cold channel, redrawn for a line screen carrying the whole picture alone: the plate's cold density (straight
 * inverse luminance) prints every face as a solid blob, so mids are pulled down and the key channel adds the darks
 * back (0.55 b^1.4 + 0.6 k). Eyes, brows and mouths read again in the darker faces.
 */
const COLD_MAPS = new WeakMap<Density, Density>();
const p7Map = (d: Density): Density => {
	const hit = COLD_MAPS.get(d);
	if (hit) return hit;
	const data = new Uint8ClampedArray(d.data);
	for (let i = 0; i < data.length; i += 4) data[i + 2] = Math.min(255, (0.55 * Math.pow(data[i + 2] / 255, 1.4) + (0.6 * data[i]) / 255) * 255);
	const m: Density = {id: `${d.id}-cold`, w: d.w, h: d.h, data};
	COLD_MAPS.set(d, m);
	return m;
};

/**
 * One face given back its features for its punch-in. The room curve (p7Map) flattens a pale, phone-lit face to almost
 * bare paper, so a tight line screen prints it as even stripes. Inside an ellipse round P7_FACES[f] the cold channel is
 * rebuilt from the raw plate as 1.25 (b - 0.12) + 0.6 k, which keeps the eyelids, the nose's shadow, the mouth and the
 * jaw; it fades back to the room curve over the ellipse's edge (hair and collar print the same either way).
 */
const FACE_MAPS = new WeakMap<Density, Partial<Record<Friend, Density>>>();
const p7FaceMap = (d: Density, f: Friend): Density => {
	const per = FACE_MAPS.get(d) ?? {};
	const hit = per[f];
	if (hit) return hit;
	const base = p7Map(d);
	const data = new Uint8ClampedArray(base.data);
	const fc = P7_FACES[f];
	const ru = 0.6 * fc.w; // half-width in u: the face plus a margin to the ears
	const rv = 0.8 * fc.w * A7; // half-height in v: brow line to chin
	const x0 = Math.max(0, Math.floor((fc.u - 1.2 * ru) * (d.w - 1)));
	const x1 = Math.min(d.w - 1, Math.ceil((fc.u + 1.2 * ru) * (d.w - 1)));
	const y0 = Math.max(0, Math.floor((fc.v - 1.2 * rv) * (d.h - 1)));
	const y1 = Math.min(d.h - 1, Math.ceil((fc.v + 1.2 * rv) * (d.h - 1)));
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const e = Math.hypot((x / (d.w - 1) - fc.u) / ru, (y / (d.h - 1) - fc.v) / rv);
			if (e >= 1.15) continue;
			const a = clamp01((1.15 - e) / 0.3);
			const k = a * a * (3 - 2 * a);
			const i = (y * d.w + x) * 4;
			const face = clamp01(1.25 * (d.data[i + 2] / 255 - 0.12) + (0.6 * d.data[i]) / 255);
			data[i + 2] = Math.round(255 * ((base.data[i + 2] / 255) * (1 - k) + face * k));
		}
	}
	const m: Density = {id: `${d.id}-face-${f}`, w: d.w, h: d.h, data};
	FACE_MAPS.set(d, {...per, [f]: m});
	return m;
};

/**
 * Kai's punch-in gets its own cold screen: at 2.55x the room's cell 7 lines are 18 px apart, coarser than his downcast
 * eyes and mouth. The punch-in is a hard cut both ways, so the finer screen (and his face curve) comes and goes unseen.
 */
const PUNCH_SCREEN: Partial<Record<Friend, number>> = {kai: 4.5};
// 9:16: the phone's frame is 1080 px wide, so at the punch-ins the room's cell 7 lines are 47 to the frame width and
// pale faces print as stripes: every punch-in gets the face curve and a finer screen (cuts both ways, as for Kai).
const PUNCH_SCREEN_V: Record<Friend, number> = {jess: 5, dev: 5, kai: 4.5, sam: 5};
type Look = {face?: Friend; cold?: number};
const punchLook = (t: number, vertical = false): Look => {
	for (const f of FRIENDS) {
		const cell = vertical ? PUNCH_SCREEN_V[f] : PUNCH_SCREEN[f];
		if (cell && t >= PUNCH[f] && t < WARM[f]) return {face: f, cold: cell};
	}
	return {};
};

/** P7 at time t: the cold line screen where nobody has been warmed yet, heat and key dots where they have. */
const p7Sheet = (map: Density, t: number, nudge = true, look: Look = {}): Sheet => {
	const warm = warmth(t);
	const glow = bloom(t);
	const [hx, hy] = nudge ? kickNudge(t, 1, 2.2) : [0, 0];
	const [kx, ky] = nudge ? kickNudge(t, 0, 1.2) : [0, 0];
	return {
		map: look.face ? p7FaceMap(map, look.face) : p7Map(map),
		...P7S,
		seed: 5,
		plates: [
			{ch: 2, ink: INK.cold, angle: 75, cell: look.cold ?? 7, kind: 'line', mask: (u, v) => (warm(u, v) > 0 ? 0 : 1 - glow(u, v))},
			{ch: 1, ink: INK.heat, angle: 15, cell: 7, dx: 2 + hx, dy: -1 + hy, mask: warm},
			{ch: 0, ink: INK.key, angle: 45, cell: 7, gain: 0.88, dx: kx, dy: ky, mask: (u, v) => Math.min(warm(u, v), RIDGE)},
		],
	};
};

/** Each warmed phone fills black, with a small pop as it goes down; the cold ones ping on every beat. */
const drawPhones = (ctx: CanvasRenderingContext2D, t: number, cam: Cam, sheet: Pose = P7S) => {
	const polys = FRIENDS.filter((f) => t >= WARM[f] + 0.1).map((f) => ({poly: P7_PHONES[f], s: 1.04 + 0.3 * Math.exp(-(t - WARM[f] - 0.1) / 0.06)}));
	if (polys.length) fillPolys(ctx, sheet, cam, polys, INK.key);
	// the screens calling for attention: two thin ultramarine rings out of each glowing phone per beat
	const m = sheetMatrix({...sheet}, cam, W, H);
	const k = Math.hypot(m[0], m[1]);
	const beats = beatsIn(Math.max(F.couch - 1e-3, t - 0.6), t + 1e-6);
	ctx.save();
	ctx.globalCompositeOperation = 'multiply';
	ctx.strokeStyle = INK.cold;
	for (const p of PHONE) {
		if (t >= WARM[p.f]) continue;
		const x = p.u * sheet.w;
		const y = p.v * sheet.h;
		const sx = m[0] * x + m[2] * y + m[4];
		const sy = m[1] * x + m[3] * y + m[5];
		for (const b of beats) {
			for (const [delay, weight] of [
				[0, 1],
				[0.08, 0.6],
			]) {
				const a = t - b.t - delay;
				if (a < 0 || a > 0.5) continue;
				const e = easeOut(a / 0.5);
				ctx.globalAlpha = Math.pow(1 - e, 0.6) * weight;
				ctx.lineWidth = Math.max(1.5, 4.6 * k * (1 - 0.45 * e));
				ctx.beginPath();
				ctx.arc(sx, sy, (26 + 150 * e) * k, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
	}
	ctx.restore();
};

const NAME: Record<Friend, {u: number; v: number; rot: number; text: string}> = {
	jess: {u: 0.236, v: 0.165, rot: -4, text: 'Jess'},
	dev: {u: 0.43, v: 0.175, rot: 3, text: 'Dev'},
	kai: {u: 0.627, v: 0.175, rot: -3, text: 'Kai'},
	sam: {u: 0.842, v: 0.17, rot: 4, text: 'Sam'},
};

/** Each friend's name, stamped in orange in the human voice as they come back. */
const Name: React.FC<{f: Friend; t: number}> = ({f, t}) => {
	const st = stamp(t, WARM[f] + 0.07);
	if (!st.on) return null;
	const n = NAME[f];
	const [x, y] = onSheet(P7S, n.u, n.v);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - 220,
				top: y - 64,
				width: 440,
				textAlign: 'center',
				fontFamily: SERIF,
				fontStyle: 'italic',
				fontSize: 92,
				lineHeight: 1,
				color: INK.heat,
				transform: `rotate(${n.rot}deg) scale(${st.s})`,
				mixBlendMode: 'multiply',
				...inked(512, x, y),
			}}
		>
			{n.text}
		</div>
	);
};

/** Camera on a point of P7. */
const onP7 = (u: number, v: number, s: number, rot = 0): Cam => {
	const [cx, cy] = onSheet(P7S, u, v);
	return {cx, cy, s, rot};
};

// The punch-ins alternate a tight face (Jess looks at us, Kai lit from below) with face-and-phone (Dev, Sam), each
// framed from its traced face centre: (du, dv) moves the frame centre off the face (down to take in the phone).
const PUNCH_FRAME: Record<Friend, {du: number; dv: number; s: number; rot: number}> = {
	jess: {du: 0, dv: 0.015, s: 2.55, rot: 0},
	dev: {du: -0.007, dv: 0.135, s: 2.15, rot: -1.6},
	kai: {du: 0.002, dv: 0.015, s: 2.55, rot: 1.3},
	sam: {du: 0.008, dv: 0.11, s: 2.15, rot: -1.1},
};
const PUNCH_CAM = (f: Friend, k: number): Cam => {
	const p = PUNCH_FRAME[f];
	return onP7(P7_FACES[f].u + p.du, P7_FACES[f].v + p.dv, p.s * (1 + 0.045 * k), p.rot);
};
// ...and each warm beat pulls back to show the warm friend next to the cold one still waiting.
const BACK_CAM: Record<Friend, Cam> = {
	jess: onP7(0.335, 0.44, 1.55),
	dev: onP7(0.5, 0.44, 1.55),
	kai: onP7(0.665, 0.44, 1.55),
	sam: onP7(0.6, 0.46, 1.25, 0.6),
};
const NEXT: Record<Friend, number> = {jess: PUNCH.dev, dev: PUNCH.kai, kai: PUNCH.sam, sam: WIDE};

const couchCam = (t: number): Cam => {
	if (t < PUNCH.jess) return {cx: 960, cy: 540, s: 1 + 0.03 * easeOut((t - F.couch) / 0.46), rot: 0};
	for (let n = FRIENDS.length - 1; n >= 0; n--) {
		const f = FRIENDS[n];
		if (t >= WIDE) break;
		// the warm beat cuts wider, settling as the stencil sweeps through them
		if (t >= WARM[f]) return zoom(BACK_CAM[f], 1.06 - 0.06 * easeOut((t - WARM[f]) / 0.15) + 0.03 * clamp01((t - WARM[f]) / (NEXT[f] - WARM[f])));
		if (t >= PUNCH[f]) return PUNCH_CAM(f, (t - PUNCH[f]) / (WARM[f] - PUNCH[f]));
	}
	if (t < BUCKLE) return {cx: 960, cy: 540, s: 1 + 0.03 * clamp01((t - WIDE) / (BUCKLE - WIDE)), rot: 0};
	return {cx: 960, cy: 545, s: lerp(1.03, 0.94, easeOut((t - BUCKLE) / 0.3)), rot: 0};
};

// 9:16. The phone sees the stage through SEAM (full bleed on its centre) from the first punch-in to the wide, so the
// rostrum itself frames each friend for an upright frame: P7 point (u, v) lands on frame point (fx, fy) at M frame px
// per paper px. The press draws at the rostrum's scale, so the line screen stays as crisp as in 16:9.
const onP7V = (u: number, v: number, M: number, fx: number, fy: number, rot = 0): Cam =>
	camAt(onSheet(P7S, u, v), [W / 2 + (fx - VW / 2) / K_FILL, H / 2 + (fy - VH / 2) / K_FILL], M / K_FILL, rot);
// The punch-ins: a head-and-shoulders close-up, the face in the upper middle and a little left of centre (clear of
// the feed's buttons), Dev and Sam with their phones low in the frame.
const PUNCH_V: Record<Friend, {M: number; fy: number}> = {
	jess: {M: 3.3, fy: 800},
	dev: {M: 3.0, fy: 680},
	kai: {M: 3.4, fy: 800},
	sam: {M: 3.0, fy: 690},
};
const punchCamV = (f: Friend, k: number): Cam => {
	const p = PUNCH_V[f];
	return zoom(onP7V(P7_FACES[f].u, P7_FACES[f].v, p.M, 500, p.fy, PUNCH_FRAME[f].rot), 1 + 0.045 * k);
};
// ...and the warm beat cuts wider to the whole friend, upright: the name stamping above the hair, the stencil sweeping
// down to the phone as it inks black, a slice of the cold neighbour still waiting at the frame's edge.
// The name's glyphs sit at about y 340 (below the feed's header), the phone at about 1590 (above its buttons).
const BACK_V: Record<Friend, Cam> = {
	jess: onP7V(P7_FACES.jess.u, P7_FACES.jess.v, 2.31, 500, 829),
	dev: onP7V(P7_FACES.dev.u, P7_FACES.dev.v, 2.31, 500, 935),
	kai: onP7V(P7_FACES.kai.u, P7_FACES.kai.v, 2.15, 500, 908),
	sam: onP7V(P7_FACES.sam.u, P7_FACES.sam.v, 2.31, 500, 976),
};
// 64.3, the wash: Maya's ringed hand low in the frame, Jess above it and Dev at the edge, as the room floods out of her
// palm (the names stay clear of the header); a slow push through the beat. Placed so the push's last frame still
// keeps Dev's name left of x 940 (the feed's button column) and Jess's below y 220.
const WASH_V = onP7V(P7_PALM.u, P7_PALM.v, 1.6, 372, 1476);
const couchCamV = (t: number): Cam => {
	if (t >= WASH && t < BUCKLE) return zoom(WASH_V, 1 + 0.04 * clamp01((t - WASH) / (BUCKLE - WASH)));
	if (t < PUNCH.jess || t >= WIDE) return couchCam(t);
	for (let n = FRIENDS.length - 1; n >= 0; n--) {
		const f = FRIENDS[n];
		if (t >= WARM[f]) return zoom(BACK_V[f], 1.06 - 0.06 * easeOut((t - WARM[f]) / 0.15) + 0.03 * clamp01((t - WARM[f]) / (NEXT[f] - WARM[f])));
		if (t >= PUNCH[f]) return punchCamV(f, (t - PUNCH[f]) / (WARM[f] - PUNCH[f]));
	}
	return couchCam(t);
};

/** How far the sheet buckles (degrees each half turns about the centre crease). */
const foldAt = (t: number) => {
	if (t < BUCKLE) return 0;
	const k = t - BUCKLE;
	return 13 * easeOut(k / 0.07) - 9 * easeInOut((k - 0.07) / 0.34) + 1.6 * Math.sin(k * 38) * Math.exp(-k / 0.12);
};

const CouchScene: React.FC<{t: number; cam: Cam; map: Density; vertical?: boolean}> = ({t, cam, map, vertical}) => {
	const sx = P7S.cx - P7S.w / 2;
	const sy = P7S.cy - P7S.h / 2;
	const n = FRIENDS.filter((f) => t >= WARM[f]).length;
	return (
		<>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			<Press cam={cam} sheets={[p7Sheet(map, t, true, punchLook(t, vertical))]} draw={(ctx) => drawPhones(ctx, t, cam)} />
			<CamLayer cam={cam}>
				<CropMarks x={sx} y={sy} w={P7S.w} h={P7S.h} />
				<RegTarget x={sx - 40} y={P7S.cy - 200} color={INK.cold} />
				<RegTarget x={sx + P7S.w + 40} y={P7S.cy + 220} color={n ? INK.heat : INK.cold} />
				<Slug x={sx} y={sy + P7S.h + 20} text={`P7 · U 75° LINE · STENCIL ${n}/4${n ? ' · O 15° · K 45°' : ''}${t >= WASH ? ' · FLOOD' : ''}`} />
				<Rule x={sx + 1000} y={sy + P7S.h + 34} w={P7S.w - 1000} t={t} amp={18} width={2.2} />
				{FRIENDS.map((f) => (
					<Name key={f} f={f} t={t} />
				))}
			</CamLayer>
		</>
	);
};

/**
 * The sheet buckles: two halves turning about the centre crease, which rises toward us. With `lift` (9:16, where the
 * whole sheet is seen lying on the newsprint) each half casts its own shadow on the newsprint, so the sheet itself
 * buckles rather than a print on a flat card.
 */
const Fold: React.FC<{a: number; render: () => React.ReactNode; lift?: boolean}> = ({a, render, lift}) => (
	<AbsoluteFill style={{perspective: 1500, perspectiveOrigin: '50% 50%'}}>
		{(['l', 'r'] as const).map((side) => {
			const half = (
				<div
					key={side}
					style={{
						position: 'absolute',
						inset: 0,
						clipPath: side === 'l' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)',
						transformOrigin: '960px 540px',
						transform: `rotateY(${side === 'l' ? -a : a}deg)`,
						isolation: 'isolate',
						background: INK.paper,
					}}
				>
					{render()}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							mixBlendMode: 'multiply',
							background:
								side === 'l'
									? `linear-gradient(90deg, rgba(70,45,20,${(0.1 * a) / 13}) 0%, rgba(70,45,20,0) 50%)`
									: `linear-gradient(90deg, rgba(70,45,20,0) 50%, rgba(70,45,20,${(0.2 * a) / 13}) 56%, rgba(70,45,20,${(0.1 * a) / 13}) 100%)`,
						}}
					/>
				</div>
			);
			return lift ? (
				<div key={side} style={{position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 50%', filter: `drop-shadow(0 ${16 + a}px ${36 + 2 * a}px rgba(60,40,20,0.3))`}}>
					{half}
				</div>
			) : (
				half
			);
		})}
	</AbsoluteFill>
);

const THUMPS = [bt(61, 2), bt(61, 4)];
const FROZEN_ECG = ecgPoints(F.couch, 1600, 30, 2.6, (b) => THUMPS.some((x) => Math.abs(x - b) < 1e-3));

/**
 * The reverse pull's black FLATLINE sheet peeling up off the print, hinged at the top of the frame. 9:16: the reverse
 * pull lays the word out as FLAT over LINE for the phone, so the peel lifts that same sheet (s_dancing's ReverseSheetV,
 * its ECG frozen on the downbeat) and the cut at 116.100 is seamless.
 */
const Peel: React.FC<{k: number; vertical?: boolean}> = ({k, vertical}) => (
	<AbsoluteFill style={{perspective: 1300, perspectiveOrigin: '50% -30%'}}>
		{/* its shadow on the print, pulled up with it */}
		<div style={{position: 'absolute', left: 0, top: 0, width: W, height: H * (1 - k) + 120, background: `linear-gradient(180deg, rgba(40,25,10,${0.5 * k * (1 - k) * 2}) 70%, rgba(40,25,10,0) 100%)`, mixBlendMode: 'multiply'}} />
		<div style={{position: 'absolute', inset: 0, transformOrigin: '50% -40px', transform: `rotateX(${-118 * k}deg)`}}>
			{vertical ? (
				<ReverseSheetV t={F.couch} />
			) : (
				<>
					<FlatlineBar x={-40} y={-40} w={2000} h={1160} text="FLATLINE" size={430} />
					<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
						<g transform="translate(160 980)">
							<polyline points={FROZEN_ECG} fill="none" stroke={INK.paper} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
						</g>
					</svg>
				</>
			)}
		</div>
	</AbsoluteFill>
);

const couchEndCam = couchCam(F.join - 1e-4);

export const Couch: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P7']);
	const {vertical} = useStage();
	const cam = beatHit(vertical ? couchCamV(t) : couchCam(t), t);
	const peel = easeOut((t - F.couch) / 0.3); // it rips up on the downbeat, slowing as it leaves the frame
	const fold = foldAt(t);
	const scene = () => (d ? <CouchScene t={t} cam={cam} map={d.P7} vertical={vertical} /> : null);
	const lift = vertical && fold > 0.05;
	return (
		<AbsoluteFill style={{background: lift ? 'transparent' : INK.paper}}>
			{fold > 0.05 ? <Fold a={fold} render={scene} lift={lift} /> : scene()}
			{peel < 1 && <Peel k={peel} vertical={vertical} />}
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------ */
/* JOIN (121.626 to 127.141)                                                                                    */

const J = {
	p8: bt(65),
	key: bt(65, 2),
	p9: bt(65, 3),
	gap: bt(65, 4),
	p10: bt(66),
	reg: bt(66, 2),
	p11: bt(66, 3),
	burst: bt(66, 4),
	p12: bt(67),
	maya: bt(67, 2),
	pile: bt(67, 3),
	whip: bt(67, 4),
	end: F.groove,
};

type JId = 'P8' | 'P9' | 'P10' | 'P11' | 'P12';
type Entry = 'match' | 'slam' | 'jolt' | 'spin' | 'drop';
type Shot = {id: JId; t0: number; cx: number; cy: number; rot: number; spread: [number, number, number]; vspread: [number, number, number]; seed: number; entry: Entry; code: string};

/** Full-bleed prints: a hair bigger than the frame, so each one fills it when the camera squares up to it. */
const FULL = {w: 1980, h: 1105};
const ENTRY = 5 / 30;

// Stacked loosely where they land; on 67.3 they fan out round P12 so the pile shows all five.
// 9:16 (vspread): they fan upward instead, a column dealt out of P12, each later print overlapping the one above it
// so the top 46% of each shows (where the faces are), P12 whole at the foot: PILE_CAM_V has the arithmetic.
const SHOTS: Shot[] = [
	{id: 'P8', t0: J.p8, cx: 930, cy: 525, rot: -1.5, spread: [-640, -300, -7], vspread: [-5, -2028, -1.5], seed: 81, entry: 'match', code: 'P8 · 65.1 · O 15° K 45°'},
	{id: 'P9', t0: J.p9, cx: 1000, cy: 560, rot: 2, spread: [650, -290, 6], vspread: [10, -1551, 0.5], seed: 91, entry: 'slam', code: 'P9 · 65.3 · O 15° K 45°'},
	{id: 'P10', t0: J.p10, cx: 950, cy: 570, rot: -0.8, spread: [-650, 300, 5], vspread: [-15, -1049, -1.2], seed: 101, entry: 'jolt', code: 'P10 · 66.1 · O 15° K 45°'},
	{id: 'P11', t0: J.p11, cx: 990, cy: 515, rot: 1.4, spread: [640, 290, -6], vspread: [10, -482, 1.6], seed: 111, entry: 'spin', code: 'P11 · 66.3 · O 15° K 45°'},
	{id: 'P12', t0: J.p12, cx: 965, cy: 545, rot: -1.2, spread: [0, 0, -2.5], vspread: [0, 0, -0.3], seed: 121, entry: 'drop', code: 'P12 · 67.1 · O 15° K 45°'},
];
const [S8, S9, S10, S11, S12] = SHOTS;

/** Where a print is at time t: its slap-in move, then the fan-out on the pile beat. */
const poseOf = (s: Shot, t: number, vertical = false): Pose => {
	const a = 1 - easeOut((t - s.t0) / ENTRY);
	let {cx, cy, rot} = s;
	let k = 1;
	if (s.entry === 'slam') k = 1 + 0.16 * a;
	if (s.entry === 'jolt') cy += 170 * a;
	if (s.entry === 'spin') {
		rot += 11 * a;
		k = 1 + 0.06 * a;
	}
	if (s.entry === 'drop') k = 1 + 0.32 * a;
	if (t >= J.pile) {
		const sp = easeOut((t - J.pile) / 0.3);
		const [dx, dy, dr] = vertical ? s.vspread : s.spread;
		cx += dx * sp;
		cy += dy * sp;
		rot += dr * sp;
	}
	return {...FULL, cx, cy, rot, s: k};
};

const frameShot = (s: Shot, k = 1): Cam => ({cx: s.cx, cy: s.cy, s: k, rot: -s.rot});
const macroCam = (s: Shot, p: {u: number; v: number}, k: number, rot: number): Cam => {
	const [cx, cy] = onSheet({...FULL, cx: s.cx, cy: s.cy, rot: s.rot}, p.u, p.v);
	return {cx, cy, s: k, rot: -s.rot + rot};
};

// 65.1: P8 lands registered on P7 as the couch left it: the same lamp in the same place at the same size, so the sofa
// back lines up too and the cut reads as before/after. The lamp moves only as far as it must for P8 to cover the frame.
const MATCH = (() => {
	const [lx, ly] = toScreen(couchEndCam, onSheet(P7S, P7_LAMP.u, P7_LAMP.v));
	const s = (P7_LAMP.w * P7S.w * couchEndCam.s) / (P8_LAMP.w * FULL.w);
	const sw = FULL.w * s;
	const sh = FULL.h * s;
	const x = Math.min(Math.max(lx, W - (1 - P8_LAMP.u) * sw + 8), P8_LAMP.u * sw - 8);
	const y = Math.min(Math.max(ly, H - (1 - P8_LAMP.v) * sh + 8), P8_LAMP.v * sh - 8);
	return camAt(onSheet({...FULL, cx: S8.cx, cy: S8.cy, rot: S8.rot}, P8_LAMP.u, P8_LAMP.v), [x, y], s, -S8.rot);
})();

// 67.2: a true macro, her face about half the frame high. P12 is shot from above, so at the P9 macro's 2.6x her face
// was a tenth of the frame; it gets a finer screen (5.2 x 4 = 21 px dots) and plates toned to print her pale skin.
const MAYA_ZOOM = 4;
const MAYA_CELL = 5.2;

const PILE_CAM: Cam = {cx: 965, cy: 545, s: 0.46, rot: 0};
// 9:16: the column (P8's top edge at y -2055 to P12's foot at 1097, vspread) seen whole at 0.46 frame px per world px
// through SEAM, a little above centre (feed buttons cover the frame's foot). P12 stays put as the rest fan up out of
// it, so the pull back from P12 rises up the column. The P9 and P12 macros punch in less on the narrow frame (1.6x,
// 2.4x: the mouths and Maya's face about two thirds of its width).
const VPILE_K = 0.46;
const PILE_CAM_V: Cam = {cx: 965, cy: -470, s: VPILE_K / K_FILL, rot: 0};
const P9_ZOOM_V = 1.6;
const MAYA_ZOOM_V = 2.4;
const WHIP_DIST = 3900; // world px: the pile's trailing edge leaves the frame on the downbeat
// 9:16: the column is narrower than the frame's 16:9 pile is wide, so at 3900 it was gone two frames early and the cut
// to the roof came off blank newsprint; 2290 keeps its blurred trailing edge 85% across the last frame, as in 16:9.
const WHIP_DIST_V = 2290;
const WHIP_POW = 4.5;
/** The whip's wind-up: the pile kicks back left on 67.4 before it flies off right. */
const windUp = (k: number) => (k < 0.12 ? 0.6 + 0.4 * easeOut(k / 0.12) : 1 - easeInOut((k - 0.12) / 0.35));

const joinCam = (t: number, vertical = false): Cam => {
	const k = (a: number, b: number) => clamp01((t - a) / (b - a));
	const PILE = vertical ? PILE_CAM_V : PILE_CAM;
	if (t < J.key) return lerpCam(MATCH, frameShot(S8), easeInOut((t - J.p8 - 0.1) / 0.26));
	if (t < J.p9) return frameShot(S8, 1.07 + 0.03 * k(J.key, J.p9)); // key only: punched in
	if (t < J.gap) return frameShot(S9, 1 + 0.025 * k(J.p9, J.gap));
	if (t < J.p10) return macroCam(S9, P9_GAP, (vertical ? P9_ZOOM_V : 2.6) * (1 + 0.07 * k(J.gap, J.p10)), 2.5);
	if (t < J.reg) return frameShot(S10, 1 + 0.025 * k(J.p10, J.reg));
	if (t < J.p11) return frameShot(S10, 1.05 + 0.03 * k(J.reg, J.p11));
	if (t < J.burst) return frameShot(S11, 1 + 0.025 * k(J.p11, J.burst));
	if (t < J.p12) return frameShot(S11, lerp(1, 0.93, easeOut(k(J.burst, J.p12))));
	if (t < J.maya) return frameShot(S12, 1 + 0.025 * k(J.p12, J.maya));
	if (t < J.pile) return macroCam(S12, P12_MAYA, (vertical ? MAYA_ZOOM_V : MAYA_ZOOM) * (1 + 0.07 * k(J.maya, J.pile)), -2.5);
	// 67.3 cuts out of the macro to the whole of P12, which pulls back as the pile fans out under it
	if (t < J.whip) return lerpCam(frameShot(S12, 0.94), zoom(PILE, 1 + 0.03 * k(J.pile, J.whip)), easeOut((t - J.pile) / 0.3));
	const w = k(J.whip, J.end);
	return {...PILE, s: PILE.s * 1.03, cx: PILE.cx + 170 * windUp(w) - (vertical ? WHIP_DIST_V : WHIP_DIST) * Math.pow(w, WHIP_POW), rot: -1.6 * windUp(w)};
};

const plates = (s: Shot, t: number): Plate[] => {
	const [hx, hy] = kickNudge(t, 1, 2.5);
	const [kx, ky] = kickNudge(t, 0, 1.5);
	const heat: Plate = {ch: 1, ink: INK.heat, angle: 15, cell: 8.5, dx: 2 + hx, dy: -1 + hy};
	const key: Plate = {ch: 0, ink: INK.key, angle: 45, cell: 8.5, gain: 0.92, dx: kx, dy: ky};
	// 65.2: the orange plate is lifted: P8 in black alone, hard and bare
	if (s.id === 'P8' && t >= J.key && t < J.p9) return [{...key, gain: 1.35, gamma: 0.8}];
	// 66.2: the jump knocks the plates apart, black up, orange down and right, settling partway back
	if (s.id === 'P10' && t >= J.reg && t < J.p11) {
		const e = 0.4 + 0.6 * Math.exp(-(t - J.reg) / 0.1);
		return [
			{...heat, dx: 22 * e + hx, dy: 14 * e + hy},
			{...key, dx: -12 * e, dy: -42 * e},
		];
	}
	// 66.4: P11 goes to the spin burst (drawn on its own)
	if (s.id === 'P11' && t >= J.burst && t < J.p12) return [];
	// 67.2: Maya's lamp-lit face is the palest thing in P12; lift its mids so brows, eyes and smile print
	if (s.id === 'P12' && t >= J.maya && t < J.pile)
		return [
			{...heat, cell: MAYA_CELL, gain: 1.35, gamma: 0.55},
			{...key, cell: MAYA_CELL, gain: 1, gamma: 0.7},
		];
	return [heat, key];
};

type Dot = {x: number; y: number; r: number; ch: 0 | 1};
const BURST_CELL = 13;

/** P11 re-screened coarse: the dots that spin out of Sam's curls. */
const burstDots = (map: Density): Dot[] => {
	const sh: Sheet = {map, ...FULL, cx: 0, cy: 0, seed: S11.seed, plates: []};
	const out: Dot[] = [];
	for (const p of [
		{ch: 1 as const, ink: INK.heat, angle: 15, cell: BURST_CELL},
		{ch: 0 as const, ink: INK.key, angle: 45, cell: BURST_CELL, gain: 0.95},
	]) {
		const a = plateDots(sh, p);
		for (let i = 0; i < a.length; i += 5) out.push({x: a[i], y: a[i + 1], r: a[i + 2], ch: p.ch});
	}
	return out;
};

/** The burst: the coarse dots spin out round her face, faster the further out (her curls flying). */
const drawBurst = (ctx: CanvasRenderingContext2D, dots: Dot[], t: number, cam: Cam) => {
	const tau = t - J.burst;
	const e = 0.22 + 0.78 * easeOut(tau / 0.28) + 0.4 * tau;
	const pose = poseOf(S11, t);
	const m = sheetMatrix(pose, cam, W, H);
	const k = Math.hypot(m[0], m[1]);
	const ox = P11_SPIN.u * FULL.w;
	const oy = P11_SPIN.v * FULL.h;
	ctx.save();
	ctx.globalCompositeOperation = 'multiply';
	for (const ch of [1, 0] as const) {
		ctx.fillStyle = ch ? INK.heat : INK.key;
		ctx.beginPath();
		for (const d of dots) {
			if (d.ch !== ch) continue;
			const dx = d.x - ox;
			const dy = d.y - oy;
			const r = Math.hypot(dx, dy);
			const wgt = Math.pow(clamp01((r - 120) / 300), 1.3); // her face stays, the curls and then the room fly
			const a = Math.atan2(dy, dx) + wgt * e * (0.5 + r / 1600);
			const rr = r + wgt * e * (0.5 * r + 90);
			const x = ox + rr * Math.cos(a);
			const y = oy + rr * Math.sin(a);
			const R = d.r * (1 + 1.1 * wgt * e) * k; // flying at us: the dots swell
			const sx = m[0] * x + m[2] * y + m[4];
			const sy = m[1] * x + m[3] * y + m[5];
			if (sx < -R || sy < -R || sx > W + R || sy > H + R) continue;
			ctx.moveTo(sx + R, sy);
			ctx.arc(sx, sy, R, 0, Math.PI * 2);
		}
		ctx.fill();
	}
	ctx.restore();
};

/** A print's paper (opaque, so it hides the prints under it) and its shadow on the pile. */
const SheetPaper: React.FC<{pose: Pose; lift: number}> = ({pose, lift}) => (
	<div
		style={{
			position: 'absolute',
			left: pose.cx - pose.w / 2,
			top: pose.cy - pose.h / 2,
			width: pose.w,
			height: pose.h,
			transform: `rotate(${pose.rot ?? 0}deg) scale(${pose.s ?? 1})`,
			boxShadow: `0 ${6 + 30 * lift}px ${14 + 60 * lift}px rgba(50,32,15,${0.3 + 0.15 * lift})`,
		}}
	>
		<Paper x={0} y={0} w={pose.w} h={pose.h} />
	</div>
);

/** Each print's edge code, and the one it carries on its variation beat (when the code is the point). */
const CODES: {id: JId; t0: number; t1: number; code: string}[] = [
	{id: 'P8', t0: J.key, t1: J.p9, code: 'P8 · 65.2 · K 45° ONLY'},
	{id: 'P9', t0: J.gap, t1: J.p10, code: 'P9 · 65.4 · MACRO 2.6×'},
	{id: 'P10', t0: J.reg, t1: J.p11, code: 'P10 · 66.2 · OFF REGISTER'},
	{id: 'P11', t0: J.burst, t1: J.p12, code: 'P11 · 66.4 · DOT BURST · 13'},
	{id: 'P12', t0: J.maya, t1: J.pile, code: `P12 · 67.2 · MACRO ${MAYA_ZOOM}×`},
];
const codeOf = (s: Shot, t: number) => CODES.find((c) => c.id === s.id && t >= c.t0 && t < c.t1)?.code ?? s.code;

const CHIP_FONT = 17;
const chipStyle: React.CSSProperties = {position: 'absolute', left: 0, bottom: 0, padding: '4px 10px 3px', background: INK.paper, fontFamily: MONO, fontSize: CHIP_FONT, lineHeight: 1.2, letterSpacing: '0.12em', color: INK.key, whiteSpace: 'nowrap'};

/** The edge code in the print's bottom-left corner, on a strip of bare paper (printed after the image): on the pile. */
const SheetCode: React.FC<{pose: Pose; code: string}> = ({pose, code}) => (
	<div style={{position: 'absolute', left: pose.cx - pose.w / 2, top: pose.cy - pose.h / 2, width: pose.w, height: pose.h, transform: `rotate(${pose.rot ?? 0}deg) scale(${pose.s ?? 1})`}}>
		<div style={{...chipStyle, left: 40, bottom: 34}}>{code}</div>
	</div>
);

/**
 * The top print's edge code as the viewer sees it: at the print's bottom-left corner and turned with it, but never
 * bigger than 1.1x and always whole inside a 40 px safe area, whatever the camera's punch (on the macros it sits in
 * the frame's corner).
 */
const SAFE = 40;
const ScreenCode: React.FC<{pose: Pose; cam: Cam; code: string}> = ({pose, cam, code}) => {
	const m = sheetMatrix(pose, cam, W, H);
	const sc = Math.min(1.1, Math.max(0.5, Math.hypot(m[0], m[1])));
	const px = 40;
	const py = pose.h - 34;
	const w = (code.length * 0.72 * CHIP_FONT + 22) * sc;
	const h = (CHIP_FONT * 1.2 + 7) * sc;
	const x = Math.min(Math.max(m[0] * px + m[2] * py + m[4], SAFE), W - SAFE - w);
	const y = Math.max(Math.min(m[1] * px + m[3] * py + m[5], H - SAFE), SAFE + h);
	const rot = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
	return (
		<div style={{position: 'absolute', left: x, top: y, transformOrigin: '0 0', transform: `rotate(${rot}deg) scale(${sc})`}}>
			<div style={chipStyle}>{code}</div>
		</div>
	);
};

export const Join: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P8', 'P9', 'P10', 'P11', 'P12']);
	const {vertical} = useStage();
	const dots = useMemo(() => (d ? burstDots(d.P11) : []), [d]);
	const blurId = `couch-whip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
	const whipK = clamp01((t - J.whip) / (J.end - J.whip));
	const cam = beatHit(joinCam(t, vertical), t, t >= J.whip ? 1.4 : 0.6);
	// motion blur along the whip: about half the distance travelled per frame
	const pileS = (vertical ? PILE_CAM_V : PILE_CAM).s;
	const whipDist = vertical ? WHIP_DIST_V : WHIP_DIST;
	const blur = t >= J.whip ? Math.min(110, (0.45 * whipDist * pileS * WHIP_POW * Math.pow(whipK, WHIP_POW - 1)) / ((J.end - J.whip) * 30)) : 0;
	const landed = SHOTS.filter((s) => t >= s.t0);
	const top = landed.length - 1;
	const pile = t >= J.pile;
	// what can be seen: the top print, the one under it while the top one is still moving in, everything in the pile
	const shown = landed.filter((s, n) => pile || n === top || (n === top - 1 && t < SHOTS[top].t0 + ENTRY + 1 / 30));
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<defs>
					<filter id={blurId} x="-20%" y="-5%" width="140%" height="110%">
						<feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} />
					</filter>
				</defs>
			</svg>
			<AbsoluteFill style={{filter: blur > 0.5 ? `url(#${blurId})` : undefined, isolation: 'isolate', background: INK.paper}}>
				<CamLayer cam={cam}>
					<Paper x={-8000} y={-3000} w={16000} h={7000} />
				</CamLayer>
				{pile &&
					(vertical ? (
						// 9:16: the trace runs under the column's foot, the slug over its head
						<CamLayer cam={cam}>
							<Rule x={-260} y={1250} w={2450} t={t} amp={70} width={7} />
							<Slug x={-40} y={-2160} size={44} text="P8–P12 · THEY JOIN HER · 5 PULLS" />
						</CamLayer>
					) : (
						<CamLayer cam={cam}>
							<Rule x={-420} y={1530} w={2770} t={t} amp={46} width={5} />
							<Slug x={-420} y={1590} size={30} text="P8–P12 · THEY JOIN HER · 5 PULLS · O 15° K 45° · 85 LPI" />
						</CamLayer>
					))}
				{shown.map((s) => {
					const pose = poseOf(s, t, vertical);
					const lift = 1 - easeOut((t - s.t0) / ENTRY);
					// 66.4: the burst flies on an unbounded field, so P11's own paper and shadow go while it is on
					const burst = s.id === 'P11' && t >= J.burst && t < J.p12;
					return (
						<React.Fragment key={s.id}>
							{!burst && (
								<CamLayer cam={cam}>
									<SheetPaper pose={pose} lift={lift} />
								</CamLayer>
							)}
							<Press cam={cam} sheets={[{map: d[s.id], ...pose, seed: s.seed, plates: plates(s, t)}]} />
							{pile ? (
								<CamLayer cam={cam}>
									<SheetCode pose={pose} code={s.code} />
								</CamLayer>
							) : (
								s === SHOTS[top] && !burst && <ScreenCode pose={pose} cam={cam} code={codeOf(s, t)} />
							)}
						</React.Fragment>
					);
				})}
				{t >= J.burst && t < J.p12 && <Press cam={cam} sheets={[]} draw={(ctx) => drawBurst(ctx, dots, t, cam)} />}
				{t >= J.burst && t < J.p12 && <ScreenCode pose={poseOf(S11, t)} cam={cam} code={codeOf(S11, t)} />}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------ */
/* 9:16                                                                                                         */

/** The hand-over contract with the neighbours' sections: full bleed on the stage centre. */
const SEAM: Frame = {k: K_FILL, x: 960, y: 540};
/** The whole sheet lying on the newsprint. */
const FIT: Frame = {k: K_FIT, x: 960, y: 540};

/**
 * Couch on the phone. 62.1 opens on the seam as the black sheet rips up, then drifts right to put Dev and Kai inside
 * the safe width. From 62.2 the rostrum frames for the upright frame (couchCamV): each friend's face, cold, on its punch
 * beat, then the whole friend, warm, on the next. 64.2 pulls right back to the whole sofa (the first time we see all
 * four, all warm) as a sheet on the newsprint; 64.3 cuts in on Maya's hand as the room floods out of her palm, with
 * Jess above it; 64.4 back to the whole sheet as it buckles, the framing P8 registers on at 65.1.
 */
const COUCH_V = vtrack([
	[F.couch, SEAM],
	[F.couch + 0.42, bleed(1000), 0.24],
	[PUNCH.jess, SEAM],
	[WIDE, FIT],
	[WASH, SEAM],
	// the sheet off its card: the buckling halves lie on the newsprint itself (Fold's lift)
	[BUCKLE, {...FIT, clip: false}],
]);

/**
 * Join on the phone, a face on every beat. 65.1 P8 lands registered on the buckled sheet (the same framing), then pushes
 * into Maya dancing in the middle of it, with the rostrum's own move; 65.2 key only on Dev and Sam; 65.3 P9, Jess and
 * Maya nose to nose; 65.4 the macro of their mouths; 66.1 P10 Dev in the air; 66.2 off register on Kai; 66.3 P11 Sam
 * spinning; 66.4 her dots burst round her face; 67.1 P12, the whole circle from above (any upright slice of it is a
 * jumble of halftone at full bleed), on its card; 67.2 her face, full bleed; 67.3
 * the pull back and up the column of prints (vspread); 67.4 the whip right, on the seam into the roof.
 * Stage x of each subject at the rostrum's frameShot(Sn): 960 + (u - 0.5) * 1980 * zoom.
 */
const JOIN_V = vtrack([
	[J.p8, FIT],
	[J.p8 + 0.36, bleed(1022), 0.26],
	[J.key, bleed(1590)],
	[J.p9, bleed(1066)],
	[J.gap, SEAM],
	[J.p10, bleed(785)],
	[J.reg, bleed(1250)],
	[J.p11, bleed(945)],
	[J.burst, bleed(950)],
	// the overhead circle only reads whole: the print bleeds off the frame's sides, newsprint above and below it
	[J.p12, {k: 0.84, x: 1019, y: 540}],
	[J.maya, SEAM],
	[J.pile, SEAM],
]);

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {Couch: {v: COUCH_V}, Join: {v: JOIN_V}};
