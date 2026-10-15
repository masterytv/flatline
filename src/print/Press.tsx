import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {PAPER_URL} from './density';
import {INK} from './ink';
import {CAM0, Cam, drawSheet, Sheet, sheetMatrix} from './press';
import {useStage} from './stage';

/** A full-frame canvas that prints sheets through the camera (crisp at any zoom). Multiplies onto what is below. */
export const Press: React.FC<{sheets: Sheet[]; cam?: Cam; style?: React.CSSProperties; blend?: boolean; draw?: (ctx: CanvasRenderingContext2D, W: number, H: number) => void}> = ({
	sheets,
	cam = CAM0,
	style,
	blend = true,
	draw,
}) => {
	// the stage size; in the 9:16 cut the reframing camera may zoom in, so the canvas draws at `res` times the stage
	const {w: width, h: height, res} = useStage();
	const W = Math.round(width * res);
	const H = Math.round(height * res);
	const ref = useRef<HTMLCanvasElement>(null);
	useLayoutEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.clearRect(0, 0, W, H);
		for (const s of sheets) drawSheet(ctx, s, sheetMatrix(s, cam, width, height, res), W, H);
		if (draw) {
			// draw callbacks work in stage px: scale every transform they set by res
			const set = ctx.setTransform.bind(ctx) as (a: number, b: number, c: number, d: number, e: number, f: number) => void;
			const scaled = (a: number, b: number, c: number, d: number, e: number, f: number) => set(a * res, b * res, c * res, d * res, e * res, f * res);
			(ctx as unknown as {setTransform: typeof scaled}).setTransform = scaled;
			try {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				draw(ctx, width, height);
			} finally {
				(ctx as unknown as {setTransform: typeof scaled}).setTransform = set;
			}
		}
	});
	return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width, height, mixBlendMode: blend ? 'multiply' : 'normal', ...style}} />;
};

/** One sheet printed in its own paper space (for elements that take CSS 3D transforms: doors, page turns, pop-ups). */
export const SheetCanvas: React.FC<{sheet: Omit<Sheet, 'cx' | 'cy'>; res?: number; style?: React.CSSProperties; blend?: boolean}> = ({sheet, res = 1, style, blend = true}) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const W = Math.round(sheet.w * res);
	const H = Math.round(sheet.h * res);
	useLayoutEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.clearRect(0, 0, W, H);
		const full: Sheet = {...sheet, cx: sheet.w / 2, cy: sheet.h / 2, s: 1, rot: 0};
		drawSheet(ctx, full, [res, 0, 0, res, 0, 0], W, H);
	});
	return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width: sheet.w, height: sheet.h, mixBlendMode: blend ? 'multiply' : 'normal', ...style}} />;
};

/** DOM layer in world coordinates, seen through the same camera as the press. */
export const CamLayer: React.FC<{cam?: Cam; children: React.ReactNode; style?: React.CSSProperties}> = ({cam = CAM0, children, style}) => {
	const {w: width, h: height} = useStage();
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width,
				height,
				transformOrigin: '0 0',
				transform: `translate(${width / 2}px, ${height / 2}px) rotate(${cam.rot ?? 0}deg) scale(${cam.s}) translate(${-cam.cx}px, ${-cam.cy}px)`,
				...style,
			}}
		>
			{children}
		</div>
	);
};

/** DOM positioned on a sheet: children use paper px. */
export const OnSheet: React.FC<{sheet: Pick<Sheet, 'w' | 'h' | 'cx' | 'cy' | 's' | 'rot'>; children: React.ReactNode; style?: React.CSSProperties}> = ({sheet, children, style}) => (
	<div
		style={{
			position: 'absolute',
			left: sheet.cx - sheet.w / 2,
			top: sheet.cy - sheet.h / 2,
			width: sheet.w,
			height: sheet.h,
			transform: `rotate(${sheet.rot ?? 0}deg) scale(${sheet.s ?? 1})`,
			...style,
		}}
	>
		{children}
	</div>
);

/** Newsprint: the ground of every frame. Lives in world space so it moves with the rostrum. */
export const Paper: React.FC<{x?: number; y?: number; w?: number; h?: number; style?: React.CSSProperties; tint?: string}> = ({x = -1200, y = -800, w = 4320, h = 2680, style, tint}) => (
	<div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: tint ?? INK.paper, overflow: 'hidden', ...style}}>
		<div
			style={{
				position: 'absolute',
				inset: 0,
				backgroundImage: `url(${PAPER_URL})`,
				backgroundSize: '2048px 1152px',
				backgroundRepeat: 'repeat',
				mixBlendMode: 'multiply',
				opacity: tint ? 0.9 : 1,
				filter: tint ? 'grayscale(1) brightness(1.08) contrast(1.1)' : undefined,
			}}
		/>
	</div>
);

/** The full frame as bare paper (no camera). */
export const PaperFill: React.FC<{tint?: string}> = ({tint}) => (
	<AbsoluteFill style={{background: tint ?? INK.paper}}>
		<Img src={PAPER_URL} style={{width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', filter: tint ? 'grayscale(1) brightness(1.08)' : undefined}} />
	</AbsoluteFill>
);
