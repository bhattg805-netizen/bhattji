import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Edit3,
  CreditCard,
} from 'lucide-react';

interface AddFundsSectionProps {
  token: string;
  user: any;
  publicSettings: any;
  onRefreshProfile: () => void;
  isDarkMode: boolean;
  currency: string;
  formatAmount: (val: number) => string;
}

export const AddFundsSection: React.FC<AddFundsSectionProps> = ({
  token,
  user,
  publicSettings,
  onRefreshProfile,
  isDarkMode,
  formatAmount,
}) => {
  // Amount state (empty by default so user enters amount first)
  const [amount, setAmount] = useState<string>('');
  const [lockedAmount, setLockedAmount] = useState<number | null>(null);
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);

  // UTR & verification states
  const [utr, setUtr] = useState<string>('');
  const [orderRef, setOrderRef] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [pendingMsg, setPendingMsg] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [copiedText, setCopiedText] = useState<string>('');
  const [qrType, setQrType] = useState<'bharatpe' | 'dynamic'>('bharatpe');

  // BharatPe Merchant Details from Backend / Admin Settings
  const bharatpeMerchantName = publicSettings?.bharatpeMerchantName || publicSettings?.allUpiMerchantName || 'PRIYA';
  const bharatpeVpa = publicSettings?.bharatpeVpa || publicSettings?.allUpiVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype';

  // Fetch payments list
  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/user/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Step 1: User enters amount, then clicks "Generate QR" to show QR and UTR box
  const handleGenerateQr = async (customAmt?: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    setPendingMsg('');

    const amtToUse = customAmt !== undefined ? customAmt : parseFloat(amount);
    if (isNaN(amtToUse) || amtToUse < 10) {
      setErrorMsg('Please enter a valid deposit amount of at least ₹10.');
      return;
    }

    setGeneratingQr(true);
    setLockedAmount(amtToUse);
    setAmount(amtToUse.toString());

    try {
      const res = await fetch('/api/user/deposit/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amtToUse }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderRef(data.orderRef || `BPE-${Date.now().toString().slice(-6)}`);
      } else {
        setOrderRef(`BPE-${Date.now().toString().slice(-6)}`);
      }
    } catch (e) {
      setOrderRef(`BPE-${Date.now().toString().slice(-6)}`);
    } finally {
      setGeneratingQr(false);
      setIsQrGenerated(true);
    }
  };

  // Go back and edit amount
  const handleResetQr = () => {
    setIsQrGenerated(false);
    setLockedAmount(null);
    setUtr('');
    setErrorMsg('');
    setSuccessMsg('');
    setPendingMsg('');
  };

  // Dynamic UPI Payload for the active locked amount
  const activeAmountVal = lockedAmount || parseFloat(amount) || 10;
  const noteText = orderRef ? orderRef : `Deposit-${user?.id || 'User'}`;
  const activeUpiPayload = `upi://pay?pa=${encodeURIComponent(bharatpeVpa)}&pn=${encodeURIComponent(bharatpeMerchantName)}&am=${activeAmountVal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(noteText)}`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(activeUpiPayload)}`;
  const officialBharatPeQrUrl = publicSettings?.bharatpeQrUrl?.trim()
    ? publicSettings.bharatpeQrUrl.trim()
    : `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
        `upi://pay?pa=${encodeURIComponent(bharatpeVpa)}&pn=${encodeURIComponent(bharatpeMerchantName)}&cu=INR&tn=YouthSMM`
      )}`;

  // Step 2: Submit 12-Digit UTR for Automated Verification
  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setPendingMsg('');

    const depositAmt = lockedAmount || parseFloat(amount);
    if (isNaN(depositAmt) || depositAmt < 10) {
      setErrorMsg('Please enter a valid deposit amount (minimum ₹10).');
      return;
    }

    const cleanUtr = utr.trim().replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      setErrorMsg('Invalid UTR format. Bank Reference Number (UTR) must be exactly 12 digits from your UPI payment receipt.');
      return;
    }

    // Anti-fake checks
    const isRepeated = /^(\d)\1{11}$/.test(cleanUtr);
    const isSequential = '01234567890123456789'.includes(cleanUtr) || '98765432109876543210'.includes(cleanUtr);
    if (isRepeated || isSequential) {
      setErrorMsg('Fake or test UTR detected. Please enter your genuine 12-digit UPI bank reference number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/deposit/submit-utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderRef: orderRef || undefined,
          utr: cleanUtr,
          amount: depositAmt,
          paymentMethod: 'BharatPe UPI QR',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Payment could not be verified. Please check your UTR and try again.');
      } else if (data.isPending || data.status === 'pending') {
        setPendingMsg(data.message || `UTR #${cleanUtr} submitted successfully! Your payment is recorded and will be credited upon confirmation.`);
        setUtr('');
        onRefreshProfile();
        fetchPayments();
      } else {
        const addedAmount = data.amount ? `₹${data.amount}` : `₹${depositAmt}`;
        setSuccessMsg(data.message || `Payment Verified ✓ ${addedAmount} added successfully to your wallet!`);
        setUtr('');
        onRefreshProfile();
        fetchPayments();
      }
    } catch (err) {
      setErrorMsg('Network error while verifying UTR. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];
  const cleanUtrDigits = utr.trim().replace(/\D/g, '');

  return (
    <div className="w-full max-w-3xl mx-auto pb-12 space-y-6 min-w-0 animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-lg shadow-red-950/40 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
              Add Funds
            </h1>
            <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Enter amount to generate UPI QR code & submit 12-digit UTR for instant credit
            </p>
          </div>
        </div>

        {/* Current Balance Pill */}
        <div className={`px-4 py-2 rounded-2xl border flex items-center space-x-2.5 ${
          isDarkMode ? 'bg-[#1C1C1C] border-[#292929]' : 'bg-white border-gray-200'
        } shadow-xs`}>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your Balance:</span>
          <span className="font-mono font-black text-emerald-400 text-base">
            {formatAmount(user?.balance || 0)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED PAYMENT CARD                                                      */}
      {/* ========================================================================= */}
      <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200'} rounded-3xl p-5 sm:p-8 border w-full min-w-0 space-y-6`}>
        
        {/* Card Header Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-white/5">
          <span className="px-3.5 py-1.5 rounded-xl bg-[#FF3030]/15 text-[#FF3030] border border-[#FF3030]/30 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#FF3030]" />
            <span>BharatPe Instant UPI</span>
          </span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero Fee • Instant UTR Credit</span>
          </span>
        </div>

        {/* ======================================================================= */}
        {/* STAGE 1: ENTER AMOUNT (BEFORE QR IS GENERATED)                          */}
        {/* ======================================================================= */}
        {!isQrGenerated ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <label className={`block text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enter Deposit Amount (Minimum ₹10)
              </label>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-black text-gray-400 text-2xl pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="10"
                  step="any"
                  autoFocus
                  placeholder="Enter amount (e.g. 100)"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateQr();
                    }
                  }}
                  className={`w-full pl-11 pr-4 py-4 rounded-2xl font-mono font-black text-2xl focus:outline-none transition-all box-border ${
                    isDarkMode
                      ? 'bg-[#141414] border border-[#2A2A2A] focus:border-[#FF3030] text-white placeholder-gray-600'
                      : 'bg-gray-50 border border-gray-300 focus:border-[#FF3030] text-gray-900 placeholder-gray-400 shadow-xs'
                  }`}
                />
              </div>
            </div>

            {/* Quick Amount Shortcuts */}
            <div className="space-y-1.5">
              <span className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Quick Amount Shortcuts:
              </span>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setAmount(q.toString());
                      setErrorMsg('');
                    }}
                    className={`px-4 py-2.5 min-h-[44px] min-w-[70px] flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold font-mono transition-all cursor-pointer ${
                      amount === q.toString()
                        ? 'bg-[#FF3030] text-white shadow-md shadow-red-950/40 ring-2 ring-[#FF3030]/40'
                        : isDarkMode
                        ? 'bg-[#141414] border border-[#262626] text-gray-300 hover:border-[#FF3030] hover:text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-[#FF3030] shadow-xs'
                    }`}
                  >
                    +₹{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1 font-semibold leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Generate QR Button */}
            <button
              type="button"
              onClick={() => handleGenerateQr()}
              disabled={generatingQr || !amount || parseFloat(amount) < 10}
              className="w-full py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-xl shadow-red-950/50 bg-[#FF3030] hover:bg-[#E02424] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.01] active:scale-98"
            >
              {generatingQr ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                  <span>Generating QR Code...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 shrink-0" />
                  <span>Generate QR Code {amount && parseFloat(amount) >= 10 ? `(₹${parseFloat(amount).toFixed(2)})` : ''}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* ======================================================================= */
          /* STAGE 2: AMOUNT DALNE KE BAAD -> QR CODE AAYE + USI MEI NICHE UTR AAYE  */
          /* ======================================================================= */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Amount Summary Header with Change Amount Button */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
              isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Deposit Amount
                  </div>
                  <div className="font-mono font-black text-2xl text-emerald-400">
                    ₹{lockedAmount?.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetQr}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#1C1C1C] border-[#292929] text-gray-300 hover:text-white hover:border-[#FF3030]'
                    : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:border-[#FF3030] shadow-xs'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#FF3030]" />
                <span>Change Amount</span>
              </button>
            </div>

            {/* PART 1: QR CODE DISPLAY */}
            <div className={`p-5 sm:p-6 rounded-2xl border ${
              isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-teal-50/40 border-teal-200'
            } space-y-4`}>
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#FF4D4D] flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Scan QR & Pay Exactly ₹{lockedAmount?.toFixed(2)}</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  All UPI Apps Accepted
                </span>
              </div>

              {/* QR Mode Switcher */}
              <div className="flex justify-center">
                <div className={`p-1 rounded-xl border flex items-center space-x-1 ${
                  isDarkMode ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setQrType('bharatpe')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      qrType === 'bharatpe'
                        ? 'bg-[#FF3030] text-white shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    BharatPe Official QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrType('dynamic')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      qrType === 'dynamic'
                        ? 'bg-[#FF3030] text-white shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Dynamic UPI QR (₹{lockedAmount?.toFixed(0)})
                  </button>
                </div>
              </div>

              {/* QR Image Box */}
              <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white shadow-xl border-2 border-[#FF3030]/40 shrink-0 max-w-full group">
                  <img
                    src={qrType === 'bharatpe' ? officialBharatPeQrUrl : dynamicQrUrl}
                    alt={`BharatPe UPI QR for ₹${lockedAmount}`}
                    className="w-[230px] sm:w-[260px] h-auto object-contain rounded-xl mx-auto block"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-2 text-center flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold font-mono text-gray-700 bg-gray-100 px-3 py-0.5 rounded-full border border-gray-300">
                      Amount: ₹{lockedAmount?.toFixed(2)}
                    </span>
                    <div className="flex items-center space-x-1.5 pt-0.5">
                      <span className="text-[11px] font-mono font-bold text-gray-800 bg-gray-50 px-2.5 py-0.5 rounded-md border border-gray-300">
                        UPI: {bharatpeVpa}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(bharatpeVpa, 'vpa_copy')}
                        className="px-2 py-0.5 rounded-md bg-[#FF3030] text-white text-[10px] font-bold hover:bg-[#E02424] transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedText === 'vpa_copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText === 'vpa_copy' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-[#FF4D4D]">
                    Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app
                  </p>
                </div>

                {/* Direct Mobile UPI Link Button */}
                <div className="w-full max-w-sm pt-1">
                  <a
                    href={activeUpiPayload}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FF3030] hover:bg-[#E02424] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-red-950/40 transition-all text-center cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>Open in UPI App (Pay ₹{lockedAmount?.toFixed(2)})</span>
                  </a>
                </div>

                {/* UTR Input Box & Verification - In exact position where UPI ID/VPA card was */}
                <form onSubmit={handleVerifyPayment} className="w-full max-w-sm space-y-2.5 pt-1">
                  {/* Status Messages inside payment card */}
                  {errorMsg && (
                    <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2 animate-in fade-in text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1 font-semibold leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  {pendingMsg && (
                    <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start space-x-2 animate-in fade-in text-left">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <span className="min-w-0 flex-1 font-semibold leading-relaxed">{pendingMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start space-x-2 animate-in fade-in text-left">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1 font-bold leading-relaxed">{successMsg}</span>
                    </div>
                  )}

                  {/* Enter 12-digit UTR (with 0/12 counter) */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="Enter 12-digit UTR"
                      value={utr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setUtr(val);
                        setErrorMsg('');
                      }}
                      className={`w-full pl-4 pr-16 py-3 rounded-xl font-mono text-sm sm:text-base font-bold tracking-wider focus:outline-none transition-all ${
                        isDarkMode
                          ? 'bg-[#101010] border border-[#2A2A2A] focus:border-[#FF3030] text-white placeholder-gray-500'
                          : 'bg-white border border-gray-300 focus:border-[#FF3030] text-gray-900 placeholder-gray-400 shadow-xs'
                      }`}
                    />
                    <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold pointer-events-none select-none ${
                      cleanUtrDigits.length === 12
                        ? 'text-emerald-400'
                        : 'text-gray-400'
                    }`}>
                      {cleanUtrDigits.length}/12
                    </span>
                  </div>

                  {/* Verify UTR & Add ₹XX.XX to Wallet */}
                  <button
                    type="submit"
                    disabled={submitting || cleanUtrDigits.length !== 12}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white shadow-lg shadow-red-950/50 bg-[#FF3030] hover:bg-[#E02424] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.01] active:scale-98"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Verifying with BharatPe & Adding Funds...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>Verify UTR & Add ₹{lockedAmount?.toFixed(2)} to Wallet</span>
                      </>
                    )}
                  </button>

                  {/* Receipt Helper Guidance */}
                  <div className="flex items-center justify-center flex-wrap gap-1.5 text-[10.5px] text-gray-400 pt-0.5">
                    <span className="font-semibold text-gray-400">Where to find UTR:</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-medium">GPay: UPI txn ID</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-medium">PhonePe: UTR</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-medium">Paytm: UPI Ref</span>
                  </div>
                </form>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* RECENT DEPOSITS & VERIFICATION STATUS LEDGER                              */}
      {/* ========================================================================= */}
      <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200'} rounded-3xl p-5 sm:p-7 border space-y-4 w-full min-w-0`}>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
              Your Deposit History
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
              Real-time records of your UPI deposits and wallet credits
            </p>
          </div>
          <button
            onClick={fetchPayments}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isDarkMode ? 'bg-[#141414] border-[#282828] text-gray-300 hover:bg-[#202020]' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
            }`}
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto w-full max-w-full touch-scroll-x rounded-xl">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                isDarkMode ? 'border-[#282828] text-gray-400 bg-[#141414]' : 'border-gray-200 text-gray-600 bg-gray-50'
              }`}>
                <th className="px-4 py-3 rounded-l-xl">ID</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">12-Digit UTR</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Date & Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-[#262626]' : 'divide-gray-100'}`}>
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className={isDarkMode ? 'hover:bg-[#222222]' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3.5 font-mono text-gray-500">#{p.id}</td>
                    <td className={`px-4 py-3.5 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.paymentMethod || p.method || 'BharatPe UPI QR'}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[#FF4D4D]">{p.transactionId || '-'}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-400">+{formatAmount(p.amount)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {p.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {p.status === 'pending' && <Clock className="w-3 h-3" />}
                        {p.status === 'failed' && <XCircle className="w-3 h-3" />}
                        <span>{p.status === 'completed' ? 'Verified' : p.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500 text-xs">
                    No deposit transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
