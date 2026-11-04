import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Zap, Clock, TrendingUp, ShieldCheck } from 'lucide-react';
import {
  TikTokColorIcon,
  InstagramIcon,
  YouTubeIcon,
  TelegramIcon,
  FacebookIcon,
  SpotifyIcon,
  TwitterXIcon
} from './BrandIcons';

interface LiveOrder {
  id: string;
  service: string;
  platform: 'instagram' | 'youtube' | 'telegram' | 'tiktok' | 'facebook' | 'spotify' | 'twitter';
  quantity: string;
  timeAgo: string;
  speed: string;
}

const LIVE_ORDERS_SAMPLE: LiveOrder[] = [
  {
    id: '#98420',
    service: 'TikTok Viral FYP Video Views & High Retention',
    platform: 'tiktok',
    quantity: '+25,000',
    timeAgo: '5s ago',
    speed: 'Instant'
  },
  {
    id: '#98421',
    service: 'Instagram High-Quality Followers [Refill 30D]',
    platform: 'instagram',
    quantity: '+1,000',
    timeAgo: '12s ago',
    speed: 'Instant'
  },
  {
    id: '#98422',
    service: 'YouTube High Retention Monetizable Views',
    platform: 'youtube',
    quantity: '+5,000',
    timeAgo: '35s ago',
    speed: '2,000/hr'
  },
  {
    id: '#98423',
    service: 'Telegram Channel Members [Non-Drop]',
    platform: 'telegram',
    quantity: '+2,500',
    timeAgo: '1m ago',
    speed: 'Instant'
  },
  {
    id: '#98424',
    service: 'Instagram Real Likes + Impressions [Explore]',
    platform: 'instagram',
    quantity: '+3,000',
    timeAgo: '2m ago',
    speed: 'Instant'
  },
  {
    id: '#98425',
    service: 'Facebook Page Likes & Real Followers',
    platform: 'facebook',
    quantity: '+1,500',
    timeAgo: '3m ago',
    speed: 'Gradual'
  },
  {
    id: '#98426',
    service: 'Spotify Premium Track Streams [Royalty Eligible]',
    platform: 'spotify',
    quantity: '+10,000',
    timeAgo: '4m ago',
    speed: 'Safe Pace'
  }
];

export const LoginLiveTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LIVE_ORDERS_SAMPLE.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const activeOrder = LIVE_ORDERS_SAMPLE[currentIndex];

  const getPlatformBadge = (platform: LiveOrder['platform']) => {
    switch (platform) {
      case 'tiktok':
        return (
          <span className="px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-bold border border-zinc-800 flex items-center space-x-1">
            <TikTokColorIcon className="w-3 h-3 shrink-0" />
            <span>TikTok</span>
          </span>
        );
      case 'instagram':
        return (
          <span className="px-2 py-0.5 rounded-md bg-pink-50 text-[#e1306c] text-[10px] font-bold border border-pink-200/60 flex items-center space-x-1">
            <InstagramIcon className="w-3 h-3 shrink-0 text-[#e1306c]" />
            <span>Instagram</span>
          </span>
        );
      case 'youtube':
        return (
          <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#ff0000] text-[10px] font-bold border border-red-200/60 flex items-center space-x-1">
            <YouTubeIcon className="w-3 h-3 shrink-0 text-[#ff0000]" />
            <span>YouTube</span>
          </span>
        );
      case 'telegram':
        return (
          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#229ED9] text-[10px] font-bold border border-sky-200/60 flex items-center space-x-1">
            <TelegramIcon className="w-3 h-3 shrink-0 text-[#229ED9]" />
            <span>Telegram</span>
          </span>
        );
      case 'facebook':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1877f2] text-[10px] font-bold border border-blue-200/60 flex items-center space-x-1">
            <FacebookIcon className="w-3 h-3 shrink-0 text-[#1877f2]" />
            <span>Facebook</span>
          </span>
        );
      case 'spotify':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#1db954] text-[10px] font-bold border border-emerald-200/60 flex items-center space-x-1">
            <SpotifyIcon className="w-3 h-3 shrink-0 text-[#1db954]" />
            <span>Spotify</span>
          </span>
        );
      case 'twitter':
        return (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-900 text-[10px] font-bold border border-gray-200 flex items-center space-x-1">
            <TwitterXIcon className="w-3 h-3 shrink-0 text-gray-900" />
            <span>Twitter (𝕏)</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
            Social
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border border-[#EAE3D2] shadow-sm hover:shadow-md transition-shadow p-3.5 sm:p-4 text-left box-border">
      {/* Top Header of Ticker */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#EAE3D2]">
        <div className="flex items-center space-x-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-800 font-mono">
            Live Order Feed
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Server Automated</span>
        </div>
      </div>

      {/* Animated Order Item */}
      <div className="h-14 sm:h-12 relative overflow-hidden flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeOrder.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="w-full flex items-center justify-between gap-2"
          >
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-mono font-bold text-[11px] text-stone-900">{activeOrder.id}</span>
                  {getPlatformBadge(activeOrder.platform)}
                  <span className="text-[11px] font-extrabold text-red-600 font-mono">{activeOrder.quantity}</span>
                </div>
                <p className="text-[11px] text-stone-500 truncate font-medium mt-0.5" title={activeOrder.service}>
                  {activeOrder.service}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0 text-right">
              <span className="text-[10px] font-mono text-stone-400 flex items-center space-x-0.5">
                <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                {activeOrder.timeAgo}
              </span>
              <span className="text-[10px] font-bold text-stone-700 bg-[#F5F0E4] px-1.5 py-0.5 rounded mt-0.5">
                {activeOrder.speed}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Platform Chips Strip */}
      <div className="mt-2 pt-2.5 border-t border-[#EAE3D2] flex items-center justify-between text-[11px] text-stone-500 overflow-x-auto no-scrollbar gap-2">
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider whitespace-nowrap">
          Top Networks:
        </span>
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E4] text-stone-700 text-[10px] font-semibold">Instagram</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E4] text-stone-700 text-[10px] font-semibold">YouTube</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E4] text-stone-700 text-[10px] font-semibold">TikTok</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E4] text-stone-700 text-[10px] font-semibold">Telegram</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E4] text-stone-700 text-[10px] font-semibold">Facebook</span>
        </div>
      </div>
    </div>
  );
};
