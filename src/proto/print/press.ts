import {Density, getSpeckle, sample} from './density';
import {hash2} from './ink';

/**
 * The press: screens a density map into halftone plates, live, on a canvas.
 * The screen is attached to the paper (dots move with the sheet, no shimmer from sliding the image under a fixed
 * screen). Overprints multiply, so orange over ultramarine gives plum.
 */
export type Plate = {
	ch: 0 | 1 | 2; // density channel: 0 key, 1 heat, 2 cold
	ink: string;
	angle: number; // degrees
	cell: number; // paper px
	kind?: 'dot' | 'line'; // real world gets round dots, the screen world a line screen
	dx?: number; // misregistration, screen px
	dy?: number;
	gain?: number;
	lift?: number; // subtracted from density (press running dry)
	gamma?: number;
	/** 0..1 multiplier for density at image fraction (u, v): stencils, letter windows. */
	mask?: (u: number, v: number) => number;
	/** squeegee pull: ink only where paper x fraction < pull (or y when pullY). */
	pull?: number;
	pullY?: boolean;
	/** split fountain: ink blends from fountain[0] at the top of the sheet to fountain[1] at the bottom */
	fountain?: [string, string];
	alpha?: number;
};

export type Sheet = {
	map: Density;
	crop?: [number, number, number, number]; // image fraction x0, y0, x1, y1
	flipX?: boolean;
	w: number; // paper px
	h: number;
	cx: number; // world position of the sheet centre
	cy: number;
	s?: number;
	rot?: number; // degrees
	plates: Plate[];
	speckle?: number; // ink-void strength 0..1
	clip?: [number, number][]; // polygon in paper fractions
	ground?: string; // paper colour filled inside the clip first (cut-outs)
	seed?: number;
};

export type Cam = {cx: number; cy: number; s: number; rot?: number};
export const CAM0: Cam = {cx: 960, cy: 540, s: 1, rot: 0};

export type M = [number, number, number, number, number, number];

/** Paper px -> screen px for a sheet seen through a camera on a screen of size sw x sh. */
export const sheetMatrix = (sh: Pick<Sheet, 'w' | 'h' | 'cx' | 'cy' | 's' | 'rot'>, cam: Cam, sw: number, shh: number, res = 1): M => {
	const r1 = ((sh.rot ?? 0) * Math.PI) / 180;
	const s1 = sh.s ?? 1;
	const r2 = ((cam.rot ?? 0) * Math.PI) / 180;
	const s2 = cam.s;
	// paper -> world: W = C + R1 s1 (p - h)
	const a1 = Math.cos(r1) * s1;
	const b1 = Math.sin(r1) * s1;
	const e1 = sh.cx - (a1 * sh.w) / 2 + (b1 * sh.h) / 2;
	const f1 = sh.cy - (b1 * sh.w) / 2 - (a1 * sh.h) / 2;
	// world -> screen: S = O + R2 s2 (W - camC)
	const a2 = Math.cos(r2) * s2 * res;
	const b2 = Math.sin(r2) * s2 * res;
	const e2 = (sw / 2) * res - a2 * cam.cx + b2 * cam.cy;
	const f2 = (shh / 2) * res - b2 * cam.cx - a2 * cam.cy;
	// compose: screen = A2 (A1 p + t1) + t2
	const a = a2 * a1 - b2 * b1;
	const b = b2 * a1 + a2 * b1;
	const c = a2 * -b1 - b2 * a1;
	const d = b2 * -b1 + a2 * a1;
	const e = a2 * e1 - b2 * f1 + e2;
	const f = b2 * e1 + a2 * f1 + f2;
	return [a, b, c, d, e, f];
};

let patternCache: {img: HTMLImageElement; ctx: CanvasRenderingContext2D; pat: CanvasPattern} | null = null;

/** Paper coordinates of the dots a plate prints, with radius in paper px: [x, y, r, i, j] per dot. */
export const plateDots = (sheet: Sheet, plate: Plate): Float32Array => {
	const out: number[] = [];
	eachDot(sheet, plate, (x, y, r, i, j) => {
		out.push(x, y, r, i, j);
	});
	return new Float32Array(out);
};

const eachDot = (sheet: Sheet, p: Plate, cb: (x: number, y: number, r: number, i: number, j: number) => void) => {
	const {w, h, map} = sheet;
	const [x0, y0, x1, y1] = sheet.crop ?? [0, 0, 1, 1];
	const cw = x1 - x0;
	const chh = y1 - y0;
	const th = (p.angle * Math.PI) / 180;
	const ux = Math.cos(th);
	const uy = Math.sin(th);
	const c = p.cell;
	const R = Math.ceil(Math.hypot(w, h) / 2 / c) + 1;
	const gain = p.gain ?? 1;
	const lift = p.lift ?? 0;
	const gamma = p.gamma ?? 1;
	const seed = (sheet.seed ?? 0) + p.ch * 17 + Math.round(p.angle);
	const pull = p.pull ?? 2;
	for (let i = -R; i <= R; i++) {
		for (let j = -R; j <= R; j++) {
			const jx = (hash2(i, j, seed) - 0.5) * 0.06 * c;
			const jy = (hash2(j, i, seed + 3) - 0.5) * 0.06 * c;
			const px = w / 2 + (i * ux - j * uy) * c + jx;
			const py = h / 2 + (i * uy + j * ux) * c + jy;
			if (px < -c || py < -c || px > w + c || py > h + c) continue;
			const fx = px / w;
			const fy = py / h;
			if ((p.pullY ? fy : fx) > pull) continue;
			const u = x0 + (sheet.flipX ? 1 - fx : fx) * cw;
			const v = y0 + fy * chh;
			let den = sample(map, p.ch, Math.min(0.9999, Math.max(0, u)), Math.min(0.9999, Math.max(0, v)));
			if (gamma !== 1) den = Math.pow(den, gamma);
			den = den * gain - lift;
			if (p.mask) den *= p.mask(u, v);
			if (den <= 0.015) continue;
			// dot gain varies a little dot to dot, like real ink on newsprint
			const r = c * 0.7 * Math.sqrt(Math.min(den, 1.15)) * (0.93 + 0.14 * hash2(i, j, seed + 9));
			cb(px, py, r, i, j);
		}
	}
};

const drawLines = (ctx: CanvasRenderingContext2D, sheet: Sheet, p: Plate, m: M) => {
	const {w, h, map} = sheet;
	const [x0, y0, x1, y1] = sheet.crop ?? [0, 0, 1, 1];
	const th = (p.angle * Math.PI) / 180;
	const ux = Math.cos(th);
	const uy = Math.sin(th);
	const c = p.cell;
	const R = Math.ceil(Math.hypot(w, h) / 2 / c) + 1;
	const gain = p.gain ?? 1;
	const lift = p.lift ?? 0;
	const k = Math.hypot(m[0], m[1]);
	const pull = p.pull ?? 2;
	const step = 0.5;
	const tops: number[] = [];
	const bots: number[] = [];
	const flush = () => {
		if (tops.length >= 4) {
			ctx.moveTo(tops[0], tops[1]);
			for (let q = 2; q < tops.length; q += 2) ctx.lineTo(tops[q], tops[q + 1]);
			for (let q = bots.length - 2; q >= 0; q -= 2) ctx.lineTo(bots[q], bots[q + 1]);
			ctx.closePath();
		}
		tops.length = 0;
		bots.length = 0;
	};
	const nx = -uy;
	const ny = ux;
	const dx = p.dx ?? 0;
	const dy = p.dy ?? 0;
	for (let j = -R; j <= R; j++) {
		for (let ii = -2 * R; ii <= 2 * R; ii++) {
			const i = ii * step;
			const px = w / 2 + (i * ux + j * nx) * c;
			const py = h / 2 + (i * uy + j * ny) * c;
			const inside = px >= 0 && py >= 0 && px <= w && py <= h && (p.pullY ? py / h : px / w) <= pull;
			let hh = 0;
			if (inside) {
				const fx = px / w;
				const u = x0 + (sheet.flipX ? 1 - fx : fx) * (x1 - x0);
				const v = y0 + (py / h) * (y1 - y0);
				let den = sample(map, p.ch, Math.min(0.9999, u), Math.min(0.9999, v)) * gain - lift;
				if (p.mask) den *= p.mask(u, v);
				hh = c * 0.5 * Math.pow(Math.max(0, Math.min(1, den)), 0.85) * 1.04;
			}
			if (hh * k < 0.2) {
				flush();
				continue;
			}
			const tx = px + nx * hh;
			const ty = py + ny * hh;
			const bx = px - nx * hh;
			const by = py - ny * hh;
			tops.push(m[0] * tx + m[2] * ty + m[4] + dx, m[1] * tx + m[3] * ty + m[5] + dy);
			bots.push(m[0] * bx + m[2] * by + m[4] + dx, m[1] * bx + m[3] * by + m[5] + dy);
		}
		flush();
	}
};

/** Draws one sheet's plates into ctx through matrix m (paper -> canvas px). */
export const drawSheet = (ctx: CanvasRenderingContext2D, sheet: Sheet, m: M, cw: number, chh: number) => {
	const k = Math.hypot(m[0], m[1]);
	ctx.save();
	ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
	ctx.beginPath();
	if (sheet.clip) {
		sheet.clip.forEach(([x, y], n) => (n ? ctx.lineTo(x * sheet.w, y * sheet.h) : ctx.moveTo(x * sheet.w, y * sheet.h)));
		ctx.closePath();
	} else {
		ctx.rect(0, 0, sheet.w, sheet.h);
	}
	ctx.clip();
	if (sheet.ground) {
		ctx.fillStyle = sheet.ground;
		ctx.fillRect(0, 0, sheet.w, sheet.h);
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	for (const p of sheet.plates) {
		ctx.globalCompositeOperation = 'multiply';
		ctx.globalAlpha = p.alpha ?? 1;
		if (p.fountain) {
			// gradient in paper space, mapped through m
			const g = ctx.createLinearGradient(m[4], m[5], m[2] * sheet.h + m[4], m[3] * sheet.h + m[5]);
			g.addColorStop(0.0, p.fountain[0]);
			g.addColorStop(0.42, p.fountain[0]);
			g.addColorStop(0.72, p.fountain[1]);
			g.addColorStop(1, p.fountain[1]);
			ctx.fillStyle = g;
		} else {
			ctx.fillStyle = p.ink;
		}
		ctx.beginPath();
		if (p.kind === 'line') {
			drawLines(ctx, sheet, p, m);
		} else {
			const dx = p.dx ?? 0;
			const dy = p.dy ?? 0;
			const pad = 4;
			eachDot(sheet, p, (x, y, r) => {
				const R = r * k;
				if (R < 0.3) return;
				const sx = m[0] * x + m[2] * y + m[4] + dx;
				const sy = m[1] * x + m[3] * y + m[5] + dy;
				if (sx < -R - pad || sy < -R - pad || sx > cw + R + pad || sy > chh + R + pad) return;
				ctx.moveTo(sx + R, sy);
				ctx.arc(sx, sy, R, 0, Math.PI * 2);
			});
		}
		ctx.fill();
	}
	// ink voids: riso-style coverage grain, stuck to the sheet
	const sp = getSpeckle();
	if (sp && (sheet.speckle ?? 0.5) > 0) {
		if (!patternCache || patternCache.ctx !== ctx) {
			const pat = ctx.createPattern(sp, 'repeat');
			if (pat) patternCache = {img: sp, ctx, pat};
		}
		if (patternCache) {
			ctx.globalCompositeOperation = 'destination-out';
			ctx.globalAlpha = sheet.speckle ?? 0.5;
			ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
			ctx.fillStyle = patternCache.pat;
			ctx.fillRect(0, 0, sheet.w, sheet.h);
		}
	}
	ctx.restore();
};
