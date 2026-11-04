import React from 'react';
import {
  TikTokColorIcon,
  SpotifyIcon,
  TwitterXIcon,
  InstagramIcon,
  YouTubeIcon,
  TelegramIcon,
  FacebookIcon,
  LinkedInIcon,
  TwitchIcon,
  SnapchatIcon,
  DiscordIcon,
  WhatsAppIcon
} from './BrandIcons';

export interface PlatformItem {
  id: string;
  name: string;
  count: number | string;
  icon: React.ReactNode;
  iconBg: string;
}

const PLATFORMS: PlatformItem[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    count: 149,
    icon: <TikTokColorIcon className="w-4 h-4" />,
    iconBg: 'bg-black shadow-sm border border-zinc-800',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    count: 234,
    icon: <YouTubeIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#FF0000] shadow-sm',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    count: 423,
    icon: <InstagramIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    count: 312,
    icon: <FacebookIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#1877F2] shadow-sm',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    count: 186,
    icon: <TelegramIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#229ED9] shadow-sm',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    count: 94,
    icon: <SpotifyIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#1DB954] shadow-sm',
  },
  {
    id: 'twitter',
    name: 'Twitter (X)',
    count: 195,
    icon: <TwitterXIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#0F1419] shadow-sm',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    count: 120,
    icon: <WhatsAppIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#25D366] shadow-sm',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    count: 75,
    icon: <SnapchatIcon className="w-4 h-4 text-black" />,
    iconBg: 'bg-[#FFFC00] shadow-sm',
  },
  {
    id: 'discord',
    name: 'Discord',
    count: 68,
    icon: <DiscordIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#5865F2] shadow-sm',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    count: 59,
    icon: <LinkedInIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#0A66C2] shadow-sm',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    count: 81,
    icon: <TwitchIcon className="w-4 h-4 text-white" />,
    iconBg: 'bg-[#9146FF] shadow-sm',
  },
];

export const LoginPlatformMarquee: React.FC = () => {
  // Triple the array to ensure 100% gapless continuous marquee sliding on ultra-wide screens
  const marqueeItems = [...PLATFORMS, ...PLATFORMS, ...PLATFORMS];

  return (
    <section className="w-full relative py-4 sm:py-6 overflow-hidden select-none">
      {/* Subtle edge fade gradient masks for high-end polish */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-20 md:w-32 bg-gradient-to-r from-[#FAF7EE] via-[#FAF7EE]/90 to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-20 md:w-32 bg-gradient-to-l from-[#FAF7EE] via-[#FAF7EE]/90 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Marquee Track Container with pause on hover & no scrollbars */}
      <div className="w-full overflow-hidden no-scrollbar">
        <div className="flex w-max items-center animate-platform-marquee hover:[animation-play-state:paused] space-x-3 sm:space-x-4 px-2">
          {marqueeItems.map((platform, idx) => (
            <div
              key={`${platform.id}-${idx}`}
              className="inline-flex items-center space-x-3 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full bg-[#FFFDF9]/95 backdrop-blur-sm border border-[#EAE3D2] shadow-[0_3px_12px_-2px_rgba(0,0,0,0.04)] hover:border-red-300 hover:shadow-md transition-all duration-200 cursor-default flex-shrink-0 group"
            >
              {/* Platform Brand Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${platform.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}
              >
                {platform.icon}
              </div>

              {/* Platform Name */}
              <span className="font-bold text-stone-900 text-xs sm:text-sm tracking-tight whitespace-nowrap font-sans">
                {platform.name}
              </span>

              {/* Platform Count Badge */}
              <span className="text-[11px] sm:text-xs font-bold text-stone-600 bg-[#F5F0E4] group-hover:bg-red-50 group-hover:text-red-600 transition-colors px-2.5 py-0.5 rounded-full font-mono">
                {platform.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
