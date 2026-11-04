import React, { memo, useEffect, useRef } from 'react';
import '../styles/diwali-overlay.css';

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  spikes: number; // 4 (diamond star sparkle ✦) or 5 (festive star ★)
  isMajorStar: boolean;
  twinklePhase: number;
  twinkleSpeed: number;
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

// Radiant festive star color palettes (Sitare)
const STAR_PALETTES = [
  // 1. Royal Golden Stars (सुनहरे सितारे)
  ['#FFD700', '#FFE066', '#FFA500', '#FFF8DC', '#FFC107', '#FFFFFF'],
  // 2. YouthSMM Ruby Red & Crimson Stars (लाल व सिंदूरी सितारे)
  ['#FF3030', '#FF4500', '#FF1493', '#FF6347', '#FFD700', '#FFFFFF'],
  // 3. Emerald & Lime Green Stars (हरे व पन्ना सितारे)
  ['#00FF7F', '#10B981', '#34D399', '#6EE7B7', '#FDE047', '#FFFFFF'],
  // 4. Electric Sky Cyan & Sapphire Stars (नीले व आसमानी सितारे)
  ['#00F0FF', '#38BDF8', '#60A5FA', '#93C5FD', '#FFFFFF'],
  // 5. Magenta, Rose & Amethyst Stars (गुलाबी व बैंगनी सितारे)
  ['#FF1493', '#F43F5E', '#EC4899', '#C084FC', '#A855F7', '#FFFFFF'],
  // 6. Multicolored Rainbow Celebration Stars (सतरंगी सितारे)
  ['#FFD700', '#FF3030', '#00FF7F', '#00F0FF', '#FF1493', '#FFA500', '#FFFFFF'],
];

/**
 * Draw a glowing multi-pointed star ("Sitara") on canvas
 */
function drawSparkleStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  rotation: number,
  color: string,
  alpha: number,
  isMajorStar: boolean
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // 1. Radiant 4-way beam flare for glistening diamond effect on major stars
  if (isMajorStar && outerRadius > 2.5) {
    const flareLen = outerRadius * 2.2;
    const flareWidth = Math.max(0.7, outerRadius * 0.25);

    // Horizontal ray
    const hGrad = ctx.createLinearGradient(cx - flareLen, cy, cx + flareLen, cy);
    hGrad.addColorStop(0, 'transparent');
    hGrad.addColorStop(0.5, '#FFFFFF');
    hGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hGrad;
    ctx.fillRect(cx - flareLen, cy - flareWidth / 2, flareLen * 2, flareWidth);

    // Vertical ray
    const vGrad = ctx.createLinearGradient(cx, cy - flareLen, cx, cy + flareLen);
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(0.5, '#FFFFFF');
    vGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = vGrad;
    ctx.fillRect(cx - flareWidth / 2, cy - flareLen, flareWidth, flareLen * 2);
  }

  // 2. Star Polygon Path
  let rot = (Math.PI / 2) * 3 + rotation;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = outerRadius > 3 ? 12 : 6;
  ctx.fill();

  // 3. Ultra-bright white diamond core for realistic star sparkle
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.6, innerRadius * 0.7), 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 4;
  ctx.fill();

  ctx.restore();
}

/**
 * Animated "Sitre Wale Patake" (Star-Burst Fireworks & Crackers) Overlay
 * High-performance, lightweight Canvas particle engine.
 * Renders glowing 4-point & 5-point sparkling stars that explode and cascade across the screen.
 * Strictly non-intrusive, pointer-events: none, transparent background.
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
    const stars: StarParticle[] = [];
    const flashes: ExplosionFlash[] = [];

    // Resize handling
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Launch a rocket that carries "sitare" to the sky
    const launchRocket = (startX?: number, targetHeight?: number) => {
      const sx = startX !== undefined ? startX : width * (0.15 + Math.random() * 0.7);
      const ty = targetHeight !== undefined ? targetHeight : height * (0.12 + Math.random() * 0.35);

      const palette = STAR_PALETTES[Math.floor(Math.random() * STAR_PALETTES.length)];
      const mainColor = palette[0];

      const distanceY = height - ty;
      const vy = -Math.sqrt(2 * 0.14 * distanceY) * (0.95 + Math.random() * 0.1);
      const vx = (Math.random() - 0.5) * 1.6;

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

    // Detonate rocket into hundreds of brilliant twinkling stars ("Sitare")
    const explodeRocket = (r: Rocket) => {
      const starCount = width < 640 ? 40 + Math.floor(Math.random() * 20) : 65 + Math.floor(Math.random() * 35);
      const baseSpeed = width < 640 ? 3.4 : 4.8;

      // Expansion flash wave
      flashes.push({
        x: r.x,
        y: r.y,
        radius: 4,
        maxRadius: width < 640 ? 28 : 42,
        color: r.color,
        alpha: 0.9,
      });

      // 1. PRIMARY SPARKLING STARS (मुख्य सितारे)
      for (let i = 0; i < starCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.25 + Math.random() * 0.95) * baseSpeed;
        const color = r.colors[Math.floor(Math.random() * r.colors.length)];
        const spikes = Math.random() > 0.4 ? 4 : 5; // 4-pointed diamond star or 5-pointed star
        const isMajor = Math.random() > 0.65;
        const starSize = isMajor ? 3.2 + Math.random() * 2.8 : 2.0 + Math.random() * 1.8;

        stars.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: 0.010 + Math.random() * 0.014, // Life duration
          size: starSize,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          spikes,
          isMajorStar: isMajor,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.18 + Math.random() * 0.22,
          tail: [],
        });
      }

      // 2. SPARKLING GOLDEN STARDUST (छोटे चमकते सितारे / ज़री)
      const stardustCount = width < 640 ? 12 : 22;
      for (let j = 0; j < stardustCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (baseSpeed * 1.05) + Math.random() * (baseSpeed * 0.7);

        stars.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.5 ? '#FFD700' : '#FFFFFF',
          alpha: 1,
          decay: 0.022 + Math.random() * 0.02,
          size: 1.6,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.15,
          spikes: 4,
          isMajorStar: false,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.35,
          tail: [],
        });
      }
    };

    // Initial festive star bursts on render
    launchRocket(width * 0.35, height * 0.26);
    setTimeout(() => {
      if (isRunning) launchRocket(width * 0.68, height * 0.22);
    }, 380);
    setTimeout(() => {
      if (isRunning) launchRocket(width * 0.52, height * 0.18);
    }, 800);

    // Continuous automatic fireworks interval
    let nextLaunchTime = Date.now() + 1200;
    let burstCounter = 0;

    const render = () => {
      if (!isRunning) return;

      // Clear transparent frame for clean website underneath
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      if (now >= nextLaunchTime) {
        burstCounter++;
        launchRocket();

        // Every 3rd burst, launch a double/triple star shower burst!
        if (burstCounter % 3 === 0) {
          setTimeout(() => {
            if (isRunning) launchRocket();
          }, 260);
          if (Math.random() > 0.45) {
            setTimeout(() => {
              if (isRunning) launchRocket();
            }, 560);
          }
        }

        // Interval between 850ms and 1750ms
        nextLaunchTime = now + (850 + Math.random() * 900);
      }

      // 1. UPDATE & DRAW FLASH HALO RINGS
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.radius += 2.8;
        f.alpha *= 0.86;

        if (f.alpha < 0.04 || f.radius >= f.maxRadius) {
          flashes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.alpha * 0.38;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();
      }

      // 2. UPDATE & DRAW ASCENDING ROCKETS WITH MINI STAR SPARKLES
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.tail.push({ x: r.x, y: r.y });
        if (r.tail.length > 5) r.tail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12;

        if (r.y <= r.targetY || r.vy >= -0.5) {
          explodeRocket(r);
          rockets.splice(i, 1);
          continue;
        }

        // Draw ascending stardust spark trail
        ctx.save();
        if (r.tail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(r.tail[0].x, r.tail[0].y);
          for (let k = 1; k < r.tail.length; k++) {
            ctx.lineTo(r.tail[k].x, r.tail[k].y);
          }
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = 0.65;
          ctx.stroke();
        }

        // Rocket tip sparkling star
        drawSparkleStar(ctx, r.x, r.y, 4, 3.5, 1.0, r.y * 0.05, '#FFFFFF', 0.95, true);
        ctx.restore();
      }

      // 3. UPDATE & DRAW TWINKLING STARS ("SITARE")
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];

        s.tail.push({ x: s.x, y: s.y });
        if (s.tail.length > 4) s.tail.shift();

        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.958; // Air resistance
        s.vy *= 0.958;
        s.vy += 0.052; // Gentle gravity (drifting stars)
        s.rotation += s.rotSpeed; // Star spin
        s.twinklePhase += s.twinkleSpeed;
        s.alpha -= s.decay;

        if (s.alpha <= 0.02) {
          stars.splice(i, 1);
          continue;
        }

        // Twinkle luminance calculation
        const twinkleFactor = 0.7 + 0.3 * Math.sin(s.twinklePhase);
        const currentAlpha = Math.max(0.05, s.alpha * twinkleFactor);

        // Draw faint stardust trail
        if (s.tail.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(s.tail[0].x, s.tail[0].y);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size * 0.6;
          ctx.globalAlpha = currentAlpha * 0.45;
          ctx.stroke();
          ctx.restore();
        }

        // Inner radius ratio for star spikes
        const innerRadius = s.spikes === 4 ? s.size * 0.28 : s.size * 0.42;

        // Draw glittering star ("Sitara")
        drawSparkleStar(
          ctx,
          s.x,
          s.y,
          s.spikes,
          s.size,
          innerRadius,
          s.rotation,
          s.color,
          currentAlpha,
          s.isMajorStar
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause on hidden tab to save battery and performance
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
