import React from 'react';
import script from './data/script.json';
import {Glow, pathOf} from './engine';

type Word = {aspect: number; strokes: number[][][]; baseline: number};
const WORDS = script as unknown as Record<string, Word>;

const lenOf = (pts: number[][]) => {
	let L = 0;
	for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
	return L;
};

/**
 * The line writes a word in single-stroke script (Hershey "cursive"), as one continuous gesture: k = 0..1 of the
 * total pen travel. Optional lead-in/lead-out joins it to a trace at y = `joinY`.
 */
export const ScriptWord: React.FC<{
	word: 'dancing' | 'still dancing';
	k: number;
	x: number;
	y: number;
	width: number;
	color: string;
	coreColor?: string;
	core?: number;
	glow?: number;
	head?: boolean;
	transform?: string;
	opacity?: number;
}> = ({word, k, x, y, width, color, coreColor, core = 3, glow = 1, head = true, transform, opacity = 1}) => {
	const w = WORDS[word];
	const strokes = w.strokes.map((s) => s.map(([u, v]) => [x + u * width, y + v * width] as [number, number]));
	const lens = strokes.map(lenOf);
	const total = lens.reduce((a, b) => a + b, 0);
	let left = total * Math.max(0, Math.min(1, k));
	const parts: [number, number][][] = [];
	let tip: [number, number] | null = null;
	for (let i = 0; i < strokes.length && left > 0; i++) {
		const s = strokes[i];
		if (left >= lens[i]) {
			parts.push(s);
			left -= lens[i];
			tip = s[s.length - 1];
			continue;
		}
		const part: [number, number][] = [s[0]];
		let acc = 0;
		for (let j = 1; j < s.length; j++) {
			const d = Math.hypot(s[j][0] - s[j - 1][0], s[j][1] - s[j - 1][1]);
			if (acc + d >= left) {
				const f = (left - acc) / d;
				const p: [number, number] = [s[j - 1][0] + (s[j][0] - s[j - 1][0]) * f, s[j - 1][1] + (s[j][1] - s[j - 1][1]) * f];
				part.push(p);
				tip = p;
				break;
			}
			acc += d;
			part.push(s[j]);
		}
		parts.push(part);
		left = 0;
	}
	const d = parts.map((p) => pathOf(p)).join('');
	return (
		<g transform={transform} opacity={opacity}>
			{d ? <Glow d={d} color={color} coreColor={coreColor} core={core} glow={glow} /> : null}
			{head && tip && k < 1 ? (
				<>
					<circle cx={tip[0]} cy={tip[1]} r={core * 6} fill={color} opacity={0.6} filter="url(#mb12)" />
					<circle cx={tip[0]} cy={tip[1]} r={core * 1.4} fill="#fff" />
				</>
			) : null}
		</g>
	);
};

export const wordHeight = (word: 'dancing' | 'still dancing', width: number) => WORDS[word].aspect * width;
