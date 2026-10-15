import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Ink-density maps made by tools/print_plates.py from the stills (R = key, G = heat, B = cold), read from
 * public/plates/<ID>.png at render time. They are screened live by the press, so one map serves posters,
 * macro crops and the dot confetti. A missing plate prints as bare paper (and logs) instead of stopping the render.
 */
export const plateUrl = (id: string) => staticFile(`plates/${id}.png`);
export const PAPER_URL = staticFile('plates/paper.jpg');
export const SPECKLE_URL = staticFile('plates/speckle.png');

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
		p = loadImage(plateUrl(id)).then((img) => {
			const c = document.createElement('canvas');
			c.width = img.naturalWidth;
			c.height = img.naturalHeight;
			const ctx = c.getContext('2d', {willReadFrequently: true})!;
			ctx.drawImage(img, 0, 0);
			const d: Density = {id, w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data};
			cache.set(id, d);
			return d;
		}, () => {
			console.error(`plate ${id} is missing: run python3 src/print/tools/print_plates.py`);
			const d: Density = {id, w: 2, h: 2, data: new Uint8ClampedArray(16)};
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
