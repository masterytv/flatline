// Hand-traced shapes in photo-fraction units (u, v of the full still), read off gridded copies of the real photos.
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

/* ------------------------------------------------------------------------------------------------------------ */
/* P7, the friends on the sofa (couch stencils, 1:56.1). Left to right Jess, Dev, Kai, Sam; Maya's ringed hand     */
/* reaches in from the bottom-left. Traced from public/stills/P7.png (2752x1536) on a 0.025 grid.                 */

export type Friend = 'jess' | 'dev' | 'kai' | 'sam';
export const FRIENDS: Friend[] = ['jess', 'dev', 'kai', 'sam'];

/** Each friend, head to the bottom edge (the hand is drawn over Jess and Dev, so it wins where they overlap). */
export const P7_PEOPLE: Record<Friend, Poly> = {
	jess: [[0.222, 0.258], [0.245, 0.262], [0.265, 0.272], [0.283, 0.292], [0.293, 0.322], [0.292, 0.355], [0.284, 0.385], [0.279, 0.41], [0.276, 0.432], [0.29, 0.445], [0.31, 0.46], [0.322, 0.49], [0.327, 0.55], [0.33, 0.62], [0.335, 0.66], [0.337, 0.7], [0.338, 0.74], [0.34, 0.78], [0.335, 0.82], [0.3, 1.0], [0.118, 1.0], [0.12, 0.84], [0.13, 0.77], [0.15, 0.735], [0.153, 0.7], [0.158, 0.665], [0.16, 0.56], [0.163, 0.49], [0.175, 0.465], [0.2, 0.448], [0.205, 0.43], [0.195, 0.405], [0.183, 0.38], [0.174, 0.345], [0.176, 0.31], [0.19, 0.28], [0.205, 0.265]],
	dev: [[0.385, 0.29], [0.405, 0.282], [0.43, 0.285], [0.455, 0.295], [0.47, 0.31], [0.48, 0.335], [0.488, 0.365], [0.486, 0.395], [0.478, 0.42], [0.472, 0.445], [0.49, 0.462], [0.515, 0.48], [0.527, 0.51], [0.531, 0.58], [0.532, 0.68], [0.528, 0.76], [0.515, 0.8], [0.507, 0.85], [0.505, 1.0], [0.44, 1.0], [0.44, 0.86], [0.35, 0.85], [0.345, 0.79], [0.34, 0.72], [0.338, 0.66], [0.343, 0.55], [0.35, 0.49], [0.368, 0.47], [0.378, 0.44], [0.373, 0.4], [0.372, 0.35], [0.376, 0.31]],
	kai: [[0.6, 0.295], [0.625, 0.282], [0.65, 0.29], [0.668, 0.31], [0.677, 0.34], [0.68, 0.37], [0.675, 0.4], [0.665, 0.43], [0.672, 0.46], [0.695, 0.48], [0.715, 0.5], [0.724, 0.53], [0.726, 0.6], [0.726, 0.7], [0.722, 0.79], [0.729, 0.83], [0.732, 0.9], [0.73, 1.0], [0.505, 1.0], [0.507, 0.87], [0.515, 0.83], [0.53, 0.79], [0.532, 0.7], [0.533, 0.57], [0.537, 0.52], [0.55, 0.495], [0.575, 0.48], [0.585, 0.46], [0.578, 0.43], [0.575, 0.395], [0.576, 0.36], [0.582, 0.325]],
	sam: [[0.8, 0.29], [0.84, 0.282], [0.875, 0.297], [0.895, 0.325], [0.908, 0.365], [0.918, 0.41], [0.928, 0.46], [0.93, 0.505], [0.938, 0.54], [0.947, 0.58], [0.95, 0.68], [0.952, 0.76], [0.94, 0.82], [0.942, 0.9], [0.946, 0.95], [0.95, 1.0], [0.79, 1.0], [0.79, 0.94], [0.77, 0.905], [0.735, 0.885], [0.73, 0.85], [0.727, 0.8], [0.727, 0.72], [0.728, 0.6], [0.735, 0.55], [0.742, 0.51], [0.762, 0.45], [0.775, 0.39], [0.787, 0.33]],
};

/** Their phones (dark backs to the camera; the screens face them and light their faces). */
export const P7_PHONES: Record<Friend, Poly> = {
	jess: [[0.155, 0.684], [0.19, 0.681], [0.2, 0.703], [0.163, 0.71]],
	dev: [[0.358, 0.694], [0.394, 0.699], [0.399, 0.717], [0.363, 0.723]],
	kai: [[0.588, 0.746], [0.628, 0.745], [0.631, 0.773], [0.592, 0.775]],
	sam: [[0.824, 0.675], [0.866, 0.679], [0.869, 0.716], [0.821, 0.712]],
};

/** Maya's hand, palm up with four silver rings, from the bottom-left corner (finger gaps notched in). */
export const P7_HAND: Poly = [[0.13, 1.0], [0.144, 0.975], [0.152, 0.955], [0.164, 0.882], [0.172, 0.839], [0.18, 0.803], [0.186, 0.776], [0.196, 0.755], [0.205, 0.73], [0.214, 0.706], [0.224, 0.697], [0.233, 0.705], [0.237, 0.735], [0.233, 0.765], [0.224, 0.79], [0.222, 0.825], [0.24, 0.828], [0.26, 0.818], [0.28, 0.806], [0.3, 0.792], [0.32, 0.772], [0.333, 0.758], [0.342, 0.762], [0.34, 0.779], [0.31, 0.822], [0.296, 0.845], [0.32, 0.822], [0.35, 0.786], [0.37, 0.768], [0.38, 0.771], [0.379, 0.786], [0.36, 0.81], [0.32, 0.861], [0.35, 0.83], [0.376, 0.804], [0.39, 0.803], [0.392, 0.818], [0.376, 0.846], [0.33, 0.893], [0.36, 0.876], [0.38, 0.864], [0.396, 0.874], [0.392, 0.893], [0.376, 0.918], [0.36, 0.943], [0.35, 0.972], [0.348, 1.0]];

/** Face centres (u, v) and the face width as a fraction of the photo width, for the punch-ins. */
export const P7_FACES: Record<Friend, {u: number; v: number; w: number}> = {
	jess: {u: 0.236, v: 0.365, w: 0.07},
	dev: {u: 0.425, v: 0.42, w: 0.065},
	kai: {u: 0.625, v: 0.425, w: 0.06},
	sam: {u: 0.842, v: 0.43, w: 0.06},
};

/**
 * Direction each warm stencil pull travels (u, v), away from Maya's hand: Jess sits right above it, so hers pulls
 * upward; the others pull outward to the right. Stored per person (not guessed from bounding boxes).
 */
export const P7_PULL: Record<Friend, [number, number]> = {
	jess: [0.25, -1],
	dev: [0.75, -0.66],
	kai: [1, -0.3],
	sam: [1, -0.2],
};

/** The table lamp's shade (centre and width): the anchor that registers P8 on P7 for the before/after cut. */
export const P7_LAMP = {u: 0.372, v: 0.347, w: 0.056};
/** Where the warm room wash starts: Maya's palm. */
export const P7_PALM = {u: 0.27, v: 0.88};

/* ------------------------------------------------------------------------------------------------------------ */
/* "They join her" (2:01.6), points read off P8-P12.                                                              */

/** P8's lamp shade (same lamp as P7, shot from further back): P8 prints 1.37x larger to register on P7. */
export const P8_LAMP = {u: 0.36, v: 0.462, w: 0.041};
/** P9: the gap between Jess's and Maya's open mouths, singing the same word (the macro's centre). */
export const P9_GAP = {u: 0.555, v: 0.385};
/** P11: Sam's face, the centre of her spin (the dot burst flies out from here). */
export const P11_SPIN = {u: 0.49, v: 0.33};
/** P12: Maya's upturned face in the ring (the macro's centre). */
export const P12_MAYA = {u: 0.627, v: 0.37};
