import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { saveAppointmentToSupabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string;
  userEmail?: string;
  userName?: string;
  userId?: number;
}

const TIME_SLOTS = [
  '10:00 AM - 11:00 AM (Morning)',
  '11:30 AM - 12:30 PM (Midday)',
  '02:00 PM - 03:00 PM (Afternoon)',
  '04:00 PM - 05:00 PM (Late Afternoon)',
  '06:00 PM - 07:00 PM (Evening)',
  '08:00 PM - 09:00 PM (Night)',
];

const CONSULTATION_TYPES = [
  'SMM Growth Strategy & Campaign Plan',
  'Child Panel & Reseller Website Setup',
  'Bulk High-Volume SMM Orders Consultation',
  'Custom API & Payment Gateway Integration',
  'VIP Account Management & Consultation',
  'General Support & Technical Assistance',
];

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  initialService,
  userEmail = '',
  userName = '',
  userId,
}) => {
  const [formData, setFormData] = useState({
    name: userName || '',
    email: userEmail || '',
    phone: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow's date default
    timeSlot: TIME_SLOTS[0],
    serviceType: initialService || CONSULTATION_TYPES[0],
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // 1. Direct Supabase Backend table insert
      let supabaseResult: any = null;
      try {
        supabaseResult = await saveAppointmentToSupabase({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          time_slot: formData.timeSlot,
          service_type: formData.serviceType,
          message: formData.message,
          user_id: userId || null,
          status: 'pending',
        });
      } catch (sbErr) {
        console.warn('Direct client Supabase note:', sbErr);
      }

      // 2. Also record through server API route to ensure notification & DB redundancy
      const response = await fetch(getApiUrl('/api/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok || supabaseResult?.success) {
        setBookedDetails(data.appointment || {
          ...formData,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        setIsSuccess(true);
      } else {
        throw new Error(data.error || 'Failed to book appointment.');
      }
    } catch (err: any) {
      console.error('Appointment booking error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setBookedDetails(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-gray-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden my-8"
        >
          {/* Ambient lighting */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Close button */}
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <div>
              {/* Header */}
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/25">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-white">
                    Book an Appointment
                  </h2>
                  <p className="text-xs text-indigo-300 font-medium">
                    Schedule a 1-on-1 SMM Strategy or Consultation Session
                  </p>
                </div>
              </div>

              {/* Supabase status badge */}
              <div className="mt-3 mb-6 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Connected to Supabase Database Tables (`appointments`)</span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-400 font-semibold border border-emerald-500/30">
                  ID: ixhkffzlxa...
                </span>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 text-sm transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. name@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" /> WhatsApp / Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +91 8795005604"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 text-sm transition-all"
                    />
                  </div>

                  {/* Consultation Topic */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Service / Topic
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all"
                    >
                      {CONSULTATION_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-gray-900 text-white">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Appointment Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all"
                    />
                  </div>

                  {/* Time Slot */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Preferred Time Slot *
                    </label>
                    <select
                      value={formData.timeSlot}
                      onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot} className="bg-gray-900 text-white">
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message / Requirements */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Additional Notes or Questions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what you'd like to achieve with your SMM campaign or website..."
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 text-sm transition-all resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving to Supabase Backend...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Appointment Booking</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Success confirmation card */
            <div className="py-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Appointment Successfully Booked!
              </h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Your appointment details have been stored in the Supabase backend tables. Our specialist team will reach out to you at <span className="text-indigo-300 font-medium">{formData.email}</span>.
              </p>

              {/* Booking Summary Box */}
              <div className="bg-gray-800/80 border border-gray-700/80 rounded-2xl p-5 text-left max-w-lg mx-auto mb-6 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Client Name:</span>
                  <span className="font-semibold text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Service:</span>
                  <span className="font-semibold text-indigo-300">{formData.serviceType}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Date & Slot:</span>
                  <span className="font-semibold text-white">{formData.date} &bull; {formData.timeSlot}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Database Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Saved in Supabase (`appointments`)
                  </span>
                </div>
              </div>

              <button
                onClick={handleResetAndClose}
                className="px-8 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-semibold text-sm text-white transition-all shadow-lg"
              >
                Close & Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
