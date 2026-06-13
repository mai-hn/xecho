'use client';

import { useEffect, useRef } from 'react';

type Ray = {
  angle: number;
  depth: number;
  speed: number;
  length: number;
  width: number;
  drift: number;
};

const RAY_COUNT = 260;

const createRay = (depth = Math.random()) => ({
  angle: Math.random() * Math.PI * 2,
  depth,
  speed: 0.0012 + Math.random() * 0.004,
  length: 12 + Math.random() * 58,
  width: 1 + Math.random() * 2.2,
  drift: (Math.random() - 0.5) * 0.0007,
});

export function ParticleRays() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rays = Array.from({ length: RAY_COUNT }, () => createRay());
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawRay = (ray: Ray) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(width, height) * 0.72;
      const easedDepth = ray.depth * ray.depth;
      const distance = 26 + easedDepth * radius;
      const x = centerX + Math.cos(ray.angle) * distance;
      const y = centerY + Math.sin(ray.angle) * distance;
      const visibleLength = ray.length * (0.45 + easedDepth * 0.95);
      const halfLength = visibleLength / 2;
      const endX = Math.cos(ray.angle) * halfLength;
      const endY = Math.sin(ray.angle) * halfLength;
      const opacity = Math.min(0.9, 0.18 + easedDepth * 0.65);

      context.save();
      context.lineCap = 'butt';
      context.shadowColor = `rgba(0, 0, 0, ${opacity * 0.22})`;
      context.shadowBlur = 2.8;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;

      context.strokeStyle = `rgba(8, 12, 18, ${opacity})`;
      context.lineWidth = ray.width;
      context.beginPath();
      context.moveTo(x - endX, y - endY);
      context.lineTo(x + endX, y + endY);
      context.stroke();

      context.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      context.lineWidth = Math.max(0.7, ray.width * 0.38);
      context.beginPath();
      context.moveTo(x - endX * 0.7, y - endY * 0.7);
      context.lineTo(x + endX * 0.7, y + endY * 0.7);
      context.stroke();
      context.restore();
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);

      for (const ray of rays) {
        ray.depth += ray.speed;
        ray.angle += ray.drift;

        if (ray.depth > 1.08) {
          Object.assign(ray, createRay(0.04 + Math.random() * 0.12));
        }

        drawRay(ray);
      }

      if (!reducedMotion.matches) {
        frame = window.requestAnimationFrame(render);
      }
    };

    resize();
    render();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
