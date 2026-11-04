import React, { memo, useEffect, useRef } from 'react';
import '../styles/diwali-overlay.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  flicker: boolean;
  tail: { x: number; y: number }[];
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  colors: string[];
  exploded: boolean;
  tail: { x: number; y: number }[];
}

interface ExplosionFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

// Festive cracker color palettes
const COLOR_PALETTES = [
  // 1. Radiant Gold & Amber
  ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC', '#FF8C00'],
  // 2. YouthSMM Fiery Crimson & Red
  ['#FF3030', '#FF4500', '#FF6347', '#FFD700', '#FFFFFF'],
  // 3. Electric Emerald & Lime
  ['#00FF7F', '#10B981', '#34D399', '#6EE7B7', '#FDE047'],
  // 4. Neon Magenta & Violet
  ['#FF1493', '#EC4899', '#A855F7', '#C084FC', '#FFFFFF'],
  // 5. Sky Blue & Cyan Electric
  ['#00F0FF', '#38BDF8', '#60A5FA', '#93C5FD', '#FFFFFF'],
  // 6. Multicolored Rainbow Celebration
  ['#FF3030', '#FFD700', '#00FF7F', '#00F0FF', '#FF1493', '#FFA500'],
];

/**
 * Animated Cracker / Fireworks Burst Overlay ("Patake Animated Fute")
 * High-performance, lightweight HTML5 Canvas particle engine.
 * Completely transparent background, pointer-events: none, zero disruption to clicks/forms.
 */
export const DiwaliOverlay: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    const flashes: ExplosionFlash[] = [];

    // Resize handling with screen width/height
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Launch a rocket that will explode into sparkling crackers
    const launchRocket = (startX?: number, targetHeight?: number) => {
      const sx = startX !== undefined ? startX : width * (0.15 + Math.random() * 0.7);
      // Explode between 12% and 45% of screen height
      const ty = targetHeight !== undefined ? targetHeight : height * (0.12 + Math.random() * 0.35);

      const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
      const mainColor = palette[0];

      // Calculate initial velocity based on distance
      const distanceY = height - ty;
      const vy = -Math.sqrt(2 * 0.14 * distanceY) * (0.95 + Math.random() * 0.1);
      // Gentle horizontal drift
      const vx = (Math.random() - 0.5) * 1.5;

      rockets.push({
        x: sx,
        y: height,
        targetY: ty,
        vx,
        vy,
        color: mainColor,
        colors: palette,
        exploded: false,
        tail: [],
      });
    };

    // Detonate rocket into cracking fireworks burst
    const explodeRocket = (r: Rocket) => {
      const particleCount = width < 640 ? 36 + Math.floor(Math.random() * 18) : 55 + Math.floor(Math.random() * 30);
      const baseSpeed = width < 640 ? 3.2 : 4.5;

      // Add a subtle brief flash ring at burst origin
      flashes.push({
        x: r.x,
        y: r.y,
        radius: 4,
        maxRadius: width < 640 ? 25 : 38,
        color: r.color,
        alpha: 0.85,
      });

      for (let i = 0; i < particleCount; i++) {
        // Spherical distribution with variation for realistic explosion
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.3 + Math.random() * 0.9) * baseSpeed;
        const color = r.colors[Math.floor(Math.random() * r.colors.length)];

        particles.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.016, // Life span
          size: 1.8 + Math.random() * 1.8,
          flicker: Math.random() > 0.4,
          tail: [],
        });
      }

      // Add 6-12 extra high-speed glittering sparks (sparkler/anar crackles)
      const glitterCount = 8 + Math.floor(Math.random() * 6);
      for (let j = 0; j < glitterCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (baseSpeed * 1.1) + Math.random() * (baseSpeed * 0.6);
        particles.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#FFFFFF',
          alpha: 1,
          decay: 0.025 + Math.random() * 0.02,
          size: 1.4,
          flicker: true,
          tail: [],
        });
      }
    };

    // Launch initial festive burst immediately on render
    launchRocket(width * 0.35, height * 0.28);
    setTimeout(() => {
      if (isRunning) launchRocket(width * 0.65, height * 0.24);
    }, 400);
    setTimeout(() => {
      if (isRunning) launchRocket(width * 0.5, height * 0.18);
    }, 850);

    // Continuous automatic fireworks interval
    let nextLaunchTime = Date.now() + 1400;
    let burstCounter = 0;

    const render = () => {
      if (!isRunning) return;

      // Clear with transparent frame so website stays 100% visible
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      if (now >= nextLaunchTime) {
        burstCounter++;
        // Standard single cracker launch
        launchRocket();

        // Every 3rd or 4th cycle, launch a synchronized double or triple burst!
        if (burstCounter % 3 === 0) {
          setTimeout(() => {
            if (isRunning) launchRocket();
          }, 250);
          if (Math.random() > 0.5) {
            setTimeout(() => {
              if (isRunning) launchRocket();
            }, 550);
          }
        }

        // Random delay between 900ms and 1800ms
        nextLaunchTime = now + (900 + Math.random() * 900);
      }

      // 1. UPDATE & DRAW FLASHES
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.radius += 2.5;
        f.alpha *= 0.88;

        if (f.alpha < 0.05 || f.radius >= f.maxRadius) {
          flashes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.alpha * 0.35;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.restore();
      }

      // 2. UPDATE & DRAW ROCKETS
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.tail.push({ x: r.x, y: r.y });
        if (r.tail.length > 5) r.tail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12; // Gravity slows rocket ascending

        // Check if rocket reached its apex or began falling
        if (r.y <= r.targetY || r.vy >= -0.5) {
          explodeRocket(r);
          rockets.splice(i, 1);
          continue;
        }

        // Draw ascending rocket sparks trail
        ctx.save();
        if (r.tail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(r.tail[0].x, r.tail[0].y);
          for (let k = 1; k < r.tail.length; k++) {
            ctx.lineTo(r.tail[k].x, r.tail[k].y);
          }
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
        }

        // Rocket head spark
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.restore();
      }

      // 3. UPDATE & DRAW BURST PARTICLES
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Store short trail for shimmering effect
        p.tail.push({ x: p.x, y: p.y });
        if (p.tail.length > 4) p.tail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.955; // Friction
        p.vy *= 0.955;
        p.vy += 0.055; // Gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
          particles.splice(i, 1);
          continue;
        }

        const currentAlpha = p.flicker
          ? Math.max(0.05, p.alpha * (0.6 + Math.random() * 0.4))
          : p.alpha;

        ctx.save();
        ctx.globalAlpha = currentAlpha;

        // Draw particle motion streak
        if (p.tail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.tail[0].x, p.tail[0].y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.8;
          ctx.stroke();
        }

        // Draw glowing particle point
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size > 2 ? 8 : 4;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause animation when user switches tabs to save battery/CPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fwk-overlay-root pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="fwk-canvas pointer-events-none" />
    </div>
  );
});

DiwaliOverlay.displayName = 'DiwaliOverlay';
export const FireworksOverlay = DiwaliOverlay;
