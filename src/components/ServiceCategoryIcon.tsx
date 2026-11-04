import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, 
  Zap, 
  Star, 
  Heart, 
  Users, 
  Eye, 
  MessageSquare, 
  Globe, 
  Share2
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
} from './BrandIcons';

interface ServiceCategoryIconProps {
  name?: string;
  icon?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ServiceCategoryIcon: React.FC<ServiceCategoryIconProps> = ({
  name = '',
  icon,
  className = '',
  size = 'md',
  animated = true,
}) => {
  // If a custom image URL is provided
  if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex items-center justify-center shrink-0"
      >
        <img
          src={icon}
          alt=""
          className={`object-contain rounded-md ${
            size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
          }`}
          referrerPolicy="no-referrer"
        />
      </motion.div>
    );
  }

  // If custom emoji is provided
  if (icon && icon.trim().length <= 2) {
    return (
      <motion.span
        animate={animated ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-base leading-none select-none inline-block shrink-0"
      >
        {icon.trim()}
      </motion.span>
    );
  }

  const text = (name || icon || '').toLowerCase();

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // 1. TIKTOK (Authentic TikTok Music Note Logo with Glitch Neon Glow)
  if (text.includes('tiktok') || text.includes('tik tok')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.14, 1],
          filter: [
            'drop-shadow(0 0 3px rgba(37,244,238,0.7))',
            'drop-shadow(0 0 6px rgba(254,44,85,0.7))',
            'drop-shadow(0 0 3px rgba(37,244,238,0.7))'
          ]
        } : {}}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center shrink-0 ${className}`}
      >
        <TikTokColorIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 2. INSTAGRAM (Authentic Instagram Camera with Radiant Magenta Gradient Glow)
  if (text.includes('instagram') || text.includes('ig ') || text.includes('insta')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.12, 1],
          rotate: [0, -3, 3, 0],
          filter: [
            'drop-shadow(0 0 2px rgba(225,48,108,0.4))',
            'drop-shadow(0 0 6px rgba(225,48,108,0.8))',
            'drop-shadow(0 0 2px rgba(225,48,108,0.4))'
          ]
        } : {}}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#E1306C] shrink-0 ${className}`}
      >
        <InstagramIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 3. YOUTUBE (Authentic YouTube Red Rounded Play Logo)
  if (text.includes('youtube') || text.includes('yt ') || text.includes('subscribe')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.14, 1],
          filter: [
            'drop-shadow(0 0 2px rgba(255,0,0,0.4))',
            'drop-shadow(0 0 6px rgba(255,0,0,0.8))',
            'drop-shadow(0 0 2px rgba(255,0,0,0.4))'
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#FF0000] shrink-0 ${className}`}
      >
        <YouTubeIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 4. TELEGRAM (Authentic Telegram Paper Plane with Sky Blue Float)
  if (text.includes('telegram') || text.includes('tg ') || text.includes('channel')) {
    return (
      <motion.div
        animate={animated ? { 
          x: [0, 2, 0, -2, 0],
          y: [0, -2, 0, 1, 0],
          filter: [
            'drop-shadow(0 0 2px rgba(34,158,217,0.4))',
            'drop-shadow(0 0 6px rgba(34,158,217,0.8))',
            'drop-shadow(0 0 2px rgba(34,158,217,0.4))'
          ]
        } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#229ED9] shrink-0 ${className}`}
      >
        <TelegramIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 5. FACEBOOK (Authentic Facebook Official 'f' Logo)
  if (text.includes('facebook') || text.includes('fb ')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.1, 1],
          filter: [
            'drop-shadow(0 0 2px rgba(24,119,242,0.4))',
            'drop-shadow(0 0 6px rgba(24,119,242,0.8))',
            'drop-shadow(0 0 2px rgba(24,119,242,0.4))'
          ]
        } : {}}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#1877F2] shrink-0 ${className}`}
      >
        <FacebookIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 6. SPOTIFY (Authentic Spotify 3 Wave Sound Logo with Emerald Pulse)
  if (text.includes('spotify') || text.includes('podcast') || text.includes('music')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.15, 1],
          rotate: [0, 6, -6, 0],
          filter: [
            'drop-shadow(0 0 2px rgba(29,185,84,0.4))',
            'drop-shadow(0 0 6px rgba(29,185,84,0.8))',
            'drop-shadow(0 0 2px rgba(29,185,84,0.4))'
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#1DB954] shrink-0 ${className}`}
      >
        <SpotifyIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 7. TWITTER / 𝕏 (Authentic 𝕏 Geometric Modern Logo)
  if (text.includes('twitter') || text.includes('thread') || text.includes(' x ') || text.includes('𝕏')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.12, 1],
          rotate: [0, 4, -4, 0],
          filter: [
            'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
            'drop-shadow(0 0 6px rgba(255,255,255,0.8))',
            'drop-shadow(0 0 2px rgba(255,255,255,0.4))'
          ]
        } : {}}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-gray-900 dark:text-white shrink-0 ${className}`}
      >
        <TwitterXIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 8. WHATSAPP
  if (text.includes('whatsapp')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#25D366] shrink-0 ${className}`}
      >
        <WhatsAppIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 9. SNAPCHAT
  if (text.includes('snapchat')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#FFFC00] shrink-0 ${className}`}
      >
        <SnapchatIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 10. DISCORD
  if (text.includes('discord')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#5865F2] shrink-0 ${className}`}
      >
        <DiscordIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 11. LINKEDIN
  if (text.includes('linkedin')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#0A66C2] shrink-0 ${className}`}
      >
        <LinkedInIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 12. THREADS
  if (text.includes('threads')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-gray-900 dark:text-white shrink-0 ${className}`}
      >
        <ThreadsIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 13. TWITCH
  if (text.includes('twitch')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-[#9146FF] shrink-0 ${className}`}
      >
        <TwitchIcon className={`${iconSizes[size]}`} />
      </motion.div>
    );
  }

  // 14. FOLLOWERS / MEMBERS
  if (text.includes('follower') || text.includes('subscriber') || text.includes('member')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-purple-400 shrink-0 ${className}`}
      >
        <Users className={`${iconSizes[size]} stroke-[2.3]`} />
      </motion.div>
    );
  }

  // 15. LIKES / HEARTS
  if (text.includes('like') || text.includes('heart') || text.includes('react')) {
    return (
      <motion.div
        animate={animated ? { 
          scale: [1, 1.25, 1],
          filter: ['drop-shadow(0 0 2px rgba(244,63,94,0.5))', 'drop-shadow(0 0 7px rgba(244,63,94,0.9))', 'drop-shadow(0 0 2px rgba(244,63,94,0.5))']
        } : {}}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-rose-500 shrink-0 ${className}`}
      >
        <Heart className={`${iconSizes[size]} stroke-[2.3] fill-rose-500/20`} />
      </motion.div>
    );
  }

  // 16. VIEWS / WATCH
  if (text.includes('view') || text.includes('watch') || text.includes('impression')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-teal-400 shrink-0 ${className}`}
      >
        <Eye className={`${iconSizes[size]} stroke-[2.3]`} />
      </motion.div>
    );
  }

  // 17. COMMENTS
  if (text.includes('comment') || text.includes('review')) {
    return (
      <motion.div
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center justify-center text-amber-400 shrink-0 ${className}`}
      >
        <MessageSquare className={`${iconSizes[size]} stroke-[2.3]`} />
      </motion.div>
    );
  }

  // Default Sparkles with golden glow
  return (
    <motion.div
      animate={animated ? { 
        scale: [1, 1.15, 1],
        rotate: [0, 15, -15, 0],
        filter: ['drop-shadow(0 0 2px rgba(251,191,36,0.4))', 'drop-shadow(0 0 6px rgba(251,191,36,0.8))', 'drop-shadow(0 0 2px rgba(251,191,36,0.4))']
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={`flex items-center justify-center text-amber-400 shrink-0 ${className}`}
    >
      <Sparkles className={`${iconSizes[size]} stroke-[2.3]`} />
    </motion.div>
  );
};
