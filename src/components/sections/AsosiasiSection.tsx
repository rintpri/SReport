import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { AssociationMembership, ReportYear } from '../../types/esg';
import { exportToCSV } from '../../utils/formatters';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface AsosiasiSectionProps {
  items: AssociationMembership[];
  year: ReportYear;
  onAddItem: (item: AssociationMembership) => void;
  onUpdateItem: (item: AssociationMembership) => void;
  onDeleteItem: (id: string) => void;
}

export const AsosiasiSection: React.FC<AsosiasiSectionProps> = ({
  items,
  year,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [filterTingkat, setFilterTingkat] = useState<'Semua' | 'Daerah' | 'Nasional' | 'Internasional'>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [namaAsosiasi, setNamaAsosiasi] = useState('');
  const [singkatan, setSingkatan] = useState('');
  const [tingkat, setTingkat] = useState<AssociationMembership['tingkat']>('Nasional');
  const [peran, setPeran] = useState<AssociationMembership['peran']>('Anggota Aktif');
  const [tahunBergabung, setTahunBergabung] = useState('2022');
  const [bidangFokus, setBidangFokus] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setNamaAsosiasi('');
    setSingkatan('');
    setTingkat('Nasional');
    setPeran('Anggota Aktif');
    setTahunBergabung('2022');
    setBidangFokus('');
    setModalOpen(true);
  };

  const openEditModal = (item: AssociationMembership) => {
    setEditingId(item.id);
    setNamaAsosiasi(item.namaAsosiasi);
    setSingkatan(item.singkatan);
    setTingkat(item.tingkat);
    setPeran(item.peran);
    setTahunBergabung(String(item.tahunBergabung));
    setBidangFokus(item.bidangFokus);
    setModalOpen(true);
  };

  const filtered =
    filterTingkat === 'Semua' ? items : items.filter((a) => a.tingkat === filterTingkat);

  const pengurusCount = items.filter((a) => a.peran !== 'Anggota Aktif').length;
  const intlCount = items.filter((a) => a.tingkat === 'Internasional').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AssociationMembership = {
      id: editingId || `aso-${Date.now()}`,
      year,
      namaAsosiasi: namaAsosiasi.trim(),
      singkatan: singkatan.trim(),
      tingkat,
      peran,
      tahunBergabung: Number(tahunBergabung) || year,
      bidangFokus: bidangFokus.trim(),
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
      `Keanggotaan_Asosiasi_${year}.csv`,
      ['Singkatan', 'Nama Asosiasi', 'Tingkat', 'Peran Perusahaan', 'Tahun Bergabung', 'Bidang Fokus'],
      filtered.map((a) => [
        a.singkatan,
        a.namaAsosiasi,
        a.tingkat,
        a.peran,
        a.tahunBergabung,
        a.bidangFokus,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="10 / KEANGGOTAAN ASOSIASI & JEJARING INDUSTRI"
        title="Keanggotaan Asosiasi Industri dan Organisasi Keberlanjutan"
        subtitle="Partisipasi aktif perusahaan dalam asosiasi pengusaha, kamar dagang, forum K3, serta jejaring keberlanjutan di tingkat daerah, nasional, dan internasional."
        standardRef="GRI 2-28 · POJK 51/2017"
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
              Tambah Asosiasi
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Keanggotaan Aktif"
          value={String(items.length)}
          unit="Asosiasi"
          context="Mencakup jejaring daerah, nasional & global"
        />
        <KpiCard
          label="Peran Pengurus / Komite Teknis"
          value={String(pengurusCount)}
          unit="Organisasi"
          context="Kontribusi langsung dalam perumusan standar industri"
          tone="positive"
        />
        <KpiCard
          label="Jejaring Internasional"
          value={String(intlCount)}
          unit="Organisasi"
          context="Keterlibatan dalam inisiatif SDGs & UN Global Compact"
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Daftar Keanggotaan Asosiasi
          </h2>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg no-print">
            {(['Semua', 'Daerah', 'Nasional', 'Internasional'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTingkat(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterTingkat === t
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Asosiasi / Organisasi</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Peran Perusahaan</th>
                <th className="py-3 px-4 text-right">Sejak Tahun</th>
                <th className="py-3 px-4">Bidang Fokus & Kontribusi</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-stone-900">{item.singkatan}</div>
                    <div className="text-xs text-stone-500">{item.namaAsosiasi}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-stone-700 whitespace-nowrap">
                    {item.tingkat}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-emerald-900 whitespace-nowrap">
                    {item.peran}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {item.tahunBergabung}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-stone-600 max-w-md">
                    {item.bidangFokus}
                  </td>
                  <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                      aria-label={`Edit ${item.namaAsosiasi}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                      aria-label={`Hapus ${item.namaAsosiasi}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Keanggotaan Asosiasi' : 'Tambah Keanggotaan Asosiasi'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">Nama Lengkap Asosiasi</label>
              <input
                type="text"
                required
                value={namaAsosiasi}
                onChange={(e) => setNamaAsosiasi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Singkatan</label>
              <input
                type="text"
                required
                value={singkatan}
                onChange={(e) => setSingkatan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Tingkat</label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value as AssociationMembership['tingkat'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Daerah">Daerah</option>
                <option value="Nasional">Nasional</option>
                <option value="Internasional">Internasional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Peran</label>
              <select
                value={peran}
                onChange={(e) => setPeran(e.target.value as AssociationMembership['peran'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Anggota Aktif">Anggota Aktif</option>
                <option value="Pengurus / Dewan">Pengurus / Dewan</option>
                <option value="Komite Teknis ESG">Komite Teknis ESG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Tahun Bergabung</label>
              <input
                type="number"
                min={1980}
                max={2030}
                required
                value={tahunBergabung}
                onChange={(e) => setTahunBergabung(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Bidang Fokus & Kontribusi</label>
            <textarea
              rows={2}
              required
              value={bidangFokus}
              onChange={(e) => setBidangFokus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
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
              Simpan Asosiasi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
