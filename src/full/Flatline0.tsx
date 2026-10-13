import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../opening/cues';
import {Debug, ScreenOpening} from '../opening/ScreenOpening';
import {C} from '../theme';
import {FPS, bt} from '../timing';
import {Grain} from '../ui/Worlds';
import {ramp} from '../util';
import {F} from './cues';
import {Confetti, Cut, Flash, FlatlineSlam, Kinetic, LightLeak, PhotoTrack, Shot, Strobe, Vignette, Word, cutsEvery} from './kit';
import {ChargerPhone, EndCard, NoWords, PhoneFlip, PhonesDown, ScreenTimeCard, Stopwatch} from './moments';

export type FullProps = {debug: boolean};

// ---------------------------------------------------------------- photo runs

const CROWD = ['R5', 'R4', 'R8', 'R9', 'R14', 'R3'];
const DUMP1: Cut[] = cutsEvery(['R5', 'R4', 'R8', 'R9', 'R4', 'R5'], F.dump1, F.heart, 2, 0);
const HEART: Cut[] = [
	{at: F.heart, id: 'R14', from: {scale: 1.04}, to: {scale: 1.12}, hold: 4},
	{at: F.started, id: 'R3', from: {scale: 1.18, y: 2}, to: {scale: 1.08, y: -1}},
	...cutsEvery(['R14', 'R9', 'R3', 'R4', 'R14', 'R5'], bt(55), F.flatline3, 4, 1),
];
const JOIN: Cut[] = cutsEvery(['R4', 'R14', 'R5', 'R8'], F.join, F.groove, 2, 2);
const TOGETHER: Cut[] = cutsEvery(['R4', 'R5', 'R14', 'R8', 'R3', 'R9'], F.together, F.beep1, 1, 3);
const DUMP3: Cut[] = cutsEvery(['R4', 'R5', 'R8', 'R14', 'R9', 'R3', 'R7'], F.dump3, F.type2, 2, 4);
const FINAL: Cut[] = cutsEvery([...CROWD, 'R7', 'R6', 'R12'], F.final, F.still, 1, 5);
const SLOW: Cut[] = [
	{at: F.slow, id: 'R4', from: {scale: 1.06}, to: {scale: 1.14}, hold: 4},
	{at: F.dawn, id: 'R10', from: {scale: 1.16, y: 2}, to: {scale: 1.04, y: 0}, hold: 5},
	{at: F.screenTime, id: 'R11', from: {scale: 1.04}, to: {scale: 1.14}, hold: 4},
	{at: F.stillDancing, id: 'R14', from: {scale: 1.1}, to: {scale: 1.02}, hold: 4},
];

// ---------------------------------------------------------------- lyrics as type

const WORDS: Word[] = [
	// 1:36 "My heart stopped... and I started dancing"
	{text: 'MY HEART', at: F.heart, until: F.started, size: 0.13, x: 6, y: 30, align: 'left'},
	{text: 'STOPPED', at: F.stopped, until: F.started, size: 0.13, x: 6, y: 50, align: 'left', color: C.pulse},
	{text: 'AND I STARTED', at: F.started, until: bt(55), size: 0.075, x: 50, y: 28},
	{text: 'DANCING', at: F.dancing, until: bt(57), size: 0.2, x: 50, y: 55, bounce: true},
	// 2:52 and 3:00, second and third time round
	{text: 'my heart stopped...', at: F.type2 + 0.9, until: bt(95), size: 0.07, x: 50, y: 78, enter: 'rise', weight: 500},
	{text: 'and I started dancing', at: bt(95), until: F.type3, size: 0.07, x: 50, y: 78, enter: 'rise', weight: 500},
	{text: 'MY HEART STOPPED', at: F.type3 + 0.9, until: bt(99), size: 0.1, x: 50, y: 30},
	{text: 'AND I STARTED', at: bt(99), until: F.final, size: 0.08, x: 50, y: 30},
	{text: 'DANCING', at: bt(100), until: F.final, size: 0.22, x: 50, y: 58, bounce: true},
	// 2:23 / 2:27
	{text: "I'M COMING\nBACK", at: F.beep1 + 1.4, until: F.beep2, size: 0.06, x: 6, y: 50, align: 'left', enter: 'rise', vy: 8},
	{text: "I'M COMING\nBACK", at: F.beep2 + 1.4, until: F.flood, size: 0.06, x: 94, y: 50, align: 'right', enter: 'rise', vy: 8},
	// 2:33
	{text: 'to feel everything', at: F.alive + 0.4, until: F.kickOut3 + 1.5, size: 0.065, x: 50, y: 82, enter: 'rise', weight: 500},
	// 3:14 / 3:16.5 / 3:29
	{text: 'STILL', at: F.still, until: F.dancing2, size: 0.24, x: 50, y: 50},
	{text: 'DANCING', at: F.dancing2, until: F.slow, size: 0.22, x: 50, y: 50, bounce: true},
	{text: 'still dancing', at: F.stillDancing, until: F.songEnd, size: 0.08, x: 50, y: 50, enter: 'fade', weight: 500},
];

// ---------------------------------------------------------------- the second half

const AfterDrop: React.FC<{t: number}> = ({t}) => {
	let base: React.ReactNode = null;
	let leak = 0.6;
	let grade: string | undefined;

	if (t < F.heart) {
		base = <PhotoTrack t={t} cuts={DUMP1} end={F.heart} flash={0.5} />;
	} else if (t < F.flatline3) {
		// "stopped": the photo freezes and drains for a beat, then life comes back
		const drained = t >= F.stopped && t < F.started ? 1 : 0;
		grade = drained ? 'grayscale(1) brightness(0.7)' : undefined;
		base = <PhotoTrack t={t} cuts={HEART} end={F.flatline3} frozen={drained ? F.stopped : undefined} grade={grade} />;
	} else if (t < F.couch) {
		base = <PhotoTrack t={t} cuts={[{at: F.flatline3, id: 'R8', from: {scale: 1.2}, to: {scale: 1.08}}]} end={F.couch} />;
	} else if (t < F.join) {
		base = <PhonesDown t={t} end={F.join} />;
		leak = 0.2;
	} else if (t < F.groove) {
		base = <PhotoTrack t={t} cuts={JOIN} end={F.groove} flash={0.35} />;
	} else if (t < F.light) {
		base = <Shot t={t} id="R4" start={F.groove} end={F.light} from={{scale: 1.1}} to={{scale: 1.22}} style={{filter: 'brightness(0.55) saturate(0.9)'}} />;
	} else if (t < F.fourMin) {
		// "Just light, so bright": a white flood that clears onto her laughing
		base = <Shot t={t} id="R7" start={F.light} end={F.fourMin + 1} from={{scale: 1.55, x: 4, y: 2}} to={{scale: 1.4, x: 3, y: 1}} style={{filter: `brightness(${1.25 - 0.25 * ramp(t, F.light, F.light + 2)})`}} />;
	} else if (t < F.together) {
		base = <Shot t={t} id="R5" start={F.fourMin} end={F.together} from={{scale: 1.15}} to={{scale: 1.05}} style={{filter: 'blur(10px) brightness(0.5)'}} />;
	} else if (t < F.beep1 - 0.7) {
		base = <PhotoTrack t={t} cuts={TOGETHER} end={F.beep1 - 0.7} flash={0.3} />;
	} else if (t < F.alive) {
		base = <ChargerPhone t={t} />;
		leak = 0;
	} else if (t < F.drop3) {
		base = <Shot t={t} id="R13" start={F.alive} end={F.drop3} from={{scale: 1.05}} to={{scale: 1.22, y: 3}} />;
		leak = 0.9;
	} else if (t < F.table) {
		base = <PhoneFlip t={t} />;
		leak = 0;
	} else if (t < F.dump3) {
		base = <Shot t={t} id="R6" start={F.table} end={F.dump3 + 2} from={{scale: 1.2}} to={{scale: 1.08}} punch={0.05} />;
	} else if (t < F.type2) {
		base = <PhotoTrack t={t} cuts={DUMP3} end={F.type2} flash={0.45} />;
	} else if (t < F.type3) {
		// slow push into her face, lit by real light
		base = <Shot t={t} id="R12" start={F.type2} end={F.type3} from={{scale: 1.02}} to={{scale: 1.28, x: 2, y: 4}} />;
		leak = 1;
	} else if (t < F.final) {
		// arms rise through the swell
		const swell = ramp(t, F.swell, F.final);
		base = <Shot t={t} id="R8" start={F.type3} end={F.final} from={{scale: 1.08, y: -4}} to={{scale: 1.3, y: 5}} style={{filter: `brightness(${1 + 0.5 * swell})`}} />;
		leak = 0.6 + swell;
	} else if (t < F.still) {
		base = <PhotoTrack t={t} cuts={FINAL} end={F.still} flash={0.55} />;
	} else if (t < F.dancing2) {
		// "Still": everything stops mid-air
		base = <Shot t={F.still} id="R9" start={F.still} end={F.still + 1} from={{scale: 1.12}} to={{scale: 1.12}} style={{filter: 'saturate(0.35) contrast(1.1)'}} />;
		leak = 0;
	} else if (t < F.slow) {
		base = <Shot t={t} id="R7" start={F.dancing2} end={F.slow + 1} from={{scale: 1.3}} to={{scale: 1.08}} punch={0.25} />;
	} else if (t < F.songEnd) {
		base = <PhotoTrack t={t} cuts={SLOW} end={F.songEnd} />;
		leak = 0.5;
	} else {
		return <EndCard t={t} />;
	}

	const fadeOut = ramp(t, F.songEnd - 2.5, F.songEnd);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{opacity: 1 - fadeOut}}>
				{base}
				{leak > 0 ? <LightLeak t={t} amount={leak} /> : null}
				<Vignette amount={0.45} />
				<Grain opacity={0.08} />
			</AbsoluteFill>

			{/* moments laid over the photos */}
			{t >= F.noWords[0] && t < F.light + 0.6 ? <NoWords t={t} /> : null}
			{t >= F.light && t < F.light + 2 ? <AbsoluteFill style={{background: '#fff', opacity: ramp(t, F.light, F.light + 0.25) * (1 - ramp(t, F.light + 0.3, F.light + 1.8))}} /> : null}
			{t >= F.fourMin && t < F.together ? <Stopwatch t={t} /> : null}
			<ScreenTimeCard t={t} at={F.screenTime + 0.3} until={F.stillDancing} />

			<FlatlineSlam t={t} at={F.flatline2} until={F.heart} size={0.15} />
			<Strobe t={t} start={F.flatline2} end={F.heart} strength={0.6} />
			<FlatlineSlam t={t} at={F.flatline3} until={F.couch} />
			<Strobe t={t} start={F.flatline3} end={F.couch} strength={0.5} />
			<FlatlineSlam t={t} at={F.type2} until={F.type2 + 1.6} size={0.12} />
			<FlatlineSlam t={t} at={F.type3} until={F.type3 + 1.6} size={0.14} />
			<Kinetic t={t} words={WORDS} />

			<Flash t={t} at={F.drop3} decay={0.12} />
			<Flash t={t} at={F.final} decay={0.2} />
			<Flash t={t} at={F.still} decay={0.1} />
			<Flash t={t} at={F.dancing2} decay={0.35} color={C.text} />
			<Confetti t={t} at={F.dancing2} />
		</AbsoluteFill>
	);
};

export const Flatline0: React.FC<FullProps> = ({debug}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const {width} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{t < T.end ? <ScreenOpening debug={false} /> : <AfterDrop t={t} />}
			{debug && width ? <Debug t={Math.min(t, F.songEnd - 0.01)} /> : null}
		</AbsoluteFill>
	);
};
