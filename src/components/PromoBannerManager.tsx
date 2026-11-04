import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Gift,
  Zap,
  Tag,
  Wallet,
  Flame,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { DashboardBanner } from '../types.ts';

interface PromoBannerManagerProps {
  panelSettings: any;
  setPanelSettings: React.Dispatch<React.SetStateAction<any>>;
  token: string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

const THEME_PRESETS = [
  { id: 'purple', name: 'Royal Purple', classes: 'from-purple-800 via-indigo-700 to-purple-700', border: 'border-purple-500/40' },
  { id: 'emerald', name: 'Emerald Glow', classes: 'from-emerald-900 via-teal-800 to-emerald-700', border: 'border-emerald-500/40' },
  { id: 'rose', name: 'Crimson Flame', classes: 'from-rose-900 via-red-800 to-rose-700', border: 'border-rose-500/40' },
  { id: 'amber', name: 'Sunset Amber', classes: 'from-amber-800 via-orange-700 to-rose-700', border: 'border-amber-500/40' },
  { id: 'blue', name: 'Midnight Ocean', classes: 'from-blue-900 via-indigo-800 to-cyan-800', border: 'border-cyan-500/40' },
];

const ICON_OPTIONS = [
  { id: 'gift', name: 'Gift Box 🎁', icon: Gift },
  { id: 'sparkles', name: 'Sparkles ✨', icon: Sparkles },
  { id: 'zap', name: 'Lightning ⚡', icon: Zap },
  { id: 'flame', name: 'Hot Offer 🔥', icon: Flame },
  { id: 'tag', name: 'Discount 🏷️', icon: Tag },
  { id: 'wallet', name: 'Wallet 💳', icon: Wallet },
];

export const PromoBannerManager: React.FC<PromoBannerManagerProps> = ({
  panelSettings,
  setPanelSettings,
  token,
  showSuccess,
  showError,
}) => {
  // Parse banners from panelSettings
  const banners: DashboardBanner[] = useMemo(() => {
    if (panelSettings.dashboardBanners) {
      try {
        const parsed = typeof panelSettings.dashboardBanners === 'string'
          ? JSON.parse(panelSettings.dashboardBanners)
          : panelSettings.dashboardBanners;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    // Fallback: extract from existing single banner fields
    return [
      {
        id: 'banner-1',
        status: (panelSettings.bannerStatus as 'enabled' | 'disabled') || 'enabled',
        badge: panelSettings.bannerBadge || 'Add ₹1,000 & Get ₹100 Extra!',
        title: panelSettings.bannerTitle || 'Add ₹1,000 & Get ₹100 Extra! 🎁',
        subtitle: panelSettings.bannerSubtitle || 'Add ₹1,000 to your wallet and instantly receive ₹100 extra bonus',
        btnText: panelSettings.bannerBtnText || 'massege me',
        btnLink: panelSettings.bannerBtnLink || '8795005604',
        theme: 'purple',
        icon: 'gift',
      },
    ];
  }, [
    panelSettings.dashboardBanners,
    panelSettings.bannerStatus,
    panelSettings.bannerBadge,
    panelSettings.bannerTitle,
    panelSettings.bannerSubtitle,
    panelSettings.bannerBtnText,
    panelSettings.bannerBtnLink,
  ]);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<DashboardBanner>({
    id: '',
    status: 'enabled',
    badge: 'SPECIAL OFFER',
    title: 'Add ₹1,000 & Get ₹100 Extra! 🎁',
    subtitle: 'Add ₹1,000 to your wallet and instantly receive ₹100 extra bonus',
    btnText: 'massege me',
    btnLink: '8795005604',
    theme: 'purple',
    icon: 'gift',
  });

  // Open modal for creating new banner
  const handleAddNew = () => {
    setEditingBannerId(null);
    setFormData({
      id: `banner-${Date.now()}`,
      status: 'enabled',
      badge: 'LIMITED TIME DEAL',
      title: 'Mega Bonus Offer 🎁',
      subtitle: 'Add funds now and receive instant extra cashback to your wallet',
      btnText: 'Claim Now →',
      btnLink: '8795005604',
      theme: 'emerald',
      icon: 'sparkles',
    });
    setModalOpen(true);
  };

  // Open modal for editing existing banner
  const handleEdit = (banner: DashboardBanner) => {
    setEditingBannerId(banner.id);
    setFormData({
      ...banner,
      theme: banner.theme || 'purple',
      icon: banner.icon || 'gift',
    });
    setModalOpen(true);
  };

  // Save changes to state & backend
  const persistBanners = async (updatedList: DashboardBanner[]) => {
    setSaving(true);
    const bannersJson = JSON.stringify(updatedList);
    const activeBanners = updatedList.filter(b => b.status === 'enabled');
    const primaryBanner = activeBanners[0] || updatedList[0];

    const bannerPayload = {
      dashboardBanners: bannersJson,
      bannerStatus: activeBanners.length > 0 ? 'enabled' : 'disabled',
      bannerBadge: primaryBanner?.badge || '',
      bannerTitle: primaryBanner?.title || '',
      bannerSubtitle: primaryBanner?.subtitle || '',
      bannerBtnText: primaryBanner?.btnText || '',
      bannerBtnLink: primaryBanner?.btnLink || '',
    };

    // 1. Immediately update parent panelSettings state using functional update
    setPanelSettings((prev: any) => ({
      ...prev,
      ...bannerPayload,
    }));

    // 2. Immediately cache in localStorage for User Dashboard instant synchronization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('youthsmm_public_settings');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          'youthsmm_public_settings',
          JSON.stringify({ ...parsed, ...bannerPayload })
        );
        window.dispatchEvent(new Event('youthsmm_settings_updated'));
      } catch (_) {}
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bannerPayload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.settings) {
          setPanelSettings((prev: any) => ({ ...prev, ...data.settings }));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('youthsmm_settings_updated'));
        }
        showSuccess('Dashboard promo banner updated & saved successfully!');
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to save to database. Please check connection.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error saving banner settings.');
    } finally {
      setSaving(false);
    }
  };

  // Save form submission
  const handleFormSubmit = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      if ('preventDefault' in e && typeof e.preventDefault === 'function') e.preventDefault();
      if ('stopPropagation' in e && typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!formData.title.trim()) {
      showError('Banner title cannot be empty.');
      return;
    }

    let updatedList: DashboardBanner[];
    if (editingBannerId) {
      const exists = banners.some(b => b.id === editingBannerId);
      if (exists) {
        updatedList = banners.map(b => (b.id === editingBannerId ? { ...formData, id: editingBannerId } : b));
      } else {
        updatedList = [{ ...formData, id: editingBannerId }, ...banners];
      }
    } else {
      // Add new
      const newBanner: DashboardBanner = {
        ...formData,
        id: formData.id || `banner-${Date.now()}`,
      };
      updatedList = [...banners, newBanner];
    }

    setModalOpen(false);
    await persistBanners(updatedList);
  };

  // Toggle status of single banner
  const handleToggleStatus = async (bannerId: string) => {
    const updated = banners.map(b => {
      if (b.id === bannerId) {
        return {
          ...b,
          status: b.status === 'enabled' ? ('disabled' as const) : ('enabled' as const),
        };
      }
      return b;
    });
    await persistBanners(updated);
  };

  // Delete banner
  const handleDelete = async (bannerId: string) => {
    if (banners.length <= 1) {
      if (!confirm('This is the only banner. Are you sure you want to delete it?')) return;
      // Reset to empty fallback
      const emptyBanner: DashboardBanner = {
        id: `banner-${Date.now()}`,
        status: 'disabled',
        badge: '',
        title: '',
        subtitle: '',
        btnText: '',
        btnLink: '',
      };
      await persistBanners([emptyBanner]);
      return;
    }

    if (!confirm('Are you sure you want to delete this promotional banner?')) return;
    const updated = banners.filter(b => b.id !== bannerId);
    await persistBanners(updated);
  };

  // Move up or down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;
    const updated = [...banners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    await persistBanners(updated);
  };

  const getThemeGradient = (theme?: string) => {
    const found = THEME_PRESETS.find(t => t.id === theme);
    return found ? found.classes : THEME_PRESETS[0].classes;
  };

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      case 'zap':
        return <Zap className="w-5 h-5 text-yellow-300" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-red-300" />;
      case 'tag':
        return <Tag className="w-5 h-5 text-emerald-300" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-teal-300" />;
      case 'gift':
      default:
        return <Gift className="w-5 h-5 text-amber-300" />;
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
      {/* Header with "+ Add New Banner" button */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-white">Dashboard Promo Banners</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {banners.filter(b => b.status === 'enabled').length} Active
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Add new promotional banners or edit existing ones. Active banners rotate automatically on the user panel carousel.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Banner</span>
        </button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/10 text-gray-400 text-xs">
            <Layers className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <p>No banners configured yet.</p>
            <button
              type="button"
              onClick={handleAddNew}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer"
            >
              Create First Banner
            </button>
          </div>
        ) : (
          banners.map((banner, index) => {
            const isEnabled = banner.status === 'enabled';
            const themeGradient = getThemeGradient(banner.theme);

            return (
              <div
                key={banner.id || index}
                className={`p-4 rounded-2xl border transition-all ${
                  isEnabled
                    ? 'bg-[#0f1422] border-white/10 hover:border-purple-500/30'
                    : 'bg-[#0b0e17] border-white/5 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Live Visual Preview Card */}
                  <div
                    className={`flex-1 rounded-xl p-3.5 bg-gradient-to-r ${themeGradient} text-white shadow-md relative overflow-hidden flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-black/20 border border-white/20 flex items-center justify-center shrink-0">
                        {renderIcon(banner.icon)}
                      </div>
                      <div className="min-w-0">
                        {banner.badge && (
                          <div className="text-[9px] font-black uppercase tracking-wider text-purple-200 truncate">
                            {banner.badge}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm font-black tracking-tight truncate text-white">
                          {banner.title || 'Untitled Banner'}
                        </div>
                        {banner.subtitle && (
                          <div className="text-[11px] text-white/80 font-medium truncate">
                            {banner.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {banner.btnText && (
                      <div className="shrink-0">
                        <span className="px-3 py-1 rounded-full bg-white text-gray-900 font-extrabold text-[11px] shadow-sm whitespace-nowrap inline-block">
                          {banner.btnText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Management Controls */}
                  <div className="flex items-center justify-between lg:justify-end space-x-2 shrink-0">
                    {/* Status Pill / Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(banner.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-colors cursor-pointer ${
                        isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20'
                      }`}
                      title={isEnabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{isEnabled ? 'Active' : 'Disabled'}</span>
                    </button>

                    {/* Move Controls if multiple */}
                    {banners.length > 1 && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === banners.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    )}

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(banner)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(banner.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                      title="Delete banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target URL Info Pill */}
                {banner.btnLink && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                    <span className="flex items-center space-x-1 truncate">
                      <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>Target: <strong className="text-gray-300 font-mono">{banner.btnLink}</strong></span>
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {/^\+?\d{10,13}$/.test(banner.btnLink.replace(/[\s-]/g, '')) ? 'WhatsApp Direct Link' : 'Website/Action'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-[#121622] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Pinned Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 shrink-0 bg-[#121622]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                  {editingBannerId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">
                    {editingBannerId ? 'Edit Promo Banner' : 'Add New Promo Banner'}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    Configure the banner copy, action buttons, and color theme.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 min-h-0">
              {/* Live Interactive Preview */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Live Preview (Real-Time Look)
                </label>
                <div
                  className={`rounded-2xl p-4 bg-gradient-to-r ${getThemeGradient(formData.theme)} text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center shrink-0">
                      {renderIcon(formData.icon)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200">
                        {formData.badge || 'PROMO BADGE'}
                      </div>
                      <div className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                        {formData.title || 'Your Banner Title Here'}
                      </div>
                      <div className="text-xs text-white/80 font-medium mt-0.5">
                        {formData.subtitle || 'Your promotional subtitle and discount details'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <span className="px-4 py-2 rounded-full bg-white text-gray-900 font-extrabold text-xs shadow-md inline-block">
                      {formData.btnText || 'Action →'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Banner Visibility
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'enabled' | 'disabled' })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="enabled">Enabled (Visible on Panel)</option>
                      <option value="disabled">Disabled (Hidden)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Banner Badge Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Add ₹1,000 & Get ₹100 Extra!"
                      value={formData.badge}
                      onChange={e => setFormData({ ...formData, badge: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                    Banner Main Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Add ₹1,000 & Get ₹100 Extra! 🎁"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                    Banner Subtitle / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Add ₹1,000 to your wallet and instantly receive ₹100 extra bonus"
                    value={formData.subtitle}
                    onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Action Button Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. massege me or Claim Bonus →"
                      value={formData.btnText}
                      onChange={e => setFormData({ ...formData, btnText: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Action Target / URL or Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8795005604 (WhatsApp) or affiliate or https://..."
                      value={formData.btnLink}
                      onChange={e => setFormData({ ...formData, btnLink: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Theme & Icon Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Gradient Color Theme
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {THEME_PRESETS.map(theme => (
                        <button
                          type="button"
                          key={theme.id}
                          onClick={() => setFormData({ ...formData, theme: theme.id as any })}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            formData.theme === theme.id
                              ? 'border-white ring-2 ring-purple-500 bg-white/10'
                              : 'border-white/10 hover:border-white/30 bg-black/20'
                          }`}
                        >
                          <div className={`h-4 rounded bg-gradient-to-r ${theme.classes} mb-1`} />
                          <span className="text-[10px] text-gray-300 font-bold block truncate">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                      Banner Icon
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ICON_OPTIONS.map(opt => (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => setFormData({ ...formData, icon: opt.id as any })}
                          className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                            formData.icon === opt.id
                              ? 'border-purple-500 ring-2 ring-purple-500/40 bg-purple-500/20 text-white'
                              : 'border-white/10 hover:border-white/30 bg-black/20 text-gray-400'
                          }`}
                        >
                          <opt.icon className="w-4 h-4 mb-0.5" />
                          <span className="text-[10px] font-bold block truncate">{opt.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Sticky Modal Footer - Always Visible and Clickable */}
            <div className="flex items-center justify-between border-t border-white/10 p-4 sm:p-5 shrink-0 bg-[#0f1422]">
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {editingBannerId ? 'Editing existing promo banner' : 'Creating new promo banner'}
              </span>
              <div className="flex items-center space-x-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : editingBannerId ? 'Save Changes' : '+ Add Banner'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
