"use client";

import React, { useState } from "react";
import {
  AddressBook,
  DeliveryAddress,
  getSavedAddresses,
  saveAddresses,
} from "@/lib/addresses";
import { toast } from "sonner";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (book: AddressBook) => void;
}

export function AddressModal({ isOpen, onClose, onSaved }: AddressModalProps) {
  const [addressBook, setAddressBook] = useState<AddressBook>(getSavedAddresses());
  const [activeTab, setActiveTab] = useState<"home" | "office">("home");

  if (!isOpen) return null;

  const current = addressBook[activeTab];

  const handleFieldChange = (field: keyof DeliveryAddress, value: string) => {
    setAddressBook((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const handleSetDefault = (tab: "home" | "office") => {
    setAddressBook((prev) => ({
      ...prev,
      defaultDestination: tab,
    }));
  };

  const handleSave = () => {
    saveAddresses(addressBook);
    toast.success("Delivery address settings saved!");
    if (onSaved) onSaved(addressBook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#1E3B2F] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#162E25] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B7A5A]/10 dark:bg-[#0B7A5A]/20 flex items-center justify-center text-[#0B7A5A] dark:text-[#3EE0A8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Delivery Addresses
              </h3>
              <p className="text-xs text-zinc-500">
                Configure your Home and Office destinations for 1-click agent shopping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#162E25] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center text-sm font-semibold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Home vs Office */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              activeTab === "home"
                ? "bg-[#0B7A5A] text-white border-[#0B7A5A] shadow-xs"
                : "bg-zinc-50 dark:bg-[#12241E] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#1E3B2F] hover:border-zinc-300"
            }`}
          >
            <span className="text-sm">🏠</span>
            <span>Home Address</span>
            {addressBook.defaultDestination === "home" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                activeTab === "home" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}>
                Default
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("office")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              activeTab === "office"
                ? "bg-[#0B7A5A] text-white border-[#0B7A5A] shadow-xs"
                : "bg-zinc-50 dark:bg-[#12241E] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#1E3B2F] hover:border-zinc-300"
            }`}
          >
            <span className="text-sm">🏢</span>
            <span>Office / Work</span>
            {addressBook.defaultDestination === "office" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                activeTab === "office" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}>
                Default
              </span>
            )}
          </button>
        </div>

        {/* Address Form Fields */}
        <div className="p-6 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Recipient Name / Attention
            </label>
            <input
              type="text"
              value={current.recipient}
              onChange={(e) => handleFieldChange("recipient", e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={current.street}
                onChange={(e) => handleFieldChange("street", e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Apt / Suite / Unit
              </label>
              <input
                type="text"
                value={current.unit || ""}
                onChange={(e) => handleFieldChange("unit", e.target.value)}
                placeholder="e.g. Suite 400"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={current.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="e.g. Springfield"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                State / Province
              </label>
              <input
                type="text"
                value={current.state}
                onChange={(e) => handleFieldChange("state", e.target.value)}
                placeholder="e.g. OR"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                ZIP / Postal Code
              </label>
              <input
                type="text"
                value={current.zip}
                onChange={(e) => handleFieldChange("zip", e.target.value)}
                placeholder="e.g. 97477"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#07130F] border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#0B7A5A]"
              />
            </div>
          </div>

          {/* Default Destination Toggle */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-[#162E25]">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              Make {activeTab === "home" ? "Home" : "Office"} my primary default address
            </span>
            <button
              type="button"
              onClick={() => handleSetDefault(activeTab)}
              className={`px-3 py-1 text-xs rounded-md font-medium border transition-colors cursor-pointer ${
                addressBook.defaultDestination === activeTab
                  ? "bg-[#0B7A5A]/10 text-[#0B7A5A] dark:text-[#3EE0A8] border-[#0B7A5A]/30"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {addressBook.defaultDestination === activeTab ? "✓ Active Default" : "Set as Default"}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-[#0A1712] border-t border-zinc-200 dark:border-[#162E25] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            Prompt tip: &quot;send to {activeTab}&quot;
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 dark:border-[#1E3B2F] rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#12241E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#0B7A5A] hover:bg-[#086147] active:bg-[#064d38] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Save Address Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
