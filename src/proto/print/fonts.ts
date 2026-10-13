import {continueRender, delayRender} from 'remotion';

// The three print voices, loaded from local copies of the @fontsource files (prototype only; the real build
// would add @fontsource/anton, @fontsource/instrument-serif and @fontsource/ibm-plex-mono to package.json).
const FACES: [string, string, FontFaceDescriptors][] = [
	['Anton', new URL('./fonts/anton-latin-400-normal.woff2', import.meta.url).href, {weight: '400'}],
	['Instrument Serif', new URL('./fonts/instrument-serif-latin-400-italic.woff2', import.meta.url).href, {style: 'italic', weight: '400'}],
	['Instrument Serif', new URL('./fonts/instrument-serif-latin-400-normal.woff2', import.meta.url).href, {style: 'normal', weight: '400'}],
	['IBM Plex Mono', new URL('./fonts/ibm-plex-mono-latin-400-normal.woff2', import.meta.url).href, {weight: '400'}],
	['IBM Plex Mono', new URL('./fonts/ibm-plex-mono-latin-500-normal.woff2', import.meta.url).href, {weight: '500'}],
];

const handle = delayRender('Loading print fonts');
Promise.all(
	FACES.map(([family, url, desc]) =>
		new FontFace(family, `url(${url}) format('woff2')`, desc).load().then((face) => {
			(document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
		}),
	),
)
	.then(() => continueRender(handle))
	.catch((err) => {
		console.error(err);
		continueRender(handle);
	});
