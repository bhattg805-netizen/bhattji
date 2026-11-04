import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Package,
  CreditCard,
  Zap,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Copy,
  Check,
  Paperclip,
  Users,
  Megaphone,
  Image as ImageIcon,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { getApiUrl, safeParseResponse } from '../lib/api.ts';
import { CuteBoyAiAvatar } from './CuteBoyAiAvatar.tsx';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  order?: any;
  attachmentName?: string;
  timestamp: string;
}

interface AiChatBotProps {
  userId?: number;
  userName?: string;
  isDarkMode?: boolean;
  isEmbedded?: boolean;
  latestOrderId?: number;
  onNavigateTab?: (tab: string) => void;
  whatsappNumber?: string;
  telegramUsername?: string;
  telegramChannel?: string;
  websiteName?: string;
}

export const AiChatBot: React.FC<AiChatBotProps> = ({
  userId,
  userName = 'User',
  isDarkMode = true,
  isEmbedded = false,
  latestOrderId,
  onNavigateTab,
  whatsappNumber = '8795005604',
  telegramUsername = '@securesmmtursted',
  telegramChannel = 'https://t.me/securesmmtursted',
  websiteName = 'YouthSMM',
}) => {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [hasNewMessageBounce, setHasNewMessageBounce] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '') || '8795005604';
  const cleanTelegram = telegramUsername.replace(/^@/, '') || 'securesmmtursted';
  const telegramSupportUrl = telegramUsername?.startsWith('http') ? telegramUsername : `https://t.me/${cleanTelegram}`;
  const telegramOffersUrl = telegramChannel?.startsWith('http') ? telegramChannel : `https://t.me/${cleanTelegram}`;

  const sampleOrderId = latestOrderId || 12345;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `👋 Welcome to ${websiteName} Support!

To manage an order, reply with your Order ID followed by a command:

${sampleOrderId} status — check progress

${sampleOrderId} refill — request a refill

${sampleOrderId} speed — request a speed-up

${sampleOrderId} cancel — request cancellation

${sampleOrderId} shows completed — Showing Completed Without Complete`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
      scrollToBottom();
    }
  }, [messages, isOpen, isEmbedded]);

  const quickPrompts = [
    { label: `📊 ${sampleOrderId} status`, query: `${sampleOrderId} status` },
    { label: `🔄 ${sampleOrderId} refill`, query: `${sampleOrderId} refill` },
    { label: `🚀 ${sampleOrderId} speed`, query: `${sampleOrderId} speed` },
    { label: `❌ ${sampleOrderId} cancel`, query: `${sampleOrderId} cancel` },
    { label: `⚠️ ${sampleOrderId} shows completed`, query: `${sampleOrderId} shows completed` },
    { label: '💳 How to Add Funds / Pay?', query: 'Payment kaise karein aur UTR verify kaise hota hai?' },
    { label: '💬 WhatsApp Support', query: `Official WhatsApp Support number +91 ${cleanPhone} kya hai?` },
    { label: '✈️ Official Telegram Support', query: `Official Telegram channel aur support link kya hai?` },
  ];

  const handleSendMessage = async (customText?: string) => {
    const rawText = customText || inputMessage;
    if ((!rawText.trim() && !attachedFile) || loading) return;

    let fullText = rawText.trim();
    if (attachedFile) {
      fullText = fullText ? `${fullText} [Attached File: ${attachedFile}]` : `[Attached File: ${attachedFile}]`;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: fullText,
      attachmentName: attachedFile || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setAttachedFile(null);
    setLoading(true);

    try {
      // Build previous conversation history for Gemini context
      const history = messages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        content: m.text,
      }));

      const res = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullText,
          history,
          userId,
        }),
      });

      const data = await safeParseResponse(res);

      if (data && data.response) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.response,
          order: data.order,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        if (!isOpen) {
          setHasNewMessageBounce(true);
          setTimeout(() => setHasNewMessageBounce(false), 1200);
        }
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `Sorry, I encountered a temporary connection issue. You can track orders by typing your Order ID (e.g. \`#102\`) or contact our direct WhatsApp at **+91 ${cleanPhone}** or Telegram at **@${cleanTelegram}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (!isOpen) {
        setHasNewMessageBounce(true);
        setTimeout(() => setHasNewMessageBounce(false), 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file.name);
    }
  };

  const copyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render formatted text with bold, code blocks, lists and links
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Check if line is a command instruction matching the requested pattern:
          // e.g. "12345 status — check progress" or "`12345 status` — check progress"
          const cmdMatch = line.trim().match(/^`?(\d+)\s+(status|refill|speed|cancel|shows completed)`?\s*—\s*(.*)$/i);
          if (cmdMatch) {
            const oId = cmdMatch[1];
            const cmdName = cmdMatch[2].toLowerCase();
            const desc = cmdMatch[3];
            const fullCmd = `${oId} ${cmdName}`;

            const badgeColor =
              cmdName === 'status' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' :
              cmdName === 'refill' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
              cmdName === 'speed' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
              cmdName === 'cancel' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' :
              'text-purple-400 border-purple-500/30 bg-purple-500/10';

            return (
              <div
                key={idx}
                className={`my-1.5 p-2 rounded-xl border ${isDarkMode ? 'border-[#272B33] bg-[#14171D]/90' : 'border-gray-200 bg-gray-50'} flex items-center justify-between gap-2 shadow-xs`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <code className={`font-mono text-[11px] sm:text-xs font-extrabold px-2 py-0.5 rounded-lg border ${badgeColor}`}>
                    {fullCmd}
                  </code>
                  <span className={`text-[11px] sm:text-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    — {desc}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage(fullCmd)}
                  className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shrink-0 shadow-xs cursor-pointer active:scale-95 transition-transform"
                >
                  Send
                </button>
              </div>
            );
          }

          // Process markdown bullet points
          let formattedLine = line;
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');

          return (
            <div key={idx} className={`${isBullet ? 'pl-2 text-inherit' : 'text-inherit'}`}>
              <FormattedLine line={formattedLine} />
            </div>
          );
        })}
      </div>
    );
  };

  const chatContent = (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#15181E] text-gray-100' : 'bg-white text-gray-900'} rounded-3xl overflow-hidden shadow-2xl border ${isDarkMode ? 'border-[#272B33]' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3.5 ${isDarkMode ? 'bg-gradient-to-r from-red-700 via-red-600 to-rose-700' : 'bg-gradient-to-r from-red-600 to-rose-600'} text-white flex items-center justify-between shadow-sm`}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center p-0.5 shadow-inner">
              <CuteBoyAiAvatar size={38} showOnlineDot={true} />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight">{websiteName} AI Assistant</h3>
              <span className="bg-white/20 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Online 24/7</span>
            </div>
            <p className="text-[11px] text-red-100 font-medium">Instant Orders, Payments, WhatsApp & Telegram Support</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {!isEmbedded && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
              title={isExpanded ? 'Minimize Window' : 'Expand Window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {!isEmbedded && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 ${isDarkMode ? 'bg-[#191C22]' : 'bg-gray-50/70'} scrollbar-thin`}>
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 ring-1 ring-rose-300 dark:ring-rose-900/50 bg-[#FFE4E8]">
                  <CuteBoyAiAvatar size={32} />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[80%] space-y-2`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl shadow-xs ${
                    isBot
                      ? isDarkMode
                        ? 'bg-[#191C22] border border-[#272B33] text-gray-200 rounded-tl-xs'
                        : 'bg-white border border-gray-200/90 text-gray-800 rounded-tl-xs'
                      : 'bg-red-600 text-white font-medium rounded-tr-xs ml-auto shadow-red-600/20'
                  }`}
                >
                  {isBot ? renderFormattedText(m.text) : (
                    <div>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{m.text}</p>
                      {m.attachmentName && (
                        <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-[11px] font-medium text-white/90">
                          <Paperclip className="w-3 h-3" />
                          <span>{m.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Order Card inside Chat Message */}
                {isBot && m.order && (
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#15181E] border-red-500/30' : 'bg-red-50/60 border-red-200'} space-y-3 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-red-500" />
                        <span className="font-extrabold text-xs">Order #{m.order.id}</span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          m.order.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : m.order.status === 'processing'
                            ? 'bg-blue-500/20 text-blue-400'
                            : m.order.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : m.order.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {m.order.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-bold line-clamp-1">{m.order.serviceName || `Service #${m.order.serviceId}`}</div>
                      <div className={`text-[11px] truncate font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        🔗 {m.order.link}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700/30 text-[11px] font-semibold text-center">
                      <div className={`p-1.5 rounded-xl ${isDarkMode ? 'bg-[#191C22]' : 'bg-white'}`}>
                        <div className="text-[9px] text-gray-400 uppercase">Quantity</div>
                        <div className="font-bold">{m.order.quantity?.toLocaleString()}</div>
                      </div>
                      <div className={`p-1.5 rounded-xl ${isDarkMode ? 'bg-[#191C22]' : 'bg-white'}`}>
                        <div className="text-[9px] text-gray-400 uppercase">Start Count</div>
                        <div className="font-bold">{m.order.startCount ?? 0}</div>
                      </div>
                      <div className={`p-1.5 rounded-xl ${isDarkMode ? 'bg-[#191C22]' : 'bg-white'}`}>
                        <div className="text-[9px] text-gray-400 uppercase">Remains</div>
                        <div className="font-bold text-red-500">{m.order.remains ?? 0}</div>
                      </div>
                    </div>

                    {/* 5 Order Management Commands from User UI */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-gray-700/30">
                      <button
                        onClick={() => handleSendMessage(`${m.order.id} status`)}
                        className="py-1.5 px-2 rounded-xl bg-cyan-600/90 hover:bg-cyan-600 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                        title="Check Status"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Status</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage(`${m.order.id} refill`)}
                        className="py-1.5 px-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                        title="Request Refill"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Refill</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage(`${m.order.id} speed`)}
                        className="py-1.5 px-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                        title="Speed Up"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Speed Up</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage(`${m.order.id} cancel`)}
                        className="py-1.5 px-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                        title="Cancel Order"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage(`${m.order.id} shows completed`)}
                        className="col-span-2 sm:col-span-4 py-1.5 px-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                        title="Report Showing Completed Without Complete"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Shows Completed Without Complete</span>
                      </button>
                    </div>

                    {onNavigateTab && (
                      <div className="pt-1 text-center">
                        <button
                          onClick={() => onNavigateTab('orders')}
                          className={`w-full py-1 rounded-xl border text-[10px] font-bold ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-300 hover:bg-gray-100 text-gray-600'} cursor-pointer`}
                        >
                          Open in Orders Dashboard →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`text-[10px] ${isBot ? 'text-left' : 'text-right'} ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-red-500 font-bold animate-pulse pl-10">
            <Bot className="w-4 h-4 animate-spin" />
            <span>YouthSMM AI is checking & typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className={`px-3 py-2 border-t ${isDarkMode ? 'bg-[#15181E] border-[#272B33]' : 'bg-gray-50 border-gray-200'} overflow-x-auto scrollbar-none flex gap-1.5`}>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query)}
            disabled={loading}
            className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex-shrink-0 ${
              isDarkMode
                ? 'bg-[#191C22] hover:bg-red-600/20 hover:border-red-500/50 border border-[#272B33] text-gray-300 hover:text-white'
                : 'bg-white hover:bg-red-50 hover:border-red-300 border border-gray-200 text-gray-700 hover:text-red-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* WhatsApp & Telegram 2x2 Support Buttons Grid */}
      <div className={`px-3 pt-2.5 pb-1.5 ${isDarkMode ? 'bg-[#15181E]' : 'bg-gray-100/90'} border-t ${isDarkMode ? 'border-[#272B33]' : 'border-gray-200'}`}>
        <div className="grid grid-cols-2 gap-2">
          {/* Top Row Left: WA Bot */}
          <a
            href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent('Hi YouthSMM AI Bot, I need instant assistance with my order/account.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer select-none"
          >
            {/* WhatsApp Custom Crisp Icon */}
            <svg className="w-4 h-4 fill-white flex-shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>WA Bot</span>
          </a>

          {/* Top Row Right: WA Offers */}
          <a
            href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent('Hi YouthSMM! Please share the latest exclusive offers and bonus discounts.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer select-none"
          >
            <Users className="w-4 h-4" />
            <span>WA Offers</span>
          </a>

          {/* Bottom Row Left: TG Support */}
          <a
            href={telegramSupportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer select-none"
          >
            {/* Telegram Plane Icon */}
            <svg className="w-4 h-4 fill-white flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z"/>
            </svg>
            <span>TG Support</span>
          </a>

          {/* Bottom Row Right: TG Offers */}
          <a
            href={telegramOffersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer select-none"
          >
            <Megaphone className="w-4 h-4" />
            <span>TG Offers</span>
          </a>
        </div>
      </div>

      {/* Hidden File Input for Attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.txt"
      />

      {/* Attached File Preview Badge */}
      {attachedFile && (
        <div className={`px-3 py-1.5 flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'bg-[#191C22] text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
          <div className="flex items-center space-x-2 truncate">
            <Paperclip className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="truncate">{attachedFile}</span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-gray-400 hover:text-red-500 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Box matching User's Screenshot */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className={`p-2.5 sm:p-3 border-t ${isDarkMode ? 'bg-[#15181E] border-[#272B33]' : 'bg-white border-gray-200'} flex items-center gap-2`}
      >
        {/* Left Red Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 sm:p-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95 cursor-pointer flex-shrink-0 flex items-center justify-center"
          title="Attach file / screenshot"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Main Text Input */}
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="e.g. 12345 cancel"
          disabled={loading}
          className={`flex-1 px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none transition-all ${
            isDarkMode
              ? 'bg-[#191C22] border border-[#272B33] focus:border-red-500 text-white placeholder-gray-500'
              : 'bg-gray-100 border border-gray-200 focus:border-red-500 text-gray-900 placeholder-gray-400'
          }`}
        />

        {/* Right Red Send Button with text "Send" */}
        <button
          type="submit"
          disabled={(!inputMessage.trim() && !attachedFile) || loading}
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex-shrink-0"
          title="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );

  if (isEmbedded) {
    return <div className="w-full h-[650px] max-w-4xl mx-auto">{chatContent}</div>;
  }

  return (
    <>
      {/* Floating Bottom-Right Launcher Bubble */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ duration: 0.2 }}
              className={`fixed ${
                isExpanded
                  ? 'inset-4 sm:inset-10 z-50'
                  : 'bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[420px] h-[600px] max-h-[88vh]'
              }`}
            >
              {chatContent}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bubble Button (Cute Animated Boy Support Avatar with Headset & Mic) */}
        {!isOpen && (
          <div className={`${hasNewMessageBounce ? 'ai-launcher-bounce' : 'ai-launcher-floating'}`}>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsOpen(true)}
              aria-label="Open YouthSMM AI Assistant"
              title="YouthSMM AI Assistant"
              className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 p-0.5 shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all flex items-center justify-center cursor-pointer border-2 border-white/80 dark:border-white/30 hover:border-red-400 select-none focus:outline-none"
            >
              {/* Soft ambient pulse glow behind avatar */}
              <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping pointer-events-none" />

              {/* Animated Cute Boy Avatar with Headset, Red Shirt & Blinking Eyes */}
              <div className="relative w-full h-full rounded-full overflow-visible flex items-center justify-center">
                <CuteBoyAiAvatar size="100%" showOnlineDot={true} />
              </div>

              {/* Hover Tooltip */}
              <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-gray-900/95 backdrop-blur-xs text-white text-xs font-bold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 hidden sm:flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>YouthSMM AI Support</span>
              </div>
            </motion.button>
          </div>
        )}
      </div>
    </>
  );
};

// Sub-component to format bold markdown, links and code blocks cleanly
const FormattedLine: React.FC<{ line: string }> = ({ line }) => {
  // Regex to split by bold **text**, `code` or [links](url)
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-extrabold text-red-500">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[11px] font-bold text-red-400">
              {part.slice(1, -1)}
            </code>
          );
        }
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noreferrer"
              className="text-red-500 font-bold hover:underline inline-flex items-center space-x-0.5"
            >
              <span>{linkMatch[1]}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 inline" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
