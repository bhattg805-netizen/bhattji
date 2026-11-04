import React, { memo } from 'react';
import '../styles/diwali-overlay.css';

/**
 * Traditional Indian Diya (Earthen lamp) SVG
 * High-fidelity, lightweight vector illustration with metallic brass & terracotta tones
 */
const DiyaSvg: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={Math.round(size * 0.72)}
    viewBox="0 0 50 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ overflow: 'visible' }}
  >
    <defs>
      <linearGradient id="dwl-brass-grad" x1="0" y1="0" x2="50" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="35%" stopColor="#d97706" />
        <stop offset="70%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="dwl-brass-rim" x1="0" y1="12" x2="50" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="dwl-base-grad" x1="15" y1="28" x2="35" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>

    {/* Diya Base Stand */}
    <ellipse cx="25" cy="33" rx="11" ry="3" fill="url(#dwl-base-grad)" opacity="0.9" />

    {/* Diya Main Clay/Brass Body */}
    <path
      d="M3 14 C 4 28, 20 32, 25 32 C 30 32, 46 28, 47 14 C 43 17, 34 19, 25 19 C 16 19, 7 17, 3 14 Z"
      fill="url(#dwl-brass-grad)"
    />

    {/* Diya Ornate Rim */}
    <ellipse cx="25" cy="14" rx="22" ry="4.5" fill="url(#dwl-brass-rim)" />
    <ellipse cx="25" cy="14" rx="18.5" ry="3.2" fill="#78350f" opacity="0.75" />

    {/* Diya Beaded Rim Dots for Traditional Look */}
    <circle cx="10" cy="16" r="1.1" fill="#fef08a" opacity="0.8" />
    <circle cx="17" cy="18" r="1.1" fill="#fef08a" opacity="0.9" />
    <circle cx="25" cy="18.5" r="1.3" fill="#ffffff" opacity="0.95" />
    <circle cx="33" cy="18" r="1.1" fill="#fef08a" opacity="0.9" />
    <circle cx="40" cy="16" r="1.1" fill="#fef08a" opacity="0.8" />
  </svg>
);

/**
 * Traditional Rangoli Mandala SVG (Subtle geometric floral floor pattern)
 */
const RangoliSvg: React.FC<{ size?: number; className?: string }> = ({ size = 70, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="dwl-rangoli-stroke" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#ec4899" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    {/* Concentric rings */}
    <circle cx="50" cy="50" r="44" stroke="url(#dwl-rangoli-stroke)" strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="50" cy="50" r="32" stroke="url(#dwl-rangoli-stroke)" strokeWidth="1" />
    <circle cx="50" cy="50" r="18" stroke="url(#dwl-rangoli-stroke)" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="50" cy="50" r="6" fill="#f59e0b" fillOpacity="0.3" />

    {/* 8-Petal Lotus Flourish */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
      <g key={idx} transform={`rotate(${angle} 50 50)`}>
        <path
          d="M 50 18 C 45 28, 45 36, 50 44 C 55 36, 55 28, 50 18 Z"
          fill="rgba(245, 158, 11, 0.18)"
          stroke="url(#dwl-rangoli-stroke)"
          strokeWidth="0.8"
        />
        <circle cx="50" cy="10" r="1.8" fill="#fbbf24" />
      </g>
    ))}
  </svg>
);

/**
 * Diya with glowing animated flame and radiant halo
 */
const GlowingDiya: React.FC<{ size?: number; showRangoli?: boolean }> = ({ size = 38, showRangoli = false }) => (
  <div className="dwl-diya-container">
    {showRangoli && (
      <div className="dwl-rangoli-bg">
        <RangoliSvg size={Math.round(size * 1.8)} />
      </div>
    )}

    {/* Animated Flickering Flame */}
    <div className="dwl-flame-wrapper">
      <div className="dwl-flame-halo" />
      <div className="dwl-flame-outer" />
      <div className="dwl-flame-inner" />
    </div>

    {/* Brass Lamp Base */}
    <DiyaSvg size={size} />
  </div>
);

/**
 * Isolated Diwali Decoration Overlay Component
 * Strictly non-intrusive, isolated CSS, pointer-events: none, lightweight vector graphics
 */
export const DiwaliOverlay: React.FC = memo(() => {
  // Generate 24 fairy light bulbs along the top wire
  const bulbCount = 24;
  const bulbs = Array.from({ length: bulbCount });

  // Subtle floating sparkles along left & right margins
  const sparkles = [
    { top: '15%', left: '14px', delay: '0s', size: 3 },
    { top: '38%', left: '18px', delay: '1.2s', size: 4 },
    { top: '65%', left: '12px', delay: '2.1s', size: 3 },
    { top: '82%', left: '22px', delay: '0.7s', size: 4 },
    { top: '18%', right: '16px', delay: '0.4s', size: 4 },
    { top: '42%', right: '20px', delay: '1.8s', size: 3 },
    { top: '68%', right: '14px', delay: '2.4s', size: 4 },
    { top: '85%', right: '24px', delay: '1.1s', size: 3 },
  ];

  return (
    <div className="dwl-overlay-root pointer-events-none" aria-hidden="true">
      {/* 1. TOP FAIRY LIGHTS STRING */}
      <div className="dwl-fairy-lights-bar">
        <svg className="dwl-wire-svg" preserveAspectRatio="none" viewBox="0 0 1000 12">
          <path
            d="M 0 2 Q 50 10, 100 2 Q 150 10, 200 2 Q 250 10, 300 2 Q 350 10, 400 2 Q 450 10, 500 2 Q 550 10, 600 2 Q 650 10, 700 2 Q 750 10, 800 2 Q 850 10, 900 2 Q 950 10, 1000 2"
          />
        </svg>
        {bulbs.map((_, i) => (
          <div key={i} className="dwl-bulb" />
        ))}
      </div>

      {/* 2. TOP-LEFT HANGING DIYA */}
      <div className="dwl-hanging-diya-left">
        <div className="dwl-hanging-chain" />
        <GlowingDiya size={32} />
      </div>

      {/* 3. TOP-RIGHT HANGING DIYA */}
      <div className="dwl-hanging-diya-right">
        <div className="dwl-hanging-chain" />
        <GlowingDiya size={32} />
      </div>

      {/* 4. BOTTOM-LEFT CORNER DIYA & RANGOLI */}
      <div className="dwl-bottom-corner-left">
        <GlowingDiya size={42} showRangoli={true} />
      </div>

      {/* 5. BOTTOM-RIGHT CORNER DIYA & RANGOLI */}
      <div className="dwl-bottom-corner-right">
        <GlowingDiya size={42} showRangoli={true} />
      </div>

      {/* 6. FLOATING GOLDEN SPARKLES AROUND EDGES */}
      {sparkles.map((sp, idx) => (
        <div
          key={idx}
          className="dwl-sparkle-dot"
          style={{
            top: sp.top,
            left: sp.left,
            right: sp.right,
            width: `${sp.size}px`,
            height: `${sp.size}px`,
            animationDelay: sp.delay,
          }}
        />
      ))}
    </div>
  );
});

DiwaliOverlay.displayName = 'DiwaliOverlay';
