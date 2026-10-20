// Render selected frames of a composition to PNGs (bundles once).
// Usage: node scripts/frames.mjs <CompositionId> <outDir> <scale> <seconds...>
// Set FRAMES_ENTRY to render from another entry file (default src/index.ts), e.g. a prototype's own index.ts.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [id, outDir, scale, ...secs] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve(process.env.FRAMES_ENTRY ?? 'src/index.ts')});
const composition = await selectComposition({serveUrl, id, inputProps: {debug: process.env.FRAMES_DEBUG !== "0"}, browserExecutable});
for (const s of secs) {
	const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * 30));
	await renderStill({composition, serveUrl, frame, output: path.join(outDir, `f_${String(frame).padStart(5, '0')}.png`), scale: Number(scale), inputProps: {debug: process.env.FRAMES_DEBUG !== "0"}, browserExecutable});
	process.stdout.write(`${s} `);
}
console.log();
// Each bundle is about 600 MB in /tmp; remove it so repeated checks don't fill the disk.
fs.rmSync(serveUrl, {recursive: true, force: true});
