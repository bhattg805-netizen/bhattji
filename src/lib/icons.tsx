import React from 'react';
import { 
  Globe, 
  Sparkles, 
  Star, 
  Heart,
  Video,
  Users
} from 'lucide-react';
import {
  TikTokIcon,
  TikTokColorIcon,
  SpotifyIcon,
  TwitterXIcon,
  InstagramIcon,
  YouTubeIcon,
  TelegramIcon,
  FacebookIcon,
  WhatsAppIcon,
  SnapchatIcon,
  DiscordIcon,
  LinkedInIcon,
  ThreadsIcon,
  TwitchIcon
} from '../components/BrandIcons';

export interface PresetIcon {
  id: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

export const PRESET_ICONS = [
  { id: 'tiktok', label: 'TikTok', colorClass: 'text-[#FE2C55]' },
  { id: 'instagram', label: 'Instagram', colorClass: 'text-[#E1306C]' },
  { id: 'youtube', label: 'YouTube', colorClass: 'text-[#FF0000]' },
  { id: 'telegram', label: 'Telegram', colorClass: 'text-[#229ED9]' },
  { id: 'facebook', label: 'Facebook', colorClass: 'text-[#1877F2]' },
  { id: 'spotify', label: 'Spotify', colorClass: 'text-[#1DB954]' },
  { id: 'twitter', label: 'Twitter (X)', colorClass: 'text-gray-900 dark:text-white' },
  { id: 'whatsapp', label: 'WhatsApp', colorClass: 'text-[#25D366]' },
  { id: 'snapchat', label: 'Snapchat', colorClass: 'text-[#FFFC00]' },
  { id: 'discord', label: 'Discord', colorClass: 'text-[#5865F2]' },
  { id: 'linkedin', label: 'LinkedIn', colorClass: 'text-[#0A66C2]' },
  { id: 'threads', label: 'Threads', colorClass: 'text-gray-900 dark:text-white' },
  { id: 'twitch', label: 'Twitch', colorClass: 'text-[#9146FF]' },
  { id: 'globe', label: 'Website / Traffic', colorClass: 'text-purple-500' },
  { id: 'sparkles', label: 'VIP / Premium', colorClass: 'text-amber-400' },
  { id: 'star', label: 'Favorites', colorClass: 'text-yellow-400' },
  { id: 'heart', label: 'Likes / Engagement', colorClass: 'text-rose-500' },
  { id: 'video', label: 'Video Services', colorClass: 'text-emerald-400' },
];

export function getCategoryIcon(
  iconValue: string | null | undefined, 
  categoryName?: string, 
  className = 'w-4 h-4'
): React.ReactNode {
  // 1. If we have a custom URL (image)
  if (iconValue && (iconValue.startsWith('http://') || iconValue.startsWith('https://'))) {
    return (
      <img 
        src={iconValue} 
        alt="" 
        className={`${className} object-contain rounded-sm`} 
        referrerPolicy="no-referrer"
      />
    );
  }

  // 2. If we have a single character or emoji
  if (iconValue && iconValue.trim().length <= 2) {
    return <span className="inline-block text-sm leading-none font-sans">{iconValue.trim()}</span>;
  }

  // 3. Normalize search key
  const key = (iconValue || categoryName || '').toLowerCase().trim();

  // 4. Map key to corresponding authentic brand icons with smooth hover animation
  if (key.includes('tiktok') || key.includes('tik tok')) {
    return <TikTokColorIcon className={`${className} transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('instagram') || key === 'ig' || key.includes('insta')) {
    return <InstagramIcon className={`${className} text-[#E1306C] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('youtube') || key === 'yt' || key.includes('subscribe')) {
    return <YouTubeIcon className={`${className} text-[#FF0000] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('telegram') || key === 'tg' || key.includes('channel')) {
    return <TelegramIcon className={`${className} text-[#229ED9] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('facebook') || key === 'fb') {
    return <FacebookIcon className={`${className} text-[#1877F2] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('spotify') || key.includes('podcast') || key.includes('music')) {
    return <SpotifyIcon className={`${className} text-[#1DB954] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('twitter') || key === 'x' || key.includes('thread') || key.includes('𝕏')) {
    return <TwitterXIcon className={`${className} text-gray-900 dark:text-gray-100 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('whatsapp')) {
    return <WhatsAppIcon className={`${className} text-[#25D366] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('snapchat')) {
    return <SnapchatIcon className={`${className} text-[#FFFC00] drop-shadow-sm transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('discord')) {
    return <DiscordIcon className={`${className} text-[#5865F2] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('linkedin')) {
    return <LinkedInIcon className={`${className} text-[#0A66C2] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('threads')) {
    return <ThreadsIcon className={`${className} text-gray-900 dark:text-white transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('twitch')) {
    return <TwitchIcon className={`${className} text-[#9146FF] transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('vip') || key.includes('premium') || key.includes('sparkles')) {
    return <Sparkles className={`${className} text-amber-400 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('star') || key.includes('fav')) {
    return <Star className={`${className} text-yellow-400 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('heart') || key.includes('like') || key.includes('love')) {
    return <Heart className={`${className} text-rose-500 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('video') || key.includes('view') || key.includes('watch')) {
    return <Video className={`${className} text-emerald-400 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }
  if (key.includes('follower') || key.includes('subscriber') || key.includes('member') || key.includes('user')) {
    return <Users className={`${className} text-purple-400 transition-transform duration-200 hover:scale-115 shrink-0`} />;
  }

  // Fallback to globe / default
  return <Globe className={`${className} text-purple-400 transition-transform duration-200 hover:scale-115 shrink-0`} />;
}
