import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import {continueRender, delayRender} from 'remotion';

const handle = delayRender('Loading fonts');
Promise.all(
	['300 20px Inter', '400 20px Inter', '600 20px Inter', '700 20px Inter', '800 20px Inter', '700 20px "Space Grotesk"', '500 20px "Space Grotesk"'].map((s) =>
		document.fonts.load(s),
	),
)
	.then(() => continueRender(handle))
	.catch((err) => {
		console.error(err);
		continueRender(handle);
	});
