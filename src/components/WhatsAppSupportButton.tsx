import React from 'react';
import { motion } from 'motion/react';

interface WhatsAppSupportButtonProps {
  phoneNumber?: string;
  isDarkMode?: boolean;
  websiteName?: string;
  userName?: string;
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  phoneNumber = '8795005604',
  websiteName = 'YouthSMM',
}) => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '') || '8795005604';
  const fullInternationalPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const defaultMessage = `Hello ${websiteName} Support, I need help with my account.`;
  const whatsappUrl = `https://wa.me/${fullInternationalPhone}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div 
      id="user-whatsapp-support-container"
      className="fixed bottom-20 md:bottom-6 left-4 sm:left-6 z-40 select-none"
    >
      <div className="relative group">
        {/* Subtle breathing green glow */}
        <div className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping opacity-60 pointer-events-none" />
        <div className="absolute -inset-0.5 rounded-full bg-[#25D366]/30 blur-xs pointer-events-none" />

        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl hover:shadow-[0_0_25px_rgba(37,211,102,0.6)] flex items-center justify-center transition-all cursor-pointer overflow-hidden block"
          aria-label="WhatsApp Support"
          title="WhatsApp Support"
        >
          {/* Authentic Circular Green WhatsApp Icon (exact visual matching user's screenshot) */}
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-full h-full drop-shadow-md"
          >
            {/* Outer vibrant WhatsApp green circular background */}
            <circle cx="50" cy="50" r="50" fill="#25D366" />
            {/* Inner solid white speech bubble */}
            <path
              d="M50 22C34.5 22 22 34.5 22 50C22 55.6 23.6 60.9 26.5 65.4L23 77L35 73.5C39.4 76.2 44.5 78 50 78C65.5 78 78 65.5 78 50C78 34.5 65.5 22 50 22Z"
              fill="white"
            />
            {/* Inner WhatsApp phone receiver handset */}
            <path
              d="M61.5 56.2C60.5 55.7 55.8 53.4 55 53.1C54.1 52.8 53.4 52.7 52.8 53.7C52.1 54.7 50.3 56.9 49.7 57.5C49.2 58.2 48.6 58.2 47.7 57.8C46.7 57.3 43.6 56.3 39.9 53C37 50.4 35.1 47.2 34.6 46.2C34 45.3 34.5 44.8 35 44.3C35.5 43.8 36 43.2 36.5 42.5C36.9 41.9 37.1 41.4 37.4 40.8C37.7 40.2 37.6 39.7 37.3 39.2C37 38.8 35.4 34.7 34.6 32.9C33.9 31.1 33.2 31.3 32.7 31.3C32.1 31.3 31.5 31.3 30.9 31.3C30.3 31.3 29.3 31.5 28.5 32.4C27.6 33.3 25.4 35.5 25.4 39.8C25.4 44.2 28.6 48.2 29 48.9C29.5 49.5 35.3 58.5 44.3 62.3C46.5 63.2 48.1 63.8 49.4 64.2C51.6 64.9 53.6 64.8 55.1 64.6C56.9 64.4 60.5 62.4 61.3 60.2C62 58 62 56.1 61.8 55.7C61.6 55.3 61.1 55.1 61.5 56.2Z"
              fill="#25D366"
            />
          </svg>
        </motion.a>
      </div>
    </div>
  );
};
