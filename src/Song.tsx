import React from 'react';
import {Audio, getStaticFiles, staticFile} from 'remotion';

/** The song, when public/Flatline.mp3 is present (it is git-ignored); silent otherwise. */
export const Song: React.FC = () => (getStaticFiles().some((f) => f.name === 'Flatline.mp3') ? <Audio src={staticFile('Flatline.mp3')} /> : null);
