import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  QrCode,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Settings,
  ExternalLink,
  Lock,
  Wallet,
  ArrowRight,
  Info,
  Radio,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface PaymentSettingsManagerProps {
  token: string;
  adminTheme: 'dark' | 'light' | 'espresso';
  panelSettings: any;
  setPanelSettings: React.Dispatch<React.SetStateAction<any>>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  onRefreshStats?: () => void;
}

export const PaymentSettingsManager: React.FC<PaymentSettingsManagerProps> = ({
  token,
  adminTheme,
  panelSettings,
  setPanelSettings,
  showSuccess,
  showError,
  onRefreshStats,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bharatpe' | 'phonepe' | 'paytm' | 'gpay' | 'autocredit' | 'mobile_otp'>('bharatpe');
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string>('');

  // Mobile OTP States
  const [otpPhone, setOtpPhone] = useState(panelSettings.bharatpePhone || '8795005604');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showSmsConfig, setShowSmsConfig] = useState(false);

  const cardBg =
    adminTheme === 'espresso'
      ? 'bg-[#1e1915] border-[#382d25]'
      : adminTheme === 'light'
      ? 'bg-white border-gray-200'
      : 'bg-[#15181E] border-[#272B33]';

  const innerBoxBg =
    adminTheme === 'espresso'
      ? 'bg-[#181411] border-[#382d25]'
      : adminTheme === 'light'
      ? 'bg-gray-50 border-gray-200'
      : 'bg-[#0b101f] border-white/5';

  const inputBg =
    adminTheme === 'light'
      ? 'bg-white border-gray-300 text-gray-900 focus:border-purple-600'
      : 'bg-[#070b14] border-white/10 text-white focus:border-pink-500';

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Save All Payment Settings to Backend
  const handleSaveAllSettings = async (customPayload?: any) => {
    setLoading(true);
    try {
      const payloadToSend = customPayload || panelSettings;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadToSend),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const mergedSettings = data.settings || payloadToSend;
        if (mergedSettings) {
          setPanelSettings(mergedSettings);
          try {
            localStorage.setItem('youthsmm_public_settings', JSON.stringify(mergedSettings));
            window.dispatchEvent(new CustomEvent('youthsmm_settings_updated'));
          } catch (_) {}
        }
        showSuccess(`BharatPe UPI ID updated to "${payloadToSend.bharatpeVpa || 'saved UPI'}" & QR generated! ✓`);
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || 'Failed to save payment settings.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error while saving settings.');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP to Phone
  const handleSendMobileOtp = async () => {
    const cleanNumber = otpPhone.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length !== 10) {
      showError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: cleanNumber }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        showSuccess(data.message || `Verification OTP sent to +91 ${cleanNumber} via SMS!`);
      } else {
        if (data.missingGateway) {
          setShowSmsConfig(true);
        }
        showError(data.error || 'Failed to send SMS OTP. Please check your SMS gateway keys.');
      }
    } catch (err) {
      showError('Network error sending OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyMobileOtp = async () => {
    const cleanNumber = otpPhone.replace(/\D/g, '').slice(-10);
    if (!otpCode || otpCode.length !== 6) {
      showError('Please enter the 6-digit OTP received on your mobile phone.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: cleanNumber,
          otp: otpCode,
          merchantName: panelSettings.bharatpeMerchantName,
          vpa: panelSettings.bharatpeVpa,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        showSuccess('Mobile Number verified & Merchant linked successfully! ✓');
        setOtpCode('');
        setOtpSent(false);
      } else {
        showError(data.error || 'Invalid OTP code. Please check your SMS and enter the exact 6 digits.');
      }
    } catch (err) {
      showError('Network error verifying OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Save Action */}
      <div className={`${cardBg} p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-teal-950/20 via-purple-950/20 to-blue-950/20`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <h2 className={`text-lg sm:text-xl font-black ${adminTheme === 'light' ? 'text-gray-900' : 'text-white'} tracking-tight`}>
                Payment Gateway & UPI Settings
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                All-in-One Manager
              </span>
            </div>
            <p className={`text-xs ${adminTheme === 'light' ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
              Configure BharatPe, PhonePe, Paytm, Google Pay, UPI VPAs, and Instant 12-digit UTR Auto-Credit
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSaveAllSettings()}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Payment Settings</span>
        </button>
      </div>

      {/* Navigation Tabs for Gateways */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
        {[
          { id: 'bharatpe', label: 'BharatPe UPI', icon: <span className="text-teal-400 font-bold font-mono">₹</span>, activeColor: 'border-teal-500 text-teal-400 bg-teal-500/10' },
          { id: 'phonepe', label: 'PhonePe UPI', icon: <span className="text-purple-400 font-bold font-mono">पे</span>, activeColor: 'border-purple-500 text-purple-400 bg-purple-500/10' },
          { id: 'paytm', label: 'Paytm UPI', icon: <span className="text-blue-400 font-bold font-mono">P</span>, activeColor: 'border-blue-500 text-blue-400 bg-blue-500/10' },
          { id: 'gpay', label: 'Google Pay & All UPI', icon: <CreditCard className="w-3.5 h-3.5 text-amber-400" />, activeColor: 'border-amber-500 text-amber-400 bg-amber-500/10' },
          { id: 'autocredit', label: 'Instant UTR Auto-Credit', icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, activeColor: 'border-yellow-500 text-yellow-400 bg-yellow-500/10' },
          { id: 'mobile_otp', label: 'Mobile OTP Verification', icon: <Smartphone className="w-3.5 h-3.5 text-pink-400" />, activeColor: 'border-pink-500 text-pink-400 bg-pink-500/10' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id
                ? tab.activeColor
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. BHARATPE UPI CONFIGURATION                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'bharatpe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 ${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                  ₹BP
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>BharatPe Dynamic UPI Gateway</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 uppercase font-mono">
                      Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Zero transaction fees • Instant peer-to-peer bank settlement</p>
                </div>
              </div>

              <select
                value={panelSettings.bharatpeStatus || 'linked'}
                onChange={e => setPanelSettings({ ...panelSettings, bharatpeStatus: e.target.value })}
                className="px-3 py-1.5 rounded-xl bg-[#0b101f] border border-teal-500/30 text-xs font-bold text-teal-300 focus:outline-none cursor-pointer"
              >
                <option value="linked">Enabled (Active)</option>
                <option value="unlinked">Disabled (Inactive)</option>
              </select>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    BharatPe Merchant ID (MID)
                  </label>
                  <input
                    type="text"
                    value={panelSettings.bharatpeMerchantId || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantId: e.target.value })}
                    placeholder="Enter Merchant ID"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Can also be set in Vercel BHARATPE_MERCHANT_ID</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    BharatPe API Token / Secret
                  </label>
                  <input
                    type="password"
                    value={panelSettings.bharatpeToken || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, bharatpeToken: e.target.value })}
                    placeholder="Enter API Token"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Can also be set in Vercel BHARATPE_TOKEN</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Registered Mobile (+91)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panelSettings.bharatpePhone || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, bharatpePhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="8795005604"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Merchant Display Name
                  </label>
                  <input
                    type="text"
                    value={panelSettings.bharatpeMerchantName || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantName: e.target.value })}
                    placeholder="PRIYA"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Linked UPI ID (VPA) for BharatPe QR
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={panelSettings.bharatpeVpa || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, bharatpeVpa: e.target.value })}
                    placeholder="BHARATPE2H0D0Q1Y4T29351@unitype"
                    className={`w-full px-4 py-2.5 pr-20 rounded-xl font-mono text-xs font-bold text-teal-400 focus:outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype', 'bpVpa')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-bold hover:bg-teal-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === 'bpVpa' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'bpVpa' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Custom Standee / QR Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={panelSettings.bharatpeQrUrl || ''}
                  onChange={e => setPanelSettings({ ...panelSettings, bharatpeQrUrl: e.target.value })}
                  placeholder="https://example.com/my-bharatpe-qr.jpg (Leave empty for dynamic auto-generation)"
                  className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                />
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveAllSettings()}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save BharatPe Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('mobile_otp')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all border border-white/10 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                  <span>Link via Phone OTP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Standee Preview Column */}
          <div className={`lg:col-span-5 ${cardBg} p-6 rounded-2xl border flex flex-col items-center justify-center space-y-4 shadow-xs`}>
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                Live Dynamic BharatPe Standee
              </span>
              <p className="text-xs text-gray-400 mt-1">This payload is generated for users on Checkout</p>
            </div>

            {/* Real BharatPe Standee Box */}
            <div className="w-56 rounded-[2rem] p-3.5 border border-[#02a08b]/30 shadow-2xl relative overflow-hidden flex flex-col items-center select-none" style={{ background: 'linear-gradient(171deg, #f26c5f 63%, #017f6e 63%)' }}>
              <div className="w-full text-center mb-2 pt-1">
                <div className="text-white text-[8px] tracking-[0.15em] uppercase font-bold text-center leading-none opacity-90 drop-shadow-sm mb-1">
                  Hai Yakeen
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-[#35cac0] flex items-center justify-center shadow-sm relative">
                    <span className="w-2 h-2 rounded-full border-[1.5px] border-white border-t-transparent border-l-transparent transform -rotate-45 -translate-y-[0.5px]"></span>
                  </span>
                  <span className="text-white text-sm font-extrabold tracking-tight drop-shadow-sm leading-none flex items-center">
                    <span>Bharat</span>
                    <span className="font-light opacity-95">Pe</span>
                  </span>
                </div>
              </div>

              <div className="w-full bg-white rounded-[1.25rem] p-3 flex flex-col items-center shadow-lg border border-white/10 z-10">
                <div className="text-center font-extrabold text-sm text-gray-950 tracking-wider uppercase mb-2 mt-0.5 leading-none">
                  {panelSettings.bharatpeMerchantName || 'PRIYA'}
                </div>

                <div className="w-32 h-32 border border-gray-100 rounded-xl p-1.5 flex items-center justify-center bg-white relative shadow-sm overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype'}&pn=${encodeURIComponent(
                        panelSettings.bharatpeMerchantName || 'PRIYA'
                      )}&am=100.00&cu=INR&tn=YouthSMM`
                    )}`}
                    alt="BharatPe QR Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 m-auto w-7 h-7 bg-white rounded-full flex items-center justify-center p-[1px] shadow-md border border-gray-100">
                    <div className="w-full h-full rounded-full bg-[#35cac0] flex items-center justify-center relative overflow-hidden">
                      <div className="flex flex-col space-y-[1px] w-3.5 transform rotate-[15deg] items-center">
                        <div className="w-3 h-[1px] bg-[#eb5e52] rounded-full"></div>
                        <div className="w-3 h-[1px] bg-[#003831] rounded-full"></div>
                        <div className="w-3 h-[1px] bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full py-1.5 px-2 rounded-lg bg-[#F8F9FA] border border-gray-200/60 flex items-center justify-center space-x-1.5 mt-2.5 shadow-inner">
                  <span className="text-[8px] font-extrabold text-[#0D233A] font-mono tracking-wide break-all text-center select-all leading-none">
                    {panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype'}
                  </span>
                </div>
              </div>

              <div className="w-full pt-2 flex flex-col items-center">
                <div className="text-[6px] text-white/80 font-bold uppercase tracking-wider mb-1">
                  Pay with any UPI App
                </div>
                <div className="flex items-center justify-center space-x-1.5">
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs text-[5px] font-bold text-[#002E6E]">Paytm</div>
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs text-[5px] font-bold text-[#1E88E5]">GPay</div>
                  <div className="w-4 h-4 rounded-full bg-[#5f259f] flex items-center justify-center shadow-xs text-[7px] font-bold text-white">पे</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHONEPE UPI CONFIGURATION                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'phonepe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 ${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-lg">
                  पे
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>PhonePe UPI Gateway & QR</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase font-mono">
                      Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Accept direct payments from PhonePe with instant UTR verification</p>
                </div>
              </div>

              <select
                value={panelSettings.phonepeStatus || 'enabled'}
                onChange={e => setPanelSettings({ ...panelSettings, phonepeStatus: e.target.value })}
                className="px-3 py-1.5 rounded-xl bg-[#0b101f] border border-purple-500/30 text-xs font-bold text-purple-300 focus:outline-none cursor-pointer"
              >
                <option value="enabled">Enabled (Active)</option>
                <option value="disabled">Disabled (Inactive)</option>
              </select>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    PhonePe Merchant Name
                  </label>
                  <input
                    type="text"
                    value={panelSettings.phonepeMerchantName || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepeMerchantName: e.target.value })}
                    placeholder="YouthSMM PhonePe"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    PhonePe Registered Mobile (+91)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panelSettings.phonepePhone || panelSettings.bharatpePhone || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepePhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="8795005604"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  PhonePe UPI ID (VPA)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={panelSettings.phonepeVpa || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepeVpa: e.target.value })}
                    placeholder="8795005604@ybl or yourbusiness@phonepe"
                    className={`w-full px-4 py-2.5 pr-20 rounded-xl font-mono text-xs font-bold text-purple-400 focus:outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(panelSettings.phonepeVpa || '8795005604@ybl', 'ppVpa')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === 'ppVpa' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'ppVpa' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    PhonePe Merchant MID (Optional)
                  </label>
                  <input
                    type="text"
                    value={panelSettings.phonepeMerchantId || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepeMerchantId: e.target.value })}
                    placeholder="PHONEPE_MID"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Custom PhonePe QR Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={panelSettings.phonepeQrUrl || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepeQrUrl: e.target.value })}
                    placeholder="https://example.com/phonepe-qr.png"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              {/* Bonus QR 2 Box */}
              <div className={`p-4 rounded-xl ${innerBoxBg} border space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="font-bold text-white text-xs">PhonePe Bonus QR (QR 2) Option</span>
                  </div>
                  <select
                    value={panelSettings.phonepeBonusStatus || 'enabled'}
                    onChange={e => setPanelSettings({ ...panelSettings, phonepeBonusStatus: e.target.value })}
                    className="px-2 py-1 rounded bg-[#070b14] border border-white/10 text-[11px] text-purple-300 font-bold focus:outline-none"
                  >
                    <option value="enabled">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-semibold">Bonus Percentage (%)</label>
                    <input
                      type="number"
                      value={panelSettings.phonepeBonusPercent || '2'}
                      onChange={e => setPanelSettings({ ...panelSettings, phonepeBonusPercent: e.target.value })}
                      placeholder="2"
                      className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-semibold">Min Amount for Bonus (₹)</label>
                    <input
                      type="number"
                      value={panelSettings.phonepeBonusMinAmount || '1000'}
                      onChange={e => setPanelSettings({ ...panelSettings, phonepeBonusMinAmount: e.target.value })}
                      placeholder="1000"
                      className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save PhonePe Settings</span>
              </button>
            </div>
          </div>

          {/* PhonePe QR Preview */}
          <div className={`lg:col-span-5 ${cardBg} p-6 rounded-2xl border flex flex-col items-center justify-center space-y-4 shadow-xs`}>
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                PhonePe Standee Preview
              </span>
              <p className="text-xs text-gray-400 mt-1">Rendered with PhonePe colors & VPA</p>
            </div>

            <div className="w-56 rounded-[2rem] p-4 bg-gradient-to-b from-[#5f259f] to-[#3d126b] border border-purple-500/40 shadow-2xl flex flex-col items-center select-none text-white">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#5f259f] font-bold text-base shadow-sm">
                  पे
                </div>
                <span className="text-base font-black tracking-tight">PhonePe</span>
              </div>

              <div className="w-full bg-white rounded-2xl p-3 flex flex-col items-center shadow-lg text-gray-950 mb-2">
                <div className="text-xs font-black uppercase tracking-wider mb-2 text-center text-gray-900">
                  {panelSettings.phonepeMerchantName || 'YouthSMM'}
                </div>
                <div className="w-32 h-32 border border-gray-200 rounded-xl p-1 bg-white flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${panelSettings.phonepeVpa || '8795005604@ybl'}&pn=${encodeURIComponent(
                        panelSettings.phonepeMerchantName || 'YouthSMM'
                      )}&cu=INR`
                    )}`}
                    alt="PhonePe QR"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2 text-[9px] font-mono font-bold text-purple-900 text-center break-all select-all bg-purple-50 px-2 py-1 rounded border border-purple-100 w-full">
                  {panelSettings.phonepeVpa || '8795005604@ybl'}
                </div>
              </div>

              <div className="text-[8px] text-white/80 font-bold uppercase tracking-widest mt-1">
                Accepted Here • Zero Extra Fee
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYTM UPI CONFIGURATION                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'paytm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 ${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                  Paytm
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Paytm All-in-One UPI</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase font-mono">
                      Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Accept payments via Paytm Wallet, UPI, and RuPay</p>
                </div>
              </div>

              <select
                value={panelSettings.paytmStatus || 'enabled'}
                onChange={e => setPanelSettings({ ...panelSettings, paytmStatus: e.target.value })}
                className="px-3 py-1.5 rounded-xl bg-[#0b101f] border border-blue-500/30 text-xs font-bold text-blue-300 focus:outline-none cursor-pointer"
              >
                <option value="enabled">Enabled (Active)</option>
                <option value="disabled">Disabled (Inactive)</option>
              </select>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Paytm Merchant Name
                  </label>
                  <input
                    type="text"
                    value={panelSettings.paytmMerchantName || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, paytmMerchantName: e.target.value })}
                    placeholder="YouthSMM Paytm"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Paytm Registered Mobile (+91)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panelSettings.paytmPhone || panelSettings.bharatpePhone || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, paytmPhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="8795005604"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Paytm UPI ID (VPA)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={panelSettings.paytmVpa || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, paytmVpa: e.target.value })}
                    placeholder="8795005604@paytm"
                    className={`w-full px-4 py-2.5 pr-20 rounded-xl font-mono text-xs font-bold text-blue-400 focus:outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(panelSettings.paytmVpa || '8795005604@paytm', 'paytmVpa')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === 'paytmVpa' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'paytmVpa' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Paytm Merchant MID (Optional)
                  </label>
                  <input
                    type="text"
                    value={panelSettings.paytmMerchantId || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, paytmMerchantId: e.target.value })}
                    placeholder="PAYTM_MID"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Custom Paytm QR Code URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={panelSettings.paytmQrUrl || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, paytmQrUrl: e.target.value })}
                    placeholder="https://example.com/paytm-qr.png"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Paytm Settings</span>
              </button>
            </div>
          </div>

          {/* Paytm Preview */}
          <div className={`lg:col-span-5 ${cardBg} p-6 rounded-2xl border flex flex-col items-center justify-center space-y-4 shadow-xs`}>
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Paytm Soundbox / Standee Preview
              </span>
              <p className="text-xs text-gray-400 mt-1">Accepts Paytm & all UPI applications</p>
            </div>

            <div className="w-56 rounded-[2rem] p-4 bg-gradient-to-b from-[#002E6E] to-[#00b9f5] border border-blue-400/40 shadow-2xl flex flex-col items-center select-none text-white">
              <div className="text-xl font-black italic tracking-tighter mb-2">
                Pay<span className="text-[#00b9f5]">tm</span>
              </div>

              <div className="w-full bg-white rounded-2xl p-3 flex flex-col items-center shadow-lg text-gray-950 mb-2">
                <div className="text-xs font-black uppercase tracking-wider mb-2 text-center text-gray-900">
                  {panelSettings.paytmMerchantName || 'YouthSMM'}
                </div>
                <div className="w-32 h-32 border border-gray-200 rounded-xl p-1 bg-white flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${panelSettings.paytmVpa || '8795005604@paytm'}&pn=${encodeURIComponent(
                        panelSettings.paytmMerchantName || 'YouthSMM'
                      )}&cu=INR`
                    )}`}
                    alt="Paytm QR"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2 text-[9px] font-mono font-bold text-blue-900 text-center break-all select-all bg-blue-50 px-2 py-1 rounded border border-blue-100 w-full">
                  {panelSettings.paytmVpa || '8795005604@paytm'}
                </div>
              </div>

              <div className="text-[8px] text-white font-bold uppercase tracking-wider mt-1">
                Zero Convenience Fee
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GOOGLE PAY & ALL UPI CONFIGURATION                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'gpay' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 ${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                  GPay
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Google Pay & Custom All-in-One UPI</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase font-mono">
                      Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Works seamlessly across BHIM, Cred, GPay, and all bank UPI apps</p>
                </div>
              </div>

              <select
                value={panelSettings.gpayStatus || 'enabled'}
                onChange={e => setPanelSettings({ ...panelSettings, gpayStatus: e.target.value })}
                className="px-3 py-1.5 rounded-xl bg-[#0b101f] border border-amber-500/30 text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
              >
                <option value="enabled">Enabled (Active)</option>
                <option value="disabled">Disabled (Inactive)</option>
              </select>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={panelSettings.gpayMerchantName || panelSettings.allUpiMerchantName || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, gpayMerchantName: e.target.value, allUpiMerchantName: e.target.value })}
                    placeholder="YouthSMM Google Pay"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Registered Mobile (+91)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panelSettings.gpayPhone || panelSettings.bharatpePhone || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, gpayPhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="8795005604"
                    className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  UPI ID (VPA)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={panelSettings.gpayVpa || panelSettings.allUpiVpa || ''}
                    onChange={e => setPanelSettings({ ...panelSettings, gpayVpa: e.target.value, allUpiVpa: e.target.value })}
                    placeholder="8795005604@okaxis or name@okhdfcbank"
                    className={`w-full px-4 py-2.5 pr-20 rounded-xl font-mono text-xs font-bold text-amber-400 focus:outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(panelSettings.gpayVpa || '8795005604@okaxis', 'gpayVpa')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === 'gpayVpa' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'gpayVpa' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Custom Static QR Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={panelSettings.gpayQrUrl || ''}
                  onChange={e => setPanelSettings({ ...panelSettings, gpayQrUrl: e.target.value })}
                  placeholder="https://example.com/my-gpay-qr.png"
                  className={`w-full px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                />
              </div>

              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Google Pay Settings</span>
              </button>
            </div>
          </div>

          {/* GPay Preview */}
          <div className={`lg:col-span-5 ${cardBg} p-6 rounded-2xl border flex flex-col items-center justify-center space-y-4 shadow-xs`}>
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Google Pay QR Preview
              </span>
              <p className="text-xs text-gray-400 mt-1">Universal UPI QR</p>
            </div>

            <div className="w-56 rounded-[2rem] p-4 bg-white border border-gray-200 shadow-2xl flex flex-col items-center select-none text-gray-950">
              <div className="flex items-center space-x-1.5 mb-3">
                <span className="text-blue-500 font-black text-base">G</span>
                <span className="text-red-500 font-black text-base">o</span>
                <span className="text-yellow-500 font-black text-base">o</span>
                <span className="text-blue-500 font-black text-base">g</span>
                <span className="text-green-500 font-black text-base">l</span>
                <span className="text-red-500 font-black text-base">e</span>
                <span className="text-gray-700 font-black text-base ml-1">Pay</span>
              </div>

              <div className="w-32 h-32 border border-gray-200 rounded-xl p-1 bg-white flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=${panelSettings.gpayVpa || '8795005604@okaxis'}&pn=${encodeURIComponent(
                      panelSettings.gpayMerchantName || 'YouthSMM'
                    )}&cu=INR`
                  )}`}
                  alt="GPay QR"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-3 text-[9px] font-mono font-bold text-gray-800 text-center break-all select-all bg-gray-100 px-2 py-1 rounded border border-gray-200 w-full">
                {panelSettings.gpayVpa || '8795005604@okaxis'}
              </div>

              <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                All Bank UPI Supported
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INSTANT UTR AUTO-CREDIT & SECURITY RULES                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'autocredit' && (
        <div className="space-y-6">
          <div className={`${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Instant 12-Digit UTR Auto-Credit Policy</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 uppercase font-mono">
                    Zero-Wait Engine
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">Determine how user balances are credited when submitting bank reference numbers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Mode Option 1: Instant Credit */}
              <div
                onClick={() => setPanelSettings({ ...panelSettings, instantUtrAutoCredit: 'enabled' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  (panelSettings.instantUtrAutoCredit || 'enabled') === 'enabled'
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                      ⚡
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Instant Auto-Credit (Recommended)</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">Immediate wallet top-up</div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    (panelSettings.instantUtrAutoCredit || 'enabled') === 'enabled'
                      ? 'border-emerald-400 bg-emerald-500 text-black'
                      : 'border-white/20'
                  }`}>
                    {(panelSettings.instantUtrAutoCredit || 'enabled') === 'enabled' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  As soon as a client submits their 12-digit UPI Bank Reference (UTR) number, the system verifies its authenticity, checks against duplicate entries, and credits their wallet balance <strong>instantly within 1 second</strong>!
                </p>
              </div>

              {/* Mode Option 2: Require Admin Approval */}
              <div
                onClick={() => setPanelSettings({ ...panelSettings, instantUtrAutoCredit: 'disabled' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  panelSettings.instantUtrAutoCredit === 'disabled'
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                      🛡️
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Require Manual Admin Approval</div>
                      <div className="text-[11px] text-amber-400 font-semibold">Holds deposit in pending status</div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    panelSettings.instantUtrAutoCredit === 'disabled'
                      ? 'border-amber-400 bg-amber-500 text-black'
                      : 'border-white/20'
                  }`}>
                    {panelSettings.instantUtrAutoCredit === 'disabled' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Submitted UTRs remain marked as <span className="text-amber-400 font-bold">Pending</span>. The administrator manually reviews the transaction and clicks "Approve" in the Payments Ledger before wallet funds are granted.
                </p>
              </div>
            </div>

            {/* Anti-Fraud Protections Information */}
            <div className={`p-4 rounded-xl ${innerBoxBg} border space-y-3`}>
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Automated Anti-Fraud Rules Active</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-gray-400">
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
                  <div className="text-white font-bold">12 Digits Only</div>
                  <div>Only exact 12-digit bank reference numbers are accepted.</div>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
                  <div className="text-white font-bold">No Duplicates</div>
                  <div>Every UTR can only be credited once across the entire platform.</div>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
                  <div className="text-white font-bold">Anti-Fake Filters</div>
                  <div>Repeating digits (111111111111) or sequences (123456789012) are automatically rejected.</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Auto-Credit Policy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MOBILE PHONE & OTP LINKING TOOL                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'mobile_otp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-8 ${cardBg} p-6 rounded-2xl border space-y-6 shadow-xs`}>
            <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Mobile OTP Merchant Linking Hub</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20 uppercase font-mono">
                    SMS Carrier Verification
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">Verify your Indian mobile number via OTP SMS to authenticate your UPI Merchant profile</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 flex items-start space-x-3 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <strong>How It Works:</strong> Enter your 10-digit registered mobile number. Click <strong>"Send OTP to Phone"</strong> to receive a 6-digit verification code directly via phone SMS. Enter the code below to authenticate and link your merchant setup.
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Admin Registered Mobile Number (+91)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-500">+91</span>
                    <input
                      type="text"
                      maxLength={10}
                      value={otpPhone}
                      onChange={e => setOtpPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="8795005604"
                      className={`w-full pl-12 pr-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-colors ${inputBg}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={otpLoading || otpPhone.length < 10}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-40 flex items-center space-x-2 shrink-0 cursor-pointer"
                  >
                    {otpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                    <span>{otpSent ? 'Resend OTP' : 'Send OTP to Phone'}</span>
                  </button>
                </div>
              </div>

              {/* OTP Input Section */}
              {otpSent && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span>OTP Dispatched via SMS to +91 {otpPhone}</span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    Please check your phone's SMS inbox and enter the 6-digit numeric verification code below:
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="______"
                      className="w-36 text-center tracking-[0.4em] px-3 py-2.5 rounded-xl bg-[#0b101f] border border-emerald-500/30 text-white text-lg font-black font-mono focus:outline-none focus:border-emerald-400"
                    />

                    <button
                      type="button"
                      onClick={handleVerifyMobileOtp}
                      disabled={otpLoading || otpCode.length !== 6}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
                    >
                      {otpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Verify & Link Merchant</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SMS Gateway Credentials Config */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSmsConfig(!showSmsConfig)}
                  className="text-xs text-gray-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-pink-400" />
                  <span>Configure Fast2SMS / 2Factor API Keys for Phone SMS Dispatch</span>
                </button>

                {showSmsConfig && (
                  <div className="mt-3 p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-3 animate-in fade-in">
                    <p className="text-[11px] text-gray-400">
                      If you have your own Fast2SMS or 2Factor account, enter the API key below to send OTPs directly from your account. You can also configure <code className="text-pink-400">FAST2SMS_API_KEY</code> in Vercel.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Fast2SMS API Key</label>
                        <input
                          type="password"
                          value={panelSettings.fast2smsApiKey || ''}
                          onChange={e => setPanelSettings({ ...panelSettings, fast2smsApiKey: e.target.value })}
                          placeholder="Fast2SMS API Key"
                          className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">2Factor API Key (Optional)</label>
                        <input
                          type="password"
                          value={panelSettings.twoFactorApiKey || ''}
                          onChange={e => setPanelSettings({ ...panelSettings, twoFactorApiKey: e.target.value })}
                          placeholder="2Factor API Key"
                          className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${inputBg}`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveAllSettings()}
                        className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Save SMS Keys
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Merchant Status Column */}
          <div className={`lg:col-span-4 ${cardBg} p-6 rounded-2xl border space-y-4 shadow-xs text-xs`}>
            <h4 className="font-bold text-white text-sm flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Current Linked Profile</span>
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Active Mobile</div>
                <div className="font-mono font-bold text-white text-sm mt-0.5">
                  +91 {panelSettings.bharatpePhone || '8795005604'}
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Merchant Name</div>
                <div className="font-bold text-white text-sm mt-0.5">
                  {panelSettings.bharatpeMerchantName || 'PRIYA'}
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Primary BharatPe VPA</div>
                <div className="font-mono font-bold text-teal-400 text-xs mt-0.5 break-all">
                  {panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype'}
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-300 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gateway Status: Active</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Ready to accept deposits. Funds will automatically credit on entering 12-digit UTR.
                </p>
              </div>

              <div className="pt-1">
                <a
                  href="/bharatpe_API"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open /bharatpe_API Lookup Tool</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
