import React, { useState } from 'react';
import { Award, Download, Edit3, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { CertificationAward, ReportYear } from '../../types/esg';
import { exportToCSV } from '../../utils/formatters';
import { KpiCard, Modal, SectionHeader, StatusText } from '../UiPrimitives';

interface PenghargaanSectionProps {
  items: CertificationAward[];
  year: ReportYear;
  onAddItem: (item: CertificationAward) => void;
  onUpdateItem: (item: CertificationAward) => void;
  onDeleteItem: (id: string) => void;
}

export const PenghargaanSection: React.FC<PenghargaanSectionProps> = ({
  items,
  year,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [filterTipe, setFilterTipe] = useState<'Semua' | 'Sertifikasi' | 'Penghargaan'>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [tipe, setTipe] = useState<'Sertifikasi' | 'Penghargaan'>('Sertifikasi');
  const [nama, setNama] = useState('');
  const [nomorSertifikat, setNomorSertifikat] = useState('');
  const [lembagaPenerbit, setLembagaPenerbit] = useState('');
  const [ruangLingkup, setRuangLingkup] = useState('');
  const [masaBerlaku, setMasaBerlaku] = useState('2027');
  const [status, setStatus] = useState<CertificationAward['status']>('Aktif');

  const openAddModal = () => {
    setEditingId(null);
    setTipe('Sertifikasi');
    setNama('');
    setNomorSertifikat('');
    setLembagaPenerbit('');
    setRuangLingkup('');
    setMasaBerlaku('2027');
    setStatus('Aktif');
    setModalOpen(true);
  };

  const openEditModal = (item: CertificationAward) => {
    setEditingId(item.id);
    setTipe(item.tipe);
    setNama(item.nama);
    setNomorSertifikat(item.nomorSertifikat);
    setLembagaPenerbit(item.lembagaPenerbit);
    setRuangLingkup(item.ruangLingkup);
    setMasaBerlaku(item.masaBerlaku);
    setStatus(item.status);
    setModalOpen(true);
  };

  const filtered =
    filterTipe === 'Semua' ? items : items.filter((i) => i.tipe === filterTipe);

  const totalCerts = items.filter((i) => i.tipe === 'Sertifikasi').length;
  const totalAwards = items.filter((i) => i.tipe === 'Penghargaan').length;
  const activeIso = items.filter((i) => i.nama.toUpperCase().includes('ISO')).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CertificationAward = {
      id: editingId || `cert-${Date.now()}`,
      year,
      tipe,
      nama: nama.trim(),
      nomorSertifikat: nomorSertifikat.trim(),
      lembagaPenerbit: lembagaPenerbit.trim(),
      ruangLingkup: ruangLingkup.trim(),
      masaBerlaku: masaBerlaku.trim(),
      status,
    };
    if (editingId) {
      onUpdateItem(payload);
    } else {
      onAddItem(payload);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `Sertifikasi_Penghargaan_${year}.csv`,
      ['Tahun', 'Tipe', 'Nama Sertifikasi / Penghargaan', 'Nomor', 'Lembaga Penerbit', 'Ruang Lingkup', 'Masa Berlaku', 'Status'],
      filtered.map((c) => [
        c.year,
        c.tipe,
        c.nama,
        c.nomorSertifikat,
        c.lembagaPenerbit,
        c.ruangLingkup,
        c.masaBerlaku,
        c.status,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="09 / SERTIFIKASI & PENGHARGAAN"
        title="Penghargaan dan Sertifikasi (ISO, SMK3, PROPER & Apresiasi ESG)"
        subtitle="Daftar sertifikasi sistem manajemen internasional (ISO), kepatuhan regulasi K3/lingkungan nasional, serta penghargaan keberlanjutan yang masih berlaku maupun diperoleh."
        standardRef="GRI 2-23 · ISO 9001 / 14001 / 45001 / 50001"
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Sertifikasi / Award
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Sertifikasi Aktif"
          value={String(totalCerts)}
          unit="Sertifikat"
          context={`${activeIso} standar ISO internasional terverifikasi`}
          tone="positive"
        />
        <KpiCard
          label="Penghargaan Diterima"
          value={String(totalAwards)}
          unit="Penghargaan"
          context="PROPER KLHK, Zero Accident & Indonesia Green Awards"
          tone="positive"
        />
        <KpiCard
          label="Kepatuhan Audit Eksternal"
          value="100%"
          context="Seluruh sertifikasi melalui audit pihak ketiga terakreditasi"
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Registri Sertifikasi & Penghargaan Perusahaan
          </h2>
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg no-print">
            {(['Semua', 'Sertifikasi', 'Penghargaan'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTipe(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterTipe === t
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between hover:bg-stone-50/70 transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 bg-stone-100 text-emerald-900 rounded-lg shrink-0 mt-0.5">
                  {item.tipe === 'Sertifikasi' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="font-semibold text-stone-700">{item.tipe}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{item.nomorSertifikat}</span>
                    <span aria-hidden="true">·</span>
                    <span>Tahun {item.year}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900">{item.nama}</h3>
                  <p className="text-xs text-stone-600">
                    Penerbit: <span className="font-medium text-stone-800">{item.lembagaPenerbit}</span> · Ruang Lingkup: {item.ruangLingkup}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                <StatusText tone="positive" label={item.status} />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-stone-500 whitespace-nowrap">
                    Berlaku: {item.masaBerlaku}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1 text-stone-400 hover:text-emerald-900 rounded no-print"
                    aria-label={`Edit ${item.nama}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-stone-400 hover:text-red-700 rounded no-print"
                    aria-label={`Hapus ${item.nama}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Sertifikasi atau Penghargaan' : 'Tambah Sertifikasi atau Penghargaan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Jenis</label>
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value as 'Sertifikasi' | 'Penghargaan')}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Sertifikasi">Sertifikasi</option>
                <option value="Penghargaan">Penghargaan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CertificationAward['status'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Aktif">Aktif</option>
                <option value="Dalam Perpanjangan">Dalam Perpanjangan</option>
                <option value="Diterima">Diterima</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nomor Sertifikat / SK</label>
            <input
              type="text"
              required
              placeholder="ISO-2025-001"
              value={nomorSertifikat}
              onChange={(e) => setNomorSertifikat(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nama Sertifikasi / Penghargaan</label>
            <input
              type="text"
              required
              placeholder="Contoh: ISO 27001:2022 — Keamanan Informasi"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Lembaga Penerbit</label>
            <input
              type="text"
              required
              value={lembagaPenerbit}
              onChange={(e) => setLembagaPenerbit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Ruang Lingkup</label>
              <input
                type="text"
                required
                value={ruangLingkup}
                onChange={(e) => setRuangLingkup(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Masa Berlaku</label>
              <input
                type="text"
                required
                value={masaBerlaku}
                onChange={(e) => setMasaBerlaku(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
