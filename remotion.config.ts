import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

// In the cloud container, use the Chromium that ships with it instead of downloading one; elsewhere Remotion fetches its own.
const CONTAINER_CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(CONTAINER_CHROME)) Config.setBrowserExecutable(CONTAINER_CHROME);
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
