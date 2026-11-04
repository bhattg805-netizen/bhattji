import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Search,
  Instagram,
  Youtube,
  Twitter,
  Check,
  Zap,
  ShieldCheck,
  Cpu,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Menu,
  X,
  Lock,
  Calendar,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Service } from '../types.ts';
import { getCategoryIcon } from '../lib/icons.tsx';
import { AppointmentBookingModal } from './AppointmentBookingModal.tsx';
import { saveAppointmentToSupabase } from '../lib/supabase.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';

interface HomepageProps {
  onLogin: () => void;
  isLoggedIn: boolean;
  onGoToDashboard: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ onLogin, isLoggedIn, onGoToDashboard }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState('');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    // Fetch public services list
    fetch('/api/services/public')
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => setServices(data))
      .catch((err) => console.error(err));
  }, []);

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.categoryName || 'General')))];

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const cat = s.categoryName || 'General';
    const matchesCategory = filterCategory === 'All' || cat === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save directly to Supabase Backend
      await saveAppointmentToSupabase({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone || '',
        date: new Date().toISOString().split('T')[0],
        time_slot: 'Immediate Support Inquiry',
        service_type: 'Support / Contact Message',
        message: contactForm.message,
        status: 'pending',
      });
    } catch (sbErr) {
      console.warn('Supabase contact save note:', sbErr);
    }

    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden text-gray-200">
      {/* Background Ambience */}
      <div className="ambient-glow-purple top-20 left-[-100px]" />
      <div className="ambient-glow-blue top-[600px] right-[-150px]" />
      <div className="ambient-glow-purple bottom-[100px] left-[10%]" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card px-6 py-4 md:px-12 flex items-center justify-between">
        <AnimatedLogo size="md" showText={true} theme="dark" />

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-300">
          <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
          <a href="#services" className="hover:text-blue-400 transition-colors">Services</a>
          <a href="#appointments" className="hover:text-blue-400 transition-colors flex items-center gap-1.5 text-indigo-300">
            <Calendar className="w-3.5 h-3.5" /> Book Appointment
          </a>
          <a href="#faq" className="hover:text-blue-400 transition-colors">FAQs</a>
          <a href="#contact" className="hover:text-blue-400 transition-colors">Support</a>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={() => {
              setSelectedServiceForBooking('SMM Growth Strategy & Campaign Plan');
              setIsBookingModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Book Consultation</span>
          </button>

          {isLoggedIn ? (
            <button
              onClick={onGoToDashboard}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold shadow-lg text-sm transition-all"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-blue-500/30 hover:border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-sm transition-all shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Access Portal</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button className="md:hidden text-gray-300" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenu && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-card absolute left-0 right-0 p-6 space-y-4 flex flex-col z-40 shadow-2xl border-t border-white/5"
        >
          <a href="#features" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-300 hover:text-white">Features</a>
          <a href="#services" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-300 hover:text-white">Services</a>
          <a href="#faq" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-300 hover:text-white">FAQs</a>
          <a href="#contact" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-300 hover:text-white">Support</a>
          {isLoggedIn ? (
            <button
              onClick={() => { setMobileMenu(false); onGoToDashboard(); }}
              className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold"
            >
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => { setMobileMenu(false); onLogin(); }}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-semibold"
            >
              <Lock className="w-4 h-4" />
              <span>Access Portal</span>
            </button>
          )}
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-24 md:px-12 md:pt-28 text-center max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Fastest Delivery SMM Provider</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-white mb-8 leading-tight">
            Scale Your Social Brand <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              In A Single Click
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The ultimate choice for high quality social media growth. Enjoy automated service delivery, unbeatable pricing, and robust APIs for resellers.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold shadow-xl text-md transition-all scale-100 hover:scale-105 active:scale-95"
            >
              Boost Socials Now
            </button>
            <a
              href="#services"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-md transition-all"
            >
              View Pricing Table
            </a>
          </div>
        </motion.div>
      </section>

      {/* Animated Statistics */}
      <section className="px-6 py-12 border-y border-white/5 bg-gray-900/40">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { value: '15,400,000+', label: 'Orders Completed', desc: 'Fully automated processing' },
            { value: '0.04 Secs', label: 'Average Speed', desc: 'Ultra-fast dispatch time' },
            { value: '54,000+', label: 'Happy Customers', desc: 'With high trust scores' },
            { value: '1,450+', label: 'Available Services', desc: 'Constantly checked & updated' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-6"
            >
              <div className="font-display font-extrabold text-3xl md:text-4xl text-white bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="font-semibold text-sm text-gray-200 mt-2">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="features" className="px-6 py-24 md:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-5xl text-white">Why Choose youthsmm?</h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto text-sm md:text-base">
            We provide custom dashboard suites, high availability, and 100% active order delivery metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8 text-blue-400" />,
              title: 'Instant Delivery',
              desc: 'Our servers process API and manual orders automatically. Most services starts rolling immediately.',
            },
            {
              icon: <Cpu className="w-8 h-8 text-purple-400" />,
              title: 'Automated Service Suite',
              desc: 'Connect your store with our high-end REST API documentation, or order mass packages seamlessly.',
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
              title: '100% Secure Payments',
              desc: 'We support fully secure manual and gateway payment providers ensuring high wallet confidentiality.',
            },
          ].map((feat, idx) => (
            <div key={idx} className="glass-card p-8 rounded-2xl border border-white/5 flex flex-col items-start hover:border-blue-500/20 transition-all group">
              <div className="p-4 rounded-xl bg-white/5 group-hover:bg-blue-500/10 transition-colors mb-6">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing / Services Section */}
      <section id="services" className="px-6 py-20 md:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white">Our Services Directory</h2>
          <p className="text-gray-400 mt-3 text-sm md:text-base">
            Browse our curated SMM catalog. Real-time updates and dynamic rates.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto py-1 max-w-full no-scrollbar">
            {categories.map((cat, idx) => {
              const isActive = filterCategory === cat;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.04, y: -0.5 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setFilterCategory(cat)}
                  className={`flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border relative ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center p-0.5 rounded-lg bg-white/5">
                    {(() => {
                      const matchedSrv = services.find((s) => s.categoryName === cat);
                      return getCategoryIcon(matchedSrv?.categoryIcon, cat as string, 'w-3.5 h-3.5');
                    })()}
                  </span>
                  <span>{cat as string}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Services Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4 text-right">Price / 1K</th>
                  <th className="px-6 py-4 text-center">Min Order</th>
                  <th className="px-6 py-4 text-center">Max Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length > 0 ? (
                  filteredServices.map((srv) => (
                    <tr key={srv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                      <td className="px-6 py-4 text-gray-500 font-mono font-medium">#{srv.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 border border-white/5">
                            {getCategoryIcon(srv.icon || srv.categoryIcon, srv.name, 'w-3.5 h-3.5')}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{srv.name}</div>
                            {srv.categoryName && (
                              <span className="inline-block mt-0.5 px-1 py-0.2 rounded bg-white/5 border border-white/5 text-[9px] text-gray-400">
                                {srv.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                        {srv.description && (
                          <div className="text-xs text-gray-400 mt-1.5 pl-8.5">{srv.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                        ${srv.pricePerThousand.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-gray-400">{srv.minAmount}</td>
                      <td className="px-6 py-4 text-center font-mono text-gray-400">{srv.maxAmount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-500">
                      No services found matching search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faq" className="px-6 py-20 md:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white">Frequently Asked Questions</h2>
          <p className="text-gray-400 mt-3 text-sm md:text-base">
            Everything you need to know about SMM services and dashboard usage.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'What is youthsmm?',
              a: 'youthsmm is an online platform where resellers and clients buy social media services like followers, likes, views, subscribers, and other platform growth metrics.',
            },
            {
              q: 'Are the services safe for my account?',
              a: 'Yes, our services use secure, organic growth pathways that fully adhere to community guidelines. We do not require passwords; only the public link to your post/profile is needed.',
            },
            {
              q: 'How does the automated API integration work?',
              a: 'Once registered, you can retrieve your unique API key in your profile. You can then configure our REST endpoints to automatically place orders directly from your own website or platform.',
            },
            {
              q: 'What is your refill guarantee?',
              a: 'For services with a Refill tag, we offer a lifetime or 30-day replenishment guarantee. If social networks purge accounts, you can request a refund or refill via the Order History dashboard instantly.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="glass-card p-6 rounded-xl border border-white/5">
              <h3 className="font-semibold text-lg text-white mb-2 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed pl-7">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Appointment & Consultation Booking Section (Supabase Connected) */}
      <section id="appointments" className="px-6 py-20 md:px-12 max-w-6xl mx-auto">
        <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-indigo-950/60 via-gray-900 to-blue-950/60 border border-indigo-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Supabase Connected &bull; Realtime Booking</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                Schedule a 1-on-1 SMM Growth Strategy Session
              </h2>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                Need tailored advice for scaling your brand, setting up an automated reseller child panel, or executing high-volume campaigns? Book a dedicated consultation with our senior account managers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-300">
                <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Free Initial 30-Min Strategy Call</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Direct Child Panel Roadmap</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
              <div className="w-full max-w-sm bg-gray-900/90 border border-indigo-500/40 rounded-2xl p-6 shadow-xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Pick Date & Time Slot</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Direct sync with Supabase tables (`appointments`)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedServiceForBooking('SMM Growth Strategy & Campaign Plan');
                    setIsBookingModalOpen(true);
                  }}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>Book Appointment Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support / Contact Section */}
      <section id="contact" className="px-6 py-24 md:px-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex flex-col justify-center">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 w-12 h-12 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-6">Need Instant Help?</h2>
            <p className="text-gray-400 leading-relaxed mb-8 text-sm md:text-base">
              Got pre-sales questions or technical issues? Get in touch with our live engineering and customer support agents. We reply within 15 minutes.
            </p>
            <div className="space-y-4 text-sm font-semibold text-gray-300">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-400" />
                <span>24/7 YouthSMM AI Assistant & Ticket Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-400" />
                <span>Official Telegram Support & Channel</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-2xl border border-white/5 relative">
            <h3 className="text-xl font-bold text-white mb-6">Send Us a Direct Message</h3>

            {contactSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                Thank you! Your message was sent successfully. Our team will contact you shortly.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="name@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter message details..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold shadow-lg transition-colors text-sm"
                >
                  Send Support Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 md:px-12 bg-gray-950/80">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <AnimatedLogo size="sm" showText={true} theme="dark" />

          <p className="text-gray-500 text-xs text-center">
            &copy; 2026 youthsmm Platform. Fully secure. All rights reserved.
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <span>&middot;</span>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* Supabase Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialService={selectedServiceForBooking}
      />
    </div>
  );
};
