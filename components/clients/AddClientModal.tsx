'use client';

import React, { useState } from 'react';
import { PackageType, PACKAGE_LABELS } from '@/types';
import { X } from 'lucide-react';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; logo: string; startDate: string; package: PackageType }) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('plus');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onAdd({
      name: name.trim(),
      logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=64`,
      startDate,
      package: selectedPackage
    });
    
    setName('');
    setStartDate('2026-01-01');
    setSelectedPackage('plus');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Yeni Müşteri Ekle</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Logo Preview */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              {name ? (
                <span className="text-2xl font-bold text-white">
                  {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-white/50">?</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Müşteri Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Örn: Nike"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Package Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Paket Seçimi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['vitrin', 'plus', 'premium'] as PackageType[]).map(pkg => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`
                    py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all
                    ${selectedPackage === pkg 
                      ? 'border-slate-900 bg-slate-900 text-white' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }
                  `}
                >
                  {PACKAGE_LABELS[pkg].replace(' Paket', '')}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {selectedPackage === 'vitrin' && 'Aylık: 4 Reels, 8 Post, 8 Story'}
              {selectedPackage === 'plus' && 'Aylık: 6 Reels, 12 Post, 12 Story'}
              {selectedPackage === 'premium' && 'Aylık: 10 Reels, 20 Post, 20 Story'}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Müşteri Ekle
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;
