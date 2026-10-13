// Proof of Life: paper plus four inks, nothing else.
export const INK = {
	paper: '#EFE7D6', // newsprint cream: the ground of every frame, highlights are bare paper
	paperShade: '#E2D8C3',
	key: '#1B1A17', // warm black
	heat: '#FF5F1F', // fluorescent orange: life and the real world
	cold: '#2B3AC9', // ultramarine: only the screen-world memory
	lime: '#C6FF3D', // TokTic's own ink, only 2:23–2:38 and the 3:25 receipt
};

export const ANTON = "'Anton', 'Inter', sans-serif"; // condensed wood-type caps
export const SERIF = "'Instrument Serif', Georgia, serif"; // the human voice (italic)
export const MONO = "'IBM Plex Mono', monospace"; // slugs, crop-mark labels, receipts

/** Deterministic 0..1 hash for integer pairs (dots and jitter that stick to the sheet). */
export const hash2 = (a: number, b: number, s = 0): number => {
	let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	h = h ^ (h >>> 16);
	return ((h >>> 0) % 100000) / 100000;
};
