import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

/**
 * Ink-density maps made by tools/print_plates.py from the existing stills (R = key, G = heat, B = cold).
 * They are screened live by the press, so one map serves posters, macro crops and the dot confetti.
 */
const URLS: Record<string, string> = {
	R3: new URL('./plates/R3.png', import.meta.url).href,
	R4: new URL('./plates/R4.png', import.meta.url).href,
	R5: new URL('./plates/R5.png', import.meta.url).href,
	R6: new URL('./plates/R6.png', import.meta.url).href,
	R7: new URL('./plates/R7.png', import.meta.url).href,
	R8: new URL('./plates/R8.png', import.meta.url).href,
	R9: new URL('./plates/R9.png', import.meta.url).href,
	R10: new URL('./plates/R10.png', import.meta.url).href,
	R11: new URL('./plates/R11.png', import.meta.url).href,
	R12: new URL('./plates/R12.png', import.meta.url).href,
	R13: new URL('./plates/R13.png', import.meta.url).href,
	R14: new URL('./plates/R14.png', import.meta.url).href,
	S1: new URL('./plates/S1.png', import.meta.url).href,
	S2: new URL('./plates/S2.png', import.meta.url).href,
	S3: new URL('./plates/S3.png', import.meta.url).href,
	S5: new URL('./plates/S5.png', import.meta.url).href,
};

export const PAPER_URL = new URL('./plates/paper.jpg', import.meta.url).href;
export const SPECKLE_URL = new URL('./plates/speckle.png', import.meta.url).href;

export type Density = {id: string; w: number; h: number; data: Uint8ClampedArray};

const cache = new Map<string, Density>();
const pending = new Map<string, Promise<Density>>();
let speckle: HTMLImageElement | null = null;
let specklePending: Promise<HTMLImageElement> | null = null;

const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

const load = (id: string): Promise<Density> => {
	const hit = cache.get(id);
	if (hit) return Promise.resolve(hit);
	let p = pending.get(id);
	if (!p) {
		p = loadImage(URLS[id]).then((img) => {
			const c = document.createElement('canvas');
			c.width = img.naturalWidth;
			c.height = img.naturalHeight;
			const ctx = c.getContext('2d', {willReadFrequently: true})!;
			ctx.drawImage(img, 0, 0);
			const d: Density = {id, w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data};
			cache.set(id, d);
			return d;
		});
		pending.set(id, p);
	}
	return p;
};

export const getSpeckle = () => speckle;

/** Loads the named density maps (and the ink-speckle texture), holding the render until they are ready. */
export const useDensities = (ids: string[]): Record<string, Density> | null => {
	const key = ids.join(',');
	const ready = () => ids.every((i) => cache.has(i)) && speckle !== null;
	const [handle] = useState(() => (ready() ? null : delayRender(`density ${key}`)));
	const [, setTick] = useState(0);
	useEffect(() => {
		if (ready()) return;
		if (!specklePending) specklePending = loadImage(SPECKLE_URL).then((i) => (speckle = i));
		Promise.all([...ids.map(load), specklePending]).then(() => setTick((n) => n + 1));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
	const ok = ready();
	useEffect(() => {
		if (ok && handle !== null) continueRender(handle);
	}, [ok, handle]);
	if (!ok) return null;
	const out: Record<string, Density> = {};
	for (const i of ids) out[i] = cache.get(i)!;
	return out;
};

/** Ink density 0..1 of channel ch (0 key, 1 heat, 2 cold) at image fraction (u, v). Bilinear. */
export const sample = (d: Density, ch: number, u: number, v: number): number => {
	if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
	const x = u * (d.w - 1);
	const y = v * (d.h - 1);
	const x0 = x | 0;
	const y0 = y | 0;
	const fx = x - x0;
	const fy = y - y0;
	const x1 = Math.min(x0 + 1, d.w - 1);
	const y1 = Math.min(y0 + 1, d.h - 1);
	const D = d.data;
	const a = D[(y0 * d.w + x0) * 4 + ch];
	const b = D[(y0 * d.w + x1) * 4 + ch];
	const c = D[(y1 * d.w + x0) * 4 + ch];
	const e = D[(y1 * d.w + x1) * 4 + ch];
	return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy) / 255;
};
