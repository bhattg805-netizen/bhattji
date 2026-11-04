import React from 'react';

interface CuteBoyAiAvatarProps {
  className?: string;
  size?: number | string;
  showOnlineDot?: boolean;
}

export const CuteBoyAiAvatar: React.FC<CuteBoyAiAvatarProps> = ({
  className = '',
  size = '100%',
  showOnlineDot = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Light-Pink Radial Gradient Background */}
          <radialGradient id="pinkAvatarBg" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFF0F3" />
            <stop offset="65%" stopColor="#FFE0E6" />
            <stop offset="100%" stopColor="#FFCCD5" />
          </radialGradient>

          {/* Red Shirt Gradient */}
          <linearGradient id="redShirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>

          {/* Hair Gradient */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#40302B" />
            <stop offset="100%" stopColor="#251B18" />
          </linearGradient>

          {/* Headset Metallic Gradient */}
          <linearGradient id="headsetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* 1. Circular Light-Pink Background with Smooth Border */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="url(#pinkAvatarBg)"
          stroke="#FDA4AF"
          strokeWidth="1.5"
          className="transition-all"
        />

        {/* Inner Soft Glow */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.6" />

        {/* 2. Red Shirt & Shoulders (Clipped inside circular bounds) */}
        <g clipPath="url(#avatarClipCircle)">
          <clipPath id="avatarClipCircle">
            <circle cx="50" cy="50" r="46.5" />
          </clipPath>

          {/* Red Body / Polo Shirt */}
          <path
            d="M18 90 C18 73 32 68 50 68 C68 68 82 73 82 90 L82 100 L18 100 Z"
            fill="url(#redShirtGrad)"
          />

          {/* Shirt Fold / Shadow */}
          <path
            d="M18 92 C28 78 72 78 82 92 L82 96 C72 82 28 82 18 96 Z"
            fill="#991B1B"
            opacity="0.3"
          />

          {/* White Inner Collar / Undershirt */}
          <path d="M43 68 L50 78 L57 68 Z" fill="#FFFFFF" />

          {/* Red Collar Flaps */}
          <path d="M37 68 L48 76 L44 80 L33 71 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />
          <path d="M63 68 L52 76 L56 80 L67 71 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" />

          {/* Cute Tiny Red Shirt Buttons */}
          <circle cx="50" cy="83" r="1.2" fill="#FFFFFF" />
          <circle cx="50" cy="89" r="1.2" fill="#FFFFFF" />
        </g>

        {/* 3. Neck */}
        <path d="M43 56 L43 70 C43 73 57 73 57 70 L57 56 Z" fill="#F8B195" />
        <path d="M43 56 C47 61 53 61 57 56 L57 60 C53 64 47 64 43 60 Z" fill="#E89679" />

        {/* 4. Head Group (Subtle breathing/tilt animation) */}
        <g className="avatar-head-group" style={{ transformOrigin: '50px 52px' }}>
          {/* Back Hair Volume */}
          <path
            d="M28 40 C25 24 38 16 50 16 C62 16 75 24 72 40 C72 45 69 50 67 52 C65 44 65 38 65 34 C60 30 40 30 35 34 C35 38 35 44 33 52 C31 50 28 45 28 40 Z"
            fill="url(#hairGrad)"
          />

          {/* Ears */}
          <circle cx="31" cy="46" r="5.5" fill="#F8B195" />
          <circle cx="31" cy="46" r="3.2" fill="#E89679" opacity="0.6" />
          <circle cx="69" cy="46" r="5.5" fill="#F8B195" />
          <circle cx="69" cy="46" r="3.2" fill="#E89679" opacity="0.6" />

          {/* Cute Rounded Face */}
          <path
            d="M32 40 C32 27 68 27 68 40 C68 53.5 61 60 50 60 C39 60 32 53.5 32 40 Z"
            fill="#FFDFC8"
          />

          {/* Rosy Blushing Cheeks */}
          <ellipse cx="37" cy="48.5" rx="4.2" ry="2.3" fill="#FF8596" fillOpacity="0.45" />
          <ellipse cx="63" cy="48.5" rx="4.2" ry="2.3" fill="#FF8596" fillOpacity="0.45" />

          {/* Eyebrows */}
          <path
            d="M36.5 36 Q41 33.5 45.5 36"
            stroke="#4A2E2B"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M54.5 36 Q59 33.5 63.5 36"
            stroke="#4A2E2B"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Blinking Eyes Group (Blinks naturally via CSS animation) */}
          <g className="avatar-eyes-group" style={{ transformOrigin: '50px 43.5px' }}>
            {/* Left Eye */}
            <circle cx="41" cy="43.5" r="4.2" fill="#1C1917" />
            <circle cx="39.5" cy="41.8" r="1.6" fill="#FFFFFF" />
            <circle cx="42.6" cy="44.8" r="0.75" fill="#FFFFFF" />

            {/* Right Eye */}
            <circle cx="59" cy="43.5" r="4.2" fill="#1C1917" />
            <circle cx="57.5" cy="41.8" r="1.6" fill="#FFFFFF" />
            <circle cx="60.6" cy="44.8" r="0.75" fill="#FFFFFF" />
          </g>

          {/* Cute Tiny Nose */}
          <path
            d="M49 46.5 Q50 48 51 46.5"
            stroke="#E89679"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Friendly Sweet Smile */}
          <path
            d="M44.5 50.5 Q50 56.5 55.5 50.5"
            fill="#E11D48"
            stroke="#4A2E2B"
            strokeWidth="1"
          />
          {/* Top Smile Teeth Sparkle */}
          <path d="M46.5 51 Q50 52.8 53.5 51" fill="#FFFFFF" />

          {/* Stylish Front Hair Bangs */}
          <path
            d="M30 36 C34 23 44 21 50 23 C57 21 66 23 70 36 C64 30.5 58 34 52 29.5 C47.5 34.5 39 30 30 36 Z"
            fill="url(#hairGrad)"
          />
          {/* Hair Side Lock & Shine Highlights */}
          <path
            d="M44.5 25.5 C47.5 30 48.5 34.5 46.5 37 C44 33 43.5 29 44.5 25.5 Z"
            fill="#573F37"
          />
          <path
            d="M38 23.5 C44 21.5 56 21.5 62 23.5"
            stroke="#785B50"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />

          {/* 5. Customer Support Headset & Microphone */}
          {/* Headset Top Arch Band */}
          <path
            d="M28 44 C28 17 72 17 72 44"
            fill="none"
            stroke="url(#headsetGrad)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Headset Comfort Cushion Padding */}
          <path
            d="M38 20 C42 18.5 58 18.5 62 20"
            fill="none"
            stroke="#475569"
            strokeWidth="4.6"
            strokeLinecap="round"
          />

          {/* Left Earcup */}
          <rect
            x="25"
            y="38"
            width="6.5"
            height="13"
            rx="3.2"
            fill="#0F172A"
            stroke="#EF4444"
            strokeWidth="1"
          />
          <circle cx="28.2" cy="44.5" r="1.5" fill="#EF4444" />

          {/* Right Earcup */}
          <rect
            x="68.5"
            y="38"
            width="6.5"
            height="13"
            rx="3.2"
            fill="#0F172A"
            stroke="#EF4444"
            strokeWidth="1"
          />
          <circle cx="71.8" cy="44.5" r="1.5" fill="#EF4444" />

          {/* Boom Microphone Arm (Curved from left earcup towards mouth) */}
          <path
            d="M29 48 Q32 57 44.5 55"
            fill="none"
            stroke="#334155"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Red Microphone Tip / Foam Filter */}
          <rect
            x="42.5"
            y="52.8"
            width="5.5"
            height="4.2"
            rx="2"
            fill="#E11D48"
            stroke="#BE123C"
            strokeWidth="0.8"
          />
          <circle cx="45.2" cy="54.9" r="0.8" fill="#FCA5A5" />
        </g>
      </svg>

      {/* 6. Top-Right Green Online Status Dot with Soft Pulse */}
      {showOnlineDot && (
        <span className="absolute top-0 right-0 flex h-4 w-4 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs" />
        </span>
      )}
    </div>
  );
};
