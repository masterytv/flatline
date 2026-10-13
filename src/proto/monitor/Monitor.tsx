import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {FPS, lastBeatIndex, BEATS} from '../../timing';
import {K, MGrain, usePreload} from './engine';

const PLATES = ['R14_ht.png', 'R14_matte.png', 'R12_ht.png', 'R9_ht.png', 'R10_poster.png'].map((n) => `stills/fx/monitor/${n}`);
import {SceneDancing} from './SceneDancing';
import {SceneDawn, SceneEnd} from './SceneDawn';
import {SceneEyelid} from './SceneEyelid';
import {SceneLanes} from './SceneLanes';
import {SceneR14} from './SceneR14';
import {SceneScope, SceneStill} from './SceneScope';
import {SceneFlatline, SceneHeart, SceneScript, SceneString} from './ScenesEarly';
import {SceneArms, SceneBraid, SceneForever, SceneLight, SceneMandala, SceneNoWords, ScenePhone} from './ScenesMid';

type Scene = {from: number; C: React.FC<{t: number}>};

// The MONITOR timeline: from the opening's hand-over (T.end) to the end card.
const SCENES: Scene[] = [
	{from: T.end, C: SceneString},
	{from: F.flatline2, C: SceneFlatline},
	{from: F.heart, C: SceneHeart},
	{from: F.dancing, C: SceneScript},
	{from: 103.224, C: SceneR14},
	{from: F.flatline3, C: SceneLanes},
	{from: F.join, C: SceneBraid},
	{from: F.groove, C: SceneNoWords},
	{from: F.light, C: SceneLight},
	{from: F.forever, C: SceneForever},
	{from: F.beep1, C: ScenePhone},
	{from: F.drop3, C: SceneMandala},
	{from: F.type2, C: SceneEyelid},
	{from: F.type3, C: SceneArms},
	{from: F.final, C: SceneScope},
	{from: F.still, C: SceneStill},
	{from: F.dancing2, C: SceneDancing},
	{from: F.dawn, C: SceneDawn},
	{from: F.songEnd, C: SceneEnd},
];

export const Monitor: React.FC<{debug?: boolean}> = ({debug}) => {
	const frame = useCurrentFrame();
	usePreload(PLATES);
	const t = frame / FPS;
	let idx = -1;
	for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].from) idx = i;
	const S = idx >= 0 && t >= T.end ? SCENES[idx].C : null;
	const b = BEATS[Math.max(0, lastBeatIndex(t))];
	return (
		<AbsoluteFill style={{background: K.ground}}>
			{S ? <S t={t} /> : null}
			<MGrain opacity={0.06} seed={t >= F.still && t < F.dancing2 ? 7 : undefined} />
			{debug ? (
				<div style={{position: 'absolute', right: 16, top: 12, fontFamily: 'monospace', fontSize: 18, color: 'rgba(255,255,255,0.45)'}}>
					{t.toFixed(2)}s · bar {b.bar}.{b.beat}
				</div>
			) : null}
		</AbsoluteFill>
	);
};
