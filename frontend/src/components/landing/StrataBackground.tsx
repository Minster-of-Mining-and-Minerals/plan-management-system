"use client";

import { useEffect, useRef } from "react";

/**
 * Landing-page background: layers of rock with a glowing gold vein and a
 * spark of light that travels along it. Purely decorative (aria-hidden).
 * Respects prefers-reduced-motion (draws one still frame).
 */

const BANDS = [
  "#34505f", "#3a5666", "#425d6b", "#4a636e", "#546a70",
  "#5f6f6d", "#6a7266", "#706f5d", "#6a6655", "#605d4d",
];
const LOOP_MS = 8000;

type Point = [number, number];

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function paintStrata(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, tilt: number) {
  const rand = rng(seed);
  const edges: ((x: number) => number)[] = [];
  for (let i = 0; i <= BANDS.length; i++) {
    const base = (h * i) / BANDS.length;
    const a1 = rand() * 24 + 8, f1 = rand() * 2 + 1, p1 = rand() * 6, a2 = rand() * 9, f2 = rand() * 6 + 3;
    edges.push(
      (x) =>
        base +
        Math.sin((x / w) * Math.PI * f1 + p1) * a1 +
        Math.sin((x / w) * Math.PI * f2) * a2 +
        (x / w - 0.5) * tilt
    );
  }
  for (let i = 0; i < BANDS.length; i++) {
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 8) ctx.lineTo(x, edges[i](x));
    for (let x = w + 10; x >= -10; x -= 8) ctx.lineTo(x, edges[i + 1](x));
    ctx.closePath();
    ctx.fillStyle = BANDS[i];
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // mineral grains
    for (let k = 0; k < 70; k++) {
      const x = rand() * w;
      const y0 = edges[i](x), y1 = edges[i + 1](x);
      ctx.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.06})`;
      ctx.fillRect(x, y0 + rand() * (y1 - y0), 1.5, 1.5);
    }
  }
}

function veinPath(seed: number, a: Point, b: Point, steps: number, amp: number): Point[] {
  const rand = rng(seed);
  const nx = -(b[1] - a[1]), ny = b[0] - a[0];
  const nl = Math.hypot(nx, ny) || 1;
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const j = (rand() - 0.5) * 2 * amp * Math.sin(Math.PI * t);
    pts.push([a[0] + (b[0] - a[0]) * t + (nx / nl) * j, a[1] + (b[1] - a[1]) * t + (ny / nl) * j]);
  }
  return pts;
}

function strokeVein(ctx: CanvasRenderingContext2D, pts: Point[], width: number) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.shadowColor = "rgba(240,197,68,0.8)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "#efc23f";
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,246,214,0.9)";
  ctx.lineWidth = width * 0.35;
  ctx.stroke();
  ctx.restore();
}

function pointOn(pts: Point[], t: number): Point {
  const n = pts.length - 1;
  const pos = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(Math.floor(pos), n - 1);
  const f = pos - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
}

function glint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(255,246,214,0.95)");
  g.addColorStop(0.25, "rgba(240,197,68,0.42)");
  g.addColorStop(1, "rgba(240,197,68,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export default function StrataBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let off: HTMLCanvasElement | null = null;
    let veins: { pts: Point[]; width: number }[] = [];
    let dpr = 1;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const octx = off.getContext("2d");
      if (octx) {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintStrata(octx, w, h, 5, -30);
      }
      veins = [
        { pts: veinPath(41, [w * 0.55, h + 10], [w * 0.98, -10], 28, 40), width: 2.4 },
        { pts: veinPath(53, [w + 10, h * 0.82], [w * 0.8, h * 0.5], 12, 16), width: 1.2 },
      ];
    };

    const draw = (t: number) => {
      if (!off) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      veins.forEach((v) => strokeVein(ctx, v.pts, v.width));
      const [x, y] = pointOn(veins[0].pts, t);
      glint(ctx, x, y, 44);
    };

    const loop = (now: number) => {
      if (visible) draw(((now - start) / LOOP_MS) % 1);
      raf = requestAnimationFrame(loop);
    };

    setup();
    draw(0.4);
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      setup();
      draw(0.4);
    });
    ro.observe(canvas);

    // Pause the animation while the hero is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
