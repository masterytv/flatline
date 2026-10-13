import '@fontsource/anton/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import {continueRender, delayRender} from 'remotion';

// The three print voices: Anton (wood-type caps), Instrument Serif (the human voice) and IBM Plex Mono (slugs, receipts).
const handle = delayRender('Loading print fonts');
Promise.all(
	['400 20px Anton', '400 20px "Instrument Serif"', 'italic 400 20px "Instrument Serif"', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"'].map((s) =>
		document.fonts.load(s),
	),
)
	.then(() => continueRender(handle))
	.catch((err) => {
		console.error(err);
		continueRender(handle);
	});
