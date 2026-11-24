import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { CsrPillar, CsrProgram, ReportYear } from '../../types/esg';
import { exportToCSV, formatIDR, formatIDRCompact, formatNumber } from '../../utils/formatters';
import { HorizontalBarList, MultiYearBarChart } from '../Charts';
import { KpiCard, Modal, SectionHeader, StatusText } from '../UiPrimitives';

interface CsrSectionProps {
  programs: CsrProgram[];
  year: ReportYear;
  onAddProgram: (program: CsrProgram) => void;
  onUpdateProgram: (program: CsrProgram) => void;
  onDeleteProgram: (id: string) => void;
}

const PILAR_LIST: CsrPillar[] = [
  'Pendidikan',
  'Ekonomi & UMKM',
  'Kesehatan',
  'Lingkungan',
  'Sosial & Infrastruktur',
];

export const CsrSection: React.FC<CsrSectionProps> = ({
  programs,
  year,
  onAddProgram,
  onUpdateProgram,
  onDeleteProgram,
}) => {
  const [filterPilar, setFilterPilar] = useState<'Semua' | CsrPillar>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [namaProgram, setNamaProgram] = useState('');
  const [pilar, setPilar] = useState<CsrPillar>('Pendidikan');
  const [lokasi, setLokasi] = useState('');
  const [anggaranRp, setAnggaranRp] = useState('500000000');
  const [realisasiRp, setRealisasiRp] = useState('485000000');
  const [penerimaManfaat, setPenerimaManfaat] = useState('250');
  const [satuanPenerima, setSatuanPenerima] = useState('Penerima Manfaat');
  const [status, setStatus] = useState<'Selesai' | 'Berjalan'>('Selesai');

  const openAddModal = () => {
    setEditingId(null);
    setNamaProgram('');
    setPilar('Pendidikan');
    setLokasi('');
    setAnggaranRp('500000000');
    setRealisasiRp('485000000');
    setPenerimaManfaat('250');
    setSatuanPenerima('Penerima Manfaat');
    setStatus('Selesai');
    setModalOpen(true);
  };

  const openEditModal = (item: CsrProgram) => {
    setEditingId(item.id);
    setNamaProgram(item.namaProgram);
    setPilar(item.pilar);
    setLokasi(item.lokasi);
    setAnggaranRp(String(item.anggaranRp));
    setRealisasiRp(String(item.realisasiRp));
    setPenerimaManfaat(String(item.penerimaManfaat));
    setSatuanPenerima(item.satuanPenerima);
    setStatus(item.status);
    setModalOpen(true);
  };

  const yearPrograms = programs.filter((p) => p.year === year);
  const filteredPrograms =
    filterPilar === 'Semua'
      ? yearPrograms
      : yearPrograms.filter((p) => p.pilar === filterPilar);

  const totalAnggaran = yearPrograms.reduce((acc, p) => acc + p.anggaranRp, 0);
  const totalRealisasi = yearPrograms.reduce((acc, p) => acc + p.realisasiRp, 0);
  const penyerapanPct = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

  const pilarSummary = PILAR_LIST.map((pl) => ({
    label: pl,
    value: yearPrograms
      .filter((p) => p.pilar === pl)
      .reduce((acc, p) => acc + p.realisasiRp, 0),
  }));

  const multiYearData = ([2023, 2024, 2025] as ReportYear[]).map((y) => ({
    year: y,
    value:
      programs.filter((p) => p.year === y).reduce((acc, p) => acc + p.anggaranRp, 0) /
      1_000_000_000,
    secondaryValue:
      programs.filter((p) => p.year === y).reduce((acc, p) => acc + p.realisasiRp, 0) /
      1_000_000_000,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CsrProgram = {
      id: editingId || `csr-${Date.now()}`,
      year,
      namaProgram: namaProgram.trim(),
      pilar,
      lokasi: lokasi.trim(),
      anggaranRp: Number(anggaranRp) || 0,
      realisasiRp: Number(realisasiRp) || 0,
      penerimaManfaat: Number(penerimaManfaat) || 0,
      satuanPenerima: satuanPenerima.trim() || 'Orang',
      status,
    };
    if (editingId) {
      onUpdateProgram(payload);
    } else {
      onAddProgram(payload);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `CSR_${year}.csv`,
      ['Tahun', 'Nama Program', 'Pilar', 'Lokasi', 'Anggaran (Rp)', 'Realisasi (Rp)', 'Penerima Manfaat', 'Satuan', 'Status'],
      filteredPrograms.map((p) => [
        p.year,
        p.namaProgram,
        p.pilar,
        p.lokasi,
        p.anggaranRp,
        p.realisasiRp,
        p.penerimaManfaat,
        p.satuanPenerima,
        p.status,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="01 / TANGGUNG JAWAB SOSIAL & LINGKUNGAN"
        title="Program CSR & Dana Disalurkan"
        subtitle="Pelaporan alokasi anggaran, realisasi penyaluran dana, serta capaian penerima manfaat program Tanggung Jawab Sosial dan Lingkungan (TJSL) per tahun buku."
        standardRef="GRI 203-1 · GRI 413-1 · POJK 51/2017"
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
              Tambah Program CSR
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Anggaran CSR (${year})`}
          value={formatIDRCompact(totalAnggaran)}
          context="Plafon tahunan yang disetujui"
        />
        <KpiCard
          label={`Realisasi Disalurkan (${year})`}
          value={formatIDRCompact(totalRealisasi)}
          context={`Tingkat serapan ${penyerapanPct.toFixed(1)}% dari anggaran`}
          tone="positive"
        />
        <KpiCard
          label="Jumlah Kegiatan"
          value={String(yearPrograms.length)}
          unit="Program"
          context="Tersebar di 5 pilar pembangunan sosial"
        />
        <KpiCard
          label="Rata-Rata Dana / Program"
          value={formatIDRCompact(yearPrograms.length ? totalRealisasi / yearPrograms.length : 0)}
          context="Efektivitas penyaluran per inisiatif"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Distribusi Dana CSR per Pilar ({year})
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            Realisasi penyaluran berdasarkan fokus pemberdayaan masyarakat
          </p>
          <HorizontalBarList
            items={pilarSummary}
            formatValue={(v) => formatIDRCompact(v)}
            defaultColor="#14532D"
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Perbandingan Anggaran vs Realisasi Tahunan
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            Akumulasi dana CSR tahun 2023–2025 (dalam Miliar Rupiah)
          </p>
          <MultiYearBarChart
            data={multiYearData}
            primaryLabel="Anggaran (Rp M)"
            secondaryLabel="Realisasi (Rp M)"
            formatValue={(v) => `Rp ${v.toFixed(2)} M`}
            primaryColor="#94A3B8"
            secondaryColor="#14532D"
          />
        </div>
      </div>

      {/* Filter & Program Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Rincian Kegiatan CSR Tahun {year}
          </h2>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg no-print">
            {(['Semua', ...PILAR_LIST] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPilar(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterPilar === p
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500">
            Belum ada kegiatan CSR tercatat untuk kategori ini pada tahun {year}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Program & Lokasi</th>
                  <th className="py-3 px-4">Pilar</th>
                  <th className="py-3 px-4 text-right">Anggaran</th>
                  <th className="py-3 px-4 text-right">Realisasi</th>
                  <th className="py-3 px-4 text-right">Penerima Manfaat</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredPrograms.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-900">{item.namaProgram}</div>
                      <div className="text-xs text-stone-500">{item.lokasi}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-700 whitespace-nowrap">
                      {item.pilar}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums whitespace-nowrap">
                      {formatIDR(item.anggaranRp)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                      {formatIDR(item.realisasiRp)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-700 tabular-nums whitespace-nowrap">
                      {formatNumber(item.penerimaManfaat)} {item.satuanPenerima}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusText
                        tone={item.status === 'Selesai' ? 'positive' : 'warning'}
                        label={item.status}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md transition-colors"
                        aria-label={`Edit ${item.namaProgram}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProgram(item.id)}
                        className="p-1.5 text-stone-400 hover:text-red-700 rounded-md transition-colors"
                        aria-label={`Hapus ${item.namaProgram}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Program CSR (${year})` : `Tambah Program CSR (${year})`}
        subtitle="Catat atau perbarui kegiatan penyaluran dana sosial perusahaan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nama Program</label>
            <input
              type="text"
              required
              placeholder="Contoh: Pelatihan Batik & Pengolahan Limbah Tekstil"
              value={namaProgram}
              onChange={(e) => setNamaProgram(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Pilar CSR</label>
              <select
                value={pilar}
                onChange={(e) => setPilar(e.target.value as CsrPillar)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                {PILAR_LIST.map((pl) => (
                  <option key={pl} value={pl}>
                    {pl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Lokasi</label>
              <input
                type="text"
                required
                placeholder="Kec. Telukjambe, Karawang"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Anggaran (Rp)</label>
              <input
                type="number"
                required
                min={0}
                value={anggaranRp}
                onChange={(e) => setAnggaranRp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Realisasi (Rp)</label>
              <input
                type="number"
                required
                min={0}
                value={realisasiRp}
                onChange={(e) => setRealisasiRp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Penerima Manfaat</label>
              <input
                type="number"
                required
                min={0}
                value={penerimaManfaat}
                onChange={(e) => setPenerimaManfaat(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Satuan</label>
              <input
                type="text"
                required
                value={satuanPenerima}
                onChange={(e) => setSatuanPenerima(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Selesai' | 'Berjalan')}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Selesai">Selesai</option>
                <option value="Berjalan">Berjalan</option>
              </select>
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
              Simpan Program
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
