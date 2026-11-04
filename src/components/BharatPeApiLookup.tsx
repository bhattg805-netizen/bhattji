import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Key,
  CreditCard,
  Lock,
  Sparkles
} from 'lucide-react';

interface BharatPeApiLookupProps {
  onBackToHome?: () => void;
}

export const BharatPeApiLookup: React.FC<BharatPeApiLookupProps> = ({ onBackToHome }) => {
  const [phone, setPhone] = useState('8795005604');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'result'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    merchantId: string;
    token: string;
    merchantName: string;
    vpa: string;
    phone: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string>('');
  const [showToken, setShowToken] = useState(false);

  const copyToClipboard = (val: string, key: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bharatpe/lookup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep('otp');
        setSuccessMsg(data.message || `Verification code sent to +91 ${cleanPhone} via SMS.`);
      } else {
        setError(data.error || 'Failed to dispatch verification OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error connecting to verification server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit numeric OTP code.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bharatpe/lookup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp: cleanOtp }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultData({
          merchantId: data.merchantId,
          token: data.token,
          merchantName: data.merchantName,
          vpa: data.vpa,
          phone: data.phone,
        });
        setStep('result');
        setSuccessMsg('Mobile identity verified successfully! Credentials decrypted below.');
      } else {
        setError(data.error || 'Incorrect OTP code. Please enter the exact 6 digits from SMS.');
      }
    } catch (err) {
      setError('Network error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1422] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onBackToHome) onBackToHome();
              else window.location.href = '/';
            }}
            className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Panel</span>
          </button>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            bharatpe_API
          </span>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Key className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">BharatPe Merchant Credentials</h1>
          <p className="text-xs text-gray-400">
            Enter registered mobile number and OTP to fetch your BharatPe Merchant ID and Token securely.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Phone Number */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Registered Phone Number (+91)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-gray-500">+91</span>
                <input
                  type="text"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="8795005604"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#070b14] border border-white/10 text-white font-mono text-sm font-bold focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              <span>Send Verification OTP</span>
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Enter 6-Digit SMS Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center tracking-[0.5em] px-4 py-3 rounded-xl bg-[#070b14] border border-teal-500/40 text-white font-mono text-xl font-black focus:outline-none focus:border-teal-400 transition-colors"
              />
              <p className="text-[11px] text-gray-500 text-center">
                OTP sent to +91 {phone}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Change Phone
              </button>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Verify & Get Credentials</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-xs text-teal-400 hover:underline cursor-pointer"
              >
                Resend OTP via SMS
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Result Box with Merchant ID and Token */}
        {step === 'result' && resultData && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>BharatPe Merchant Credentials Unlocked</span>
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  BharatPe Merchant ID (MID)
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070b14] border border-white/10 font-mono text-xs font-bold text-teal-300">
                  <span className="truncate select-all">{resultData.merchantId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resultData.merchantId, 'mid')}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                    title="Copy Merchant ID"
                  >
                    {copiedKey === 'mid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* BharatPe Token */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  BharatPe Token / API Secret
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070b14] border border-white/10 font-mono text-xs text-teal-300">
                  <span className="truncate select-all max-w-[200px]">
                    {showToken ? resultData.token : '••••••••••••••••••••••••••••'}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                      title={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resultData.token, 'token')}
                      className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                      title="Copy Token"
                    >
                      {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Merchant Details */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1">
                <div>
                  <span className="block font-bold text-gray-500">Merchant Name</span>
                  <span className="text-white font-bold">{resultData.merchantName}</span>
                </div>
                <div>
                  <span className="block font-bold text-gray-500">Linked VPA</span>
                  <span className="text-teal-400 font-mono truncate block">{resultData.vpa}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setResultData(null);
              }}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Lookup Another Phone Number
            </button>
          </div>
        )}

        <div className="pt-2 text-center text-[11px] text-gray-500">
          Protected by YouthSMM Secure Gateway & Mobile OTP Carrier Verification
        </div>
      </div>
    </div>
  );
};
