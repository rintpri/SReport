import React, { useState } from 'react';
import { Building2, Check, Edit3, Plus, Trash2 } from 'lucide-react';
import { CompanyProfile, ProfileWorkspace } from '../types/esg';
import { createBlankEsgDataset } from '../data/initialEsgData';
import { Modal } from './UiPrimitives';

interface ProfileManagerModalProps {
  open: boolean;
  onClose: () => void;
  profiles: ProfileWorkspace[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (newProfile: ProfileWorkspace) => void;
  onUpdateProfileCompany: (id: string, company: CompanyProfile) => void;
  onDeleteProfile: (id: string) => void;
}

export const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
  open,
  onClose,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfileCompany,
  onDeleteProfile,
}) => {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateSource, setTemplateSource] = useState<'blank' | 'clone'>('clone');

  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [sektorUsaha, setSektorUsaha] = useState('');
  const [lokasiOperasional, setLokasiOperasional] = useState('');
  const [standarAcuan, setStandarAcuan] = useState(
    'GRI Universal Standards 2021 · POJK No. 51/POJK.03/2017'
  );
  const [ringkasanDireksi, setRingkasanDireksi] = useState('');
  const [prod2023, setProd2023] = useState('100000');
  const [prod2024, setProd2024] = useState('110000');
  const [prod2025, setProd2025] = useState('120000');

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const startCreate = () => {
    setMode('create');
    setEditingId(null);
    setNamaPerusahaan('');
    setSektorUsaha('Manufaktur & Industri Berkelanjutan');
    setLokasiOperasional('Jawa Barat, Indonesia');
    setStandarAcuan('GRI Universal Standards 2021 · POJK No. 51/POJK.03/2017');
    setRingkasanDireksi(
      'Komitmen perusahaan dalam menciptakan nilai ekonomi berkelanjutan, menjaga keselamatan kerja nol kecelakaan, dan menurunkan intensitas emisi.'
    );
    setProd2023('100000');
    setProd2024('110000');
    setProd2025('120000');
  };

  const startEdit = (profile: ProfileWorkspace) => {
    const c = profile.dataset.company;
    setMode('edit');
    setEditingId(profile.id);
    setNamaPerusahaan(c.namaPerusahaan);
    setSektorUsaha(c.sektorUsaha);
    setLokasiOperasional(c.lokasiOperasional);
    setStandarAcuan(c.standarAcuan);
    setRingkasanDireksi(c.ringkasanDireksi);
    setProd2023(String(c.volumeProduksiTon[2023]));
    setProd2024(String(c.volumeProduksiTon[2024]));
    setProd2025(String(c.volumeProduksiTon[2025]));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const company: CompanyProfile = {
      namaPerusahaan: namaPerusahaan.trim(),
      sektorUsaha: sektorUsaha.trim(),
      lokasiOperasional: lokasiOperasional.trim(),
      standarAcuan: standarAcuan.trim(),
      ringkasanDireksi: ringkasanDireksi.trim(),
      volumeProduksiTon: {
        2023: Number(prod2023) || 1,
        2024: Number(prod2024) || 1,
        2025: Number(prod2025) || 1,
      },
    };

    if (mode === 'create') {
      const baseDataset =
        templateSource === 'clone'
          ? {
              ...JSON.parse(JSON.stringify(activeProfile.dataset)),
              company,
            }
          : createBlankEsgDataset(company);

      const created: ProfileWorkspace = {
        id: `profile-${Date.now()}`,
        labelSingkat: company.namaPerusahaan,
        dataset: baseDataset,
      };
      onCreateProfile(created);
      onSwitchProfile(created.id);
    } else if (mode === 'edit' && editingId) {
      onUpdateProfileCompany(editingId, company);
    }

    setMode('list');
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setMode('list');
        onClose();
      }}
      title={
        mode === 'list'
          ? 'Kelola & Ganti Profil Perusahaan'
          : mode === 'create'
            ? 'Tambah Profil Perusahaan Baru'
            : 'Edit Profil Perusahaan'
      }
      subtitle={
        mode === 'list'
          ? 'Beralih antar entitas anak usaha atau kelola identitas pelapor Sustainability Report'
          : 'Lengkapi identitas perusahaan dan volume produksi tahunan'
      }
    >
      {mode === 'list' ? (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {profiles.map((prof) => {
              const isActive = prof.id === activeProfileId;
              return (
                <div
                  key={prof.id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-emerald-50/70 border-emerald-800'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchProfile(prof.id);
                      onClose();
                    }}
                    className="flex items-start gap-3 text-left flex-1 min-w-0"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isActive ? 'bg-emerald-900 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {isActive ? <Check className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-900 truncate">
                        {prof.dataset.company.namaPerusahaan}
                      </div>
                      <div className="text-xs text-stone-600 truncate">
                        {prof.dataset.company.sektorUsaha}
                      </div>
                      <div className="mt-1 text-[11px] text-stone-500">
                        {prof.spreadsheet
                          ? `Spreadsheet: ${prof.spreadsheet.spreadsheetTitle}`
                          : 'Belum terhubung ke Google Sheets'}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(prof)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"
                      aria-label={`Edit ${prof.dataset.company.namaPerusahaan}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteProfile(prof.id)}
                        className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-md"
                        aria-label={`Hapus ${prof.dataset.company.namaPerusahaan}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Profil Baru
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveForm} className="space-y-4">
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Basis Data Awal Profil
              </label>
              <select
                value={templateSource}
                onChange={(e) => setTemplateSource(e.target.value as 'blank' | 'clone')}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="clone">Salin struktur & contoh data dari profil aktif</option>
                <option value="blank">Mulai dengan data kosong (0)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Nama Perusahaan / Entitas
            </label>
            <input
              type="text"
              required
              value={namaPerusahaan}
              onChange={(e) => setNamaPerusahaan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Sektor Usaha</label>
              <input
                type="text"
                required
                value={sektorUsaha}
                onChange={(e) => setSektorUsaha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Lokasi Operasional
              </label>
              <input
                type="text"
                required
                value={lokasiOperasional}
                onChange={(e) => setLokasiOperasional(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Standar Acuan</label>
            <input
              type="text"
              required
              value={standarAcuan}
              onChange={(e) => setStandarAcuan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Produksi 2023 (Ton)
              </label>
              <input
                type="number"
                min={1}
                required
                value={prod2023}
                onChange={(e) => setProd2023(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Produksi 2024 (Ton)
              </label>
              <input
                type="number"
                min={1}
                required
                value={prod2024}
                onChange={(e) => setProd2024(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Produksi 2025 (Ton)
              </label>
              <input
                type="number"
                min={1}
                required
                value={prod2025}
                onChange={(e) => setProd2025(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Ringkasan Pernyataan Direksi
            </label>
            <textarea
              rows={2}
              required
              value={ringkasanDireksi}
              onChange={(e) => setRingkasanDireksi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMode('list')}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Kembali
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              {mode === 'create' ? 'Buat Profil' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
