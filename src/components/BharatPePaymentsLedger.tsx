import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Trash2,
  Copy,
  Check,
  Zap,
  TrendingUp,
  ShieldCheck,
  Ban,
  ArrowDownRight,
  Filter,
  Settings,
  Wallet
} from 'lucide-react';

interface BharatPePaymentsLedgerProps {
  token: string;
  adminTheme: 'dark' | 'light' | 'espresso';
  formatCurrency: (val: number) => string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  onRefreshStats?: () => void;
  onOpenPaymentSettings?: () => void;
}

export const BharatPePaymentsLedger: React.FC<BharatPePaymentsLedgerProps> = ({
  token,
  adminTheme,
  formatCurrency,
  showSuccess,
  showError,
  onRefreshStats,
  onOpenPaymentSettings,
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'cancelled'>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string>('');
  const [removingToday, setRemovingToday] = useState(false);

  const fetchPayments = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      } else {
        showError('Failed to load BharatPe payment records.');
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      showError('Network error while retrieving payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token]);

  const handleCopyUtr = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(''), 2000);
  };

  const handleApprovePayment = async (paymentId: number, amount: number) => {
    setUpdatingId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || `Payment #${paymentId} approved! ₹${amount} added to user wallet.`);
        setPayments(prev =>
          prev.map(p => (p.id === paymentId ? { ...p, status: 'completed' } : p))
        );
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || 'Failed to approve payment');
      }
    } catch (err) {
      showError('Network error approving payment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectPayment = async (paymentId: number) => {
    if (!window.confirm(`Are you sure you want to reject and mark payment #${paymentId} as failed?`)) return;
    setUpdatingId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || `Payment #${paymentId} marked as failed/rejected.`);
        setPayments(prev =>
          prev.map(p => (p.id === paymentId ? { ...p, status: 'failed' } : p))
        );
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || 'Failed to reject payment');
      }
    } catch (err) {
      showError('Network error rejecting payment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (paymentId: number, targetStatus: string) => {
    setUpdatingId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || `Payment #${paymentId} updated to ${targetStatus}`);
        setPayments(prev =>
          prev.map(p => (p.id === paymentId ? { ...p, status: data.status || targetStatus } : p))
        );
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || 'Failed to update payment status');
      }
    } catch (err) {
      showError('Network error updating payment status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm(`Are you sure you want to delete BharatPe payment record #${paymentId}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || `Payment #${paymentId} removed`);
        setPayments(prev => prev.filter(p => p.id !== paymentId));
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || 'Failed to delete payment record');
      }
    } catch (err) {
      showError('Network error deleting payment');
    }
  };

  const handleRemoveTodayPayments = async () => {
    const confirmation = window.prompt(
      'Type "REMOVE TODAY" to confirm deleting all payments added today and deducting their funds from user wallets:'
    );
    if (confirmation !== 'REMOVE TODAY') {
      if (confirmation !== null) showError('Action cancelled: Confirmation text did not match.');
      return;
    }

    setRemovingToday(true);
    try {
      const res = await fetch('/api/admin/payments/remove-today-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || "Successfully removed today's payments and deducted wallet funds.");
        fetchPayments();
        if (onRefreshStats) onRefreshStats();
      } else {
        showError(data.error || "Failed to remove today's payments.");
      }
    } catch (err) {
      showError('Network error while removing payments.');
    } finally {
      setRemovingToday(false);
    }
  };

  // Filter & Search Logic
  const filteredPayments = payments.filter(p => {
    const status = (p.status || 'pending').toLowerCase();
    const matchesFilter =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? status === 'completed' || status === 'success'
        : status === statusFilter;

    if (!matchesFilter) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const utr = String(p.transactionId || '').toLowerCase();
    const userEmail = String(p.userEmail || '').toLowerCase();
    const userName = String(p.userName || '').toLowerCase();
    const id = String(p.id || '');
    const amountStr = String(p.amount || '');

    return utr.includes(query) || userEmail.includes(query) || userName.includes(query) || id.includes(query) || amountStr.includes(query);
  });

  // Analytics Metrics
  const totalVolume = payments
    .filter(p => p.status === 'completed' || p.status === 'success')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const successCount = payments.filter(p => p.status === 'completed' || p.status === 'success').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;
  const cancelledCount = payments.filter(p => p.status === 'cancelled').length;

  const cardBg =
    adminTheme === 'espresso'
      ? 'bg-[#1e1915] border-[#382d25]'
      : adminTheme === 'light'
      ? 'bg-white border-gray-200'
      : 'bg-[#15181E] border-[#272B33]';

  const subCardBg =
    adminTheme === 'espresso'
      ? 'bg-[#181411] border-[#382d25]'
      : adminTheme === 'light'
      ? 'bg-gray-50 border-gray-200'
      : 'bg-[#0f1216] border-[#272B33]';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`${cardBg} p-5 sm:p-6 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <h2 className={`text-lg sm:text-xl font-black ${adminTheme === 'light' ? 'text-gray-900' : 'text-white'} tracking-tight`}>
                BharatPe Payments Ledger
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Exclusive Gateway
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                UPI QR Gateway
              </span>
            </div>
            <p className={`text-xs ${adminTheme === 'light' ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
              Real-time audit log of all BharatPe UPI transactions, UTR numbers, and wallet reconciliations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0 flex-wrap gap-2">
          {onOpenPaymentSettings && (
            <button
              type="button"
              onClick={onOpenPaymentSettings}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Open Payment Gateways & QR Settings Hub"
            >
              <Wallet className="w-3.5 h-3.5 text-purple-400" />
              <span>Payment Settings (Gateways / OTP)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRemoveTodayPayments}
            disabled={removingToday}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Deducts funds added today from user wallets and deletes today's records"
          >
            {removingToday ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Remove Today's Payments</span>
          </button>

          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              adminTheme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
            }`}
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending Deposits Notice Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-white flex items-center space-x-2 flex-wrap gap-1">
                <span>{pendingCount} Payment{pendingCount > 1 ? 's' : ''} Awaiting Your Approval!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black">Action Required</span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Users have submitted UPI UTR numbers. Click "Approve" on any record below to credit their wallet balance immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 cursor-pointer shadow-xs ${
              statusFilter === 'pending'
                ? 'bg-amber-400 text-black'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {statusFilter === 'pending' ? '✓ Showing Pending Only' : `Filter Pending (${pendingCount})`}
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Verified Volume */}
        <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Total Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-emerald-400">
            {formatCurrency(totalVolume)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-semibold">From successful deposits</span>
        </div>

        {/* Success */}
        <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            <span>Success</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-emerald-400">
            {successCount}
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-semibold">Credited to wallet</span>
        </div>

        {/* Pending */}
        <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <span>Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-amber-400">
            {pendingCount}
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-semibold">Awaiting confirmation</span>
        </div>

        {/* Failed */}
        <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-red-400 uppercase tracking-wider">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-red-400">
            {failedCount}
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-semibold">Verification failed</span>
        </div>

        {/* Cancelled */}
        <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Cancelled</span>
            <Ban className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-gray-400">
            {cancelledCount}
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-semibold">Voided or expired</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`${cardBg} p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row items-center justify-between gap-3`}>
        {/* Status Pill Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 touch-scroll-x">
          {(
            [
              { id: 'all', label: 'All', count: payments.length },
              { id: 'completed', label: 'Success', count: successCount },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'failed', label: 'Failed', count: failedCount },
              { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === tab.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : adminTheme === 'light'
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by UTR, User, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
              adminTheme === 'light'
                ? 'bg-gray-50 border border-gray-200 focus:border-teal-600 text-gray-900'
                : 'bg-white/5 border border-white/10 focus:border-teal-500 text-white'
            }`}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`${cardBg} rounded-2xl border shadow-xs overflow-hidden`}>
        <div className="overflow-x-auto w-full touch-scroll-x">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                adminTheme === 'light'
                  ? 'bg-gray-50 text-gray-600 border-gray-200'
                  : 'bg-white/[0.02] text-gray-400 border-white/5'
              }`}>
                <th className="py-3.5 px-4">Txn ID</th>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">12-Digit UTR / Ref</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Current Status</th>
                <th className="py-3.5 px-4 text-right">Created At</th>
                <th className="py-3.5 px-4 text-center">Update Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filteredPayments.length > 0 ? (
                filteredPayments.map(p => {
                  const normalizedStatus = (p.status || 'pending').toLowerCase();
                  const isCompleted = normalizedStatus === 'completed' || normalizedStatus === 'success';
                  const isPending = normalizedStatus === 'pending';
                  const isFailed = normalizedStatus === 'failed';
                  const isCancelled = normalizedStatus === 'cancelled';

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        adminTheme === 'light' ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Payment ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-400">
                        #{p.id}
                      </td>

                      {/* User Details */}
                      <td className="py-3.5 px-4">
                        <div className={`font-bold ${adminTheme === 'light' ? 'text-gray-900' : 'text-white'} truncate max-w-[180px]`}>
                          {p.userName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px] font-mono">
                          {p.userEmail || `User #${p.userId}`}
                        </div>
                      </td>

                      {/* 12-Digit UTR with Copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-teal-400 select-all">
                            {p.transactionId || '-'}
                          </span>
                          {p.transactionId && (
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(p.transactionId)}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 transition-colors cursor-pointer"
                              title="Copy UTR"
                            >
                              {copiedUtr === p.transactionId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">
                          {p.paymentMethod || 'BharatPe UPI'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-400">
                        +{formatCurrency(Number(p.amount) || 0)}
                      </td>

                      {/* Current Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : isFailed
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}
                        >
                          {isCompleted && <CheckCircle className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          {isCancelled && <Ban className="w-3 h-3" />}
                          <span>{isCompleted ? 'Success' : normalizedStatus}</span>
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-gray-400 whitespace-nowrap">
                        {p.createdAt
                          ? `${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : '-'}
                      </td>

                      {/* Status Change Selector & Quick Approval */}
                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => handleApprovePayment(p.id, Number(p.amount) || 0)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Approve payment & add funds to user's wallet"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{updatingId === p.id ? 'Approving...' : `Approve (+${formatCurrency(Number(p.amount) || 0)})`}</span>
                            </button>

                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => handleRejectPayment(p.id)}
                              className="inline-flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Reject payment"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <select
                            disabled={updatingId === p.id}
                            value={isCompleted ? 'completed' : normalizedStatus}
                            onChange={e => handleUpdateStatus(p.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                                : isFailed
                                ? 'bg-red-950/30 text-red-300 border-red-500/30'
                                : 'bg-gray-900 text-gray-300 border-white/10'
                            }`}
                          >
                            <option value="completed" className="bg-[#15181E] text-emerald-400">
                              Success (Credit)
                            </option>
                            <option value="pending" className="bg-[#15181E] text-amber-400">
                              Pending
                            </option>
                            <option value="failed" className="bg-[#15181E] text-red-400">
                              Failed
                            </option>
                            <option value="cancelled" className="bg-[#15181E] text-gray-400">
                              Cancelled
                            </option>
                          </select>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete payment record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 text-xs font-medium">
                    {loading ? 'Fetching BharatPe payment records...' : 'No BharatPe payments match the selected criteria.'}
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
