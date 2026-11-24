import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { ReportYear, SupplyChainEntry } from '../../types/esg';
import { exportToCSV, formatNumber } from '../../utils/formatters';
import { HorizontalBarList, MultiYearBarChart, StackedProportionBar } from '../Charts';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface SupplyChainSectionProps {
  entries: SupplyChainEntry[];
  year: ReportYear;
  onAddEntry: (entry: SupplyChainEntry) => void;
  onUpdateEntry: (entry: SupplyChainEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const KATEGORI_LIST: SupplyChainEntry['kategoriPemasok'][] = [
  'UMKM Lokal (Ring-1)',
  'Korporasi Lokal Daerah',
  'Pemasok Nasional',
  'Pemasok Internasional',
];

export const SupplyChainSection: React.FC<SupplyChainSectionProps> = ({
  entries,
  year,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kategoriPemasok, setKategoriPemasok] =
    useState<SupplyChainEntry['kategoriPemasok']>('UMKM Lokal (Ring-1)');
  const [jenisKomoditas, setJenisKomoditas] = useState('');
  const [jumlahPemasok, setJumlahPemasok] = useState('15');
  const [nilaiPengadaan, setNilaiPengadaan] = useState('42');
  const [screeningEsg, setScreeningEsg] = useState('90');
  const [tkdn, setTkdn] = useState('85');

  const openAddModal = () => {
    setEditingId(null);
    setKategoriPemasok('UMKM Lokal (Ring-1)');
    setJenisKomoditas('');
    setJumlahPemasok('15');
    setNilaiPengadaan('42');
    setScreeningEsg('90');
    setTkdn('85');
    setModalOpen(true);
  };

  const openEditModal = (item: SupplyChainEntry) => {
    setEditingId(item.id);
    setKategoriPemasok(item.kategoriPemasok);
    setJenisKomoditas(item.jenisKomoditas);
    setJumlahPemasok(String(item.jumlahPemasok));
    setNilaiPengadaan(String(item.nilaiPengadaanMiliarRp));
    setScreeningEsg(String(item.persentaseLolosScreeningESG));
    setTkdn(String(item.rataRataTkdnPersen));
    setModalOpen(true);
  };

  const yearEntries = entries.filter((e) => e.year === year);
  const totalPemasok = yearEntries.reduce((acc, e) => acc + e.jumlahPemasok, 0);
  const totalNilai = yearEntries.reduce((acc, e) => acc + e.nilaiPengadaanMiliarRp, 0);

  const localProcurementValue = yearEntries
    .filter(
      (e) =>
        e.kategoriPemasok === 'UMKM Lokal (Ring-1)' ||
        e.kategoriPemasok === 'Korporasi Lokal Daerah' ||
        e.kategoriPemasok === 'Pemasok Nasional'
    )
    .reduce((acc, e) => acc + e.nilaiPengadaanMiliarRp, 0);
  const pctDomestik = totalNilai > 0 ? (localProcurementValue / totalNilai) * 100 : 0;

  const weightedEsg =
    totalPemasok > 0
      ? yearEntries.reduce((acc, e) => acc + e.jumlahPemasok * e.persentaseLolosScreeningESG, 0) /
        totalPemasok
      : 0;

  const multiYearSupply = ([2023, 2024, 2025] as ReportYear[]).map((y) => ({
    year: y,
    value: entries
      .filter((e) => e.year === y)
      .reduce((acc, e) => acc + e.nilaiPengadaanMiliarRp, 0),
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: SupplyChainEntry = {
      id: editingId || `sc-${Date.now()}`,
      year,
      kategoriPemasok,
      jenisKomoditas: jenisKomoditas.trim(),
      jumlahPemasok: Number(jumlahPemasok) || 0,
      nilaiPengadaanMiliarRp: Number(nilaiPengadaan) || 0,
      persentaseLolosScreeningESG: Math.min(100, Math.max(0, Number(screeningEsg) || 0)),
      rataRataTkdnPersen: Math.min(100, Math.max(0, Number(tkdn) || 0)),
    };
    if (editingId) {
      onUpdateEntry(payload);
    } else {
      onAddEntry(payload);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `Rantai_Pasok_${year}.csv`,
      ['Kategori Pemasok', 'Komoditas', 'Jumlah Pemasok', 'Nilai Pengadaan (Rp Miliar)', 'Lolos Screening ESG (%)', 'Rata-Rata TKDN (%)'],
      yearEntries.map((s) => [
        s.kategoriPemasok,
        s.jenisKomoditas,
        s.jumlahPemasok,
        s.nilaiPengadaanMiliarRp,
        s.persentaseLolosScreeningESG,
        s.rataRataTkdnPersen,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="08 / PENGELOLAAN RANTAI PASOK"
        title="Jumlah Pemasok & Besaran Nilai Pengadaan (Supply Chain)"
        subtitle="Struktur mitra pemasok berdasarkan skala usaha, jangkauan geografis (lokal/nasional/internasional), besaran belanja pengadaan, TKDN, serta kepatuhan seleksi ESG."
        standardRef="GRI 204-1 · GRI 308-1 · GRI 414-1"
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
              Tambah Kelompok Pemasok
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Pemasok Aktif (${year})`}
          value={formatNumber(totalPemasok)}
          unit="Entitas"
          context="Tersebar dari UMKM Ring-1 hingga global"
        />
        <KpiCard
          label="Total Besaran Pengadaan"
          value={`Rp ${formatNumber(totalNilai)}`}
          unit="Miliar"
          context="Nilai kontrak pengadaan tahun buku berjalan"
        />
        <KpiCard
          label="Porsi Belanja Pemasok Dalam Negeri"
          value={`${pctDomestik.toFixed(1)}%`}
          context={`Rp ${formatNumber(localProcurementValue)} Miliar dibelanjakan di dalam negeri`}
          tone="positive"
        />
        <KpiCard
          label="Pemasok Terverifikasi ESG & K3"
          value={`${weightedEsg.toFixed(1)}%`}
          context="Rata-rata tertimbang kepatuhan kode etik pemasok"
          tone="positive"
        />
      </div>

      <div className="p-6 bg-white border border-stone-200 rounded-xl">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
          Proporsi Besaran Pengadaan menurut Kategori Pemasok ({year})
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Distribusi nilai belanja pengadaan (Rp Miliar) lintas segmen mitra usaha
        </p>
        <StackedProportionBar
          segments={yearEntries.map((e, i) => ({
            label: e.kategoriPemasok,
            value: e.nilaiPengadaanMiliarRp,
            color: ['#16A34A', '#14532D', '#1E3A8A', '#64748B'][i % 4],
          }))}
          formatValue={(v) => `Rp ${formatNumber(v)} M`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Jumlah Pemasok per Kategori ({year})
          </h2>
          <p className="text-xs text-stone-500 mb-4">Keterlibatan UMKM lokal dan korporasi mitra</p>
          <HorizontalBarList
            items={yearEntries.map((e) => ({
              label: e.kategoriPemasok,
              value: e.jumlahPemasok,
              secondaryLabel: `Rp ${formatNumber(e.nilaiPengadaanMiliarRp)} M`,
            }))}
            formatValue={(v) => `${formatNumber(v)} Pemasok`}
            defaultColor="#1E3A8A"
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Tren Total Nilai Pengadaan (2023–2025)
          </h2>
          <p className="text-xs text-stone-500 mb-4">Pertumbuhan ekosistem rantai pasok dalam Rp Miliar</p>
          <MultiYearBarChart
            data={multiYearSupply}
            primaryLabel="Nilai Pengadaan (Rp Miliar)"
            formatValue={(v) => `Rp ${formatNumber(v)} M`}
            primaryColor="#1E3A8A"
          />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Rincian Struktur Rantai Pasok Tahun {year}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Kategori Pemasok & Komoditas</th>
                <th className="py-3 px-4 text-right">Jumlah Pemasok</th>
                <th className="py-3 px-4 text-right">Besaran Pengadaan</th>
                <th className="py-3 px-4 text-right">Porsi Nilai</th>
                <th className="py-3 px-4 text-right">Lolos Screening ESG</th>
                <th className="py-3 px-4 text-right">Rata-Rata TKDN</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {yearEntries.map((item) => {
                const share = totalNilai > 0 ? (item.nilaiPengadaanMiliarRp / totalNilai) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-stone-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-900">{item.kategoriPemasok}</div>
                      <div className="text-xs text-stone-500">{item.jenisKomoditas}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                      {formatNumber(item.jumlahPemasok)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-stone-900 tabular-nums">
                      Rp {formatNumber(item.nilaiPengadaanMiliarRp)} M
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                      {share.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-900 tabular-nums">
                      {item.persentaseLolosScreeningESG}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-700 tabular-nums">
                      {item.rataRataTkdnPersen}%
                    </td>
                    <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                        aria-label={`Edit ${item.kategoriPemasok}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(item.id)}
                        className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                        aria-label={`Hapus ${item.kategoriPemasok}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Data Rantai Pasok (${year})` : `Tambah Data Rantai Pasok (${year})`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Kategori Pemasok</label>
            <select
              value={kategoriPemasok}
              onChange={(e) => setKategoriPemasok(e.target.value as SupplyChainEntry['kategoriPemasok'])}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
            >
              {KATEGORI_LIST.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Jenis Komoditas / Jasa</label>
            <input
              type="text"
              required
              value={jenisKomoditas}
              onChange={(e) => setJenisKomoditas(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Jumlah Pemasok</label>
              <input
                type="number"
                min={1}
                required
                value={jumlahPemasok}
                onChange={(e) => setJumlahPemasok(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Nilai Pengadaan (Rp Miliar)</label>
              <input
                type="number"
                min={0}
                required
                value={nilaiPengadaan}
                onChange={(e) => setNilaiPengadaan(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Lolos Screening ESG (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={screeningEsg}
                onChange={(e) => setScreeningEsg(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Rata-Rata TKDN (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={tkdn}
                onChange={(e) => setTkdn(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
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
              Simpan Pemasok
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
