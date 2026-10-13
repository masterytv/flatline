// Hand-traced shapes in photo-fraction units (x, y of the full still), like FRIENDS in src/full/moments.tsx.
export type Poly = [number, number][];

/** Point in polygon (even-odd). */
export const inPoly = (poly: Poly, u: number, v: number): boolean => {
	let c = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i];
		const [xj, yj] = poly[j];
		if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
};

export const bbox = (poly: Poly) => {
	const xs = poly.map((p) => p[0]);
	const ys = poly.map((p) => p[1]);
	return {x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys)};
};

/** S5, the five friends on the sofa, left to right. Maya is second from left. */
export const S5_PEOPLE: Record<'southAsian' | 'maya' | 'black' | 'eastAsian' | 'curly', Poly> = {
	southAsian: [[0.21, 0.33], [0.29, 0.31], [0.31, 0.36], [0.31, 0.46], [0.335, 0.5], [0.34, 0.62], [0.36, 0.68], [0.4, 0.7], [0.42, 0.76], [0.49, 0.8], [0.52, 1.0], [0.14, 1.0], [0.13, 0.62], [0.17, 0.53], [0.215, 0.5], [0.205, 0.42]],
	maya: [[0.36, 0.33], [0.42, 0.31], [0.46, 0.36], [0.47, 0.45], [0.48, 0.53], [0.52, 0.57], [0.53, 0.63], [0.51, 0.7], [0.55, 0.78], [0.585, 1.0], [0.525, 1.0], [0.49, 0.8], [0.42, 0.76], [0.4, 0.7], [0.36, 0.68], [0.34, 0.62], [0.335, 0.5], [0.35, 0.42]],
	black: [[0.515, 0.36], [0.56, 0.32], [0.605, 0.35], [0.62, 0.48], [0.63, 0.55], [0.645, 0.64], [0.635, 0.71], [0.665, 0.78], [0.7, 0.93], [0.65, 0.95], [0.6, 0.82], [0.55, 0.78], [0.51, 0.7], [0.53, 0.63], [0.52, 0.57], [0.48, 0.53], [0.5, 0.45]],
	eastAsian: [[0.69, 0.34], [0.74, 0.31], [0.78, 0.34], [0.775, 0.45], [0.8, 0.5], [0.8, 0.56], [0.83, 0.66], [0.86, 0.78], [0.84, 0.9], [0.76, 0.9], [0.7, 0.93], [0.665, 0.78], [0.635, 0.71], [0.645, 0.64], [0.63, 0.55], [0.64, 0.5], [0.7, 0.47], [0.685, 0.42]],
	curly: [[0.79, 0.34], [0.83, 0.31], [0.87, 0.34], [0.88, 0.44], [0.885, 0.5], [0.91, 0.56], [0.915, 0.64], [0.91, 0.72], [0.86, 0.78], [0.83, 0.66], [0.8, 0.56], [0.8, 0.5], [0.775, 0.45], [0.78, 0.4]],
};

/** Their phones (lit screens), same order. */
export const S5_PHONES: Record<keyof typeof S5_PEOPLE, Poly> = {
	southAsian: [[0.333, 0.712], [0.39, 0.683], [0.396, 0.7], [0.345, 0.729]],
	maya: [[0.483, 0.618], [0.515, 0.591], [0.525, 0.6], [0.492, 0.629]],
	black: [[0.602, 0.612], [0.628, 0.582], [0.64, 0.592], [0.612, 0.625]],
	eastAsian: [[0.785, 0.62], [0.81, 0.59], [0.819, 0.598], [0.795, 0.633]],
	curly: [[0.868, 0.59], [0.895, 0.565], [0.904, 0.574], [0.876, 0.604]],
};

/** R6, the marble table seen from above: seven face-down phones (corner quads, image fractions). */
export const R6_PHONES: Poly[] = [
	[[0.204, 0.467], [0.325, 0.451], [0.33, 0.531], [0.209, 0.548]], // left
	[[0.246, 0.698], [0.364, 0.557], [0.404, 0.64], [0.286, 0.775]], // lower left
	[[0.429, 0.636], [0.501, 0.656], [0.471, 0.89], [0.388, 0.851]], // bottom centre
	[[0.549, 0.64], [0.571, 0.606], [0.696, 0.762], [0.668, 0.83]], // lower right
	[[0.597, 0.487], [0.739, 0.535], [0.729, 0.625], [0.589, 0.571]], // right
	[[0.571, 0.41], [0.671, 0.323], [0.704, 0.371], [0.607, 0.448]], // upper right
	[[0.504, 0.339], [0.568, 0.25], [0.611, 0.275], [0.55, 0.371]], // top
];

/** S2 faces for the R6 windows: centre x, y and face width (image fractions). Black, East Asian and South Asian guests included. */
export const S2_FACES: [number, number, number][] = [
	[0.321, 0.378, 0.075], // laughing, Black
	[0.518, 0.47, 0.062], // East Asian woman
	[0.714, 0.42, 0.068], // South Asian man, patterned shirt
	[0.127, 0.41, 0.055], // smiling woman, left
	[0.41, 0.4, 0.052], // man behind, centre
	[0.907, 0.445, 0.055], // woman in profile, right
	[0.782, 0.39, 0.046], // man at the back
];
