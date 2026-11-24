import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { JobLevel, ReportYear, TrainingCategory, TrainingRecord, WorkforceYearData } from '../../types/esg';
import { exportToCSV, formatNumber, getWorkforceTotals } from '../../utils/formatters';
import { HorizontalBarList, MultiYearBarChart } from '../Charts';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface PelatihanSectionProps {
  trainings: TrainingRecord[];
  workforce: Record<ReportYear, WorkforceYearData>;
  year: ReportYear;
  onAddTraining: (record: TrainingRecord) => void;
  onUpdateTraining: (record: TrainingRecord) => void;
  onDeleteTraining: (id: string) => void;
}

const JOB_LEVELS: JobLevel[] = [
  'Direksi & Eksekutif',
  'Manajer',
  'Supervisor & Superintendent',
  'Staf & Analis',
  'Operator & Teknisi',
];

const CATEGORIES: TrainingCategory[] = [
  'K3 & Keselamatan',
  'Teknis & Operasional',
  'Kepemimpinan & Manajemen',
  'ESG & Lingkungan',
  'Digital & Tata Kelola',
];

export const PelatihanSection: React.FC<PelatihanSectionProps> = ({
  trainings,
  workforce,
  year,
  onAddTraining,
  onUpdateTraining,
  onDeleteTraining,
}) => {
  const [filterJabatan, setFilterJabatan] = useState<'Semua' | JobLevel>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [jabatan, setJabatan] = useState<JobLevel>('Operator & Teknisi');
  const [namaPelatihan, setNamaPelatihan] = useState('');
  const [kategori, setKategori] = useState<TrainingCategory>('K3 & Keselamatan');
  const [jumlahPeserta, setJumlahPeserta] = useState('40');
  const [durasiJamPerPeserta, setDurasiJamPerPeserta] = useState('16');
  const [penyelenggara, setPenyelenggara] = useState('Internal Learning Center');

  const openAddModal = () => {
    setEditingId(null);
    setJabatan('Operator & Teknisi');
    setNamaPelatihan('');
    setKategori('K3 & Keselamatan');
    setJumlahPeserta('40');
    setDurasiJamPerPeserta('16');
    setPenyelenggara('Internal Learning Center');
    setModalOpen(true);
  };

  const openEditModal = (item: TrainingRecord) => {
    setEditingId(item.id);
    setJabatan(item.jabatan);
    setNamaPelatihan(item.namaPelatihan);
    setKategori(item.kategori);
    setJumlahPeserta(String(item.jumlahPeserta));
    setDurasiJamPerPeserta(String(item.durasiJamPerPeserta));
    setPenyelenggara(item.penyelenggara);
    setModalOpen(true);
  };

  const yearTrainings = trainings.filter((t) => t.year === year);
  const filtered =
    filterJabatan === 'Semua'
      ? yearTrainings
      : yearTrainings.filter((t) => t.jabatan === filterJabatan);

  const wf = workforce[year];
  const wfTotals = getWorkforceTotals(wf);

  const totalJamPelatihan = yearTrainings.reduce(
    (acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta,
    0
  );
  const totalPesertaKumulatif = yearTrainings.reduce((acc, t) => acc + t.jumlahPeserta, 0);
  const avgJamPerKaryawan =
    wfTotals.totalKaryawan > 0 ? totalJamPelatihan / wfTotals.totalKaryawan : 0;

  const perJabatanSummary = JOB_LEVELS.map((lvl) => {
    const jbHeadcount =
      wf.jabatanBreakdown.find((j) => j.jabatan === lvl);
    const headcount = jbHeadcount ? jbHeadcount.lakiLaki + jbHeadcount.perempuan : 0;
    const records = yearTrainings.filter((t) => t.jabatan === lvl);
    const jam = records.reduce((acc, r) => acc + r.jumlahPeserta * r.durasiJamPerPeserta, 0);
    const peserta = records.reduce((acc, r) => acc + r.jumlahPeserta, 0);
    const rataRata = headcount > 0 ? jam / headcount : 0;
    return {
      jabatan: lvl,
      headcount,
      sesi: records.length,
      peserta,
      jam,
      rataRata,
    };
  });

  const multiYearAvg = ([2023, 2024, 2025] as ReportYear[]).map((y) => {
    const tList = trainings.filter((t) => t.year === y);
    const tJam = tList.reduce((acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta, 0);
    const emp = getWorkforceTotals(workforce[y]).totalKaryawan;
    return {
      year: y,
      value: emp > 0 ? Number((tJam / emp).toFixed(1)) : 0,
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: TrainingRecord = {
      id: editingId || `tr-${Date.now()}`,
      year,
      jabatan,
      namaPelatihan: namaPelatihan.trim(),
      kategori,
      jumlahPeserta: Number(jumlahPeserta) || 0,
      durasiJamPerPeserta: Number(durasiJamPerPeserta) || 0,
      penyelenggara: penyelenggara.trim(),
    };
    if (editingId) {
      onUpdateTraining(payload);
    } else {
      onAddTraining(payload);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `Pelatihan_${year}.csv`,
      ['Tahun', 'Jabatan', 'Nama Pelatihan', 'Kategori', 'Peserta', 'Durasi/Peserta (Jam)', 'Total Jam Pelatihan', 'Penyelenggara'],
      filtered.map((t) => [
        t.year,
        t.jabatan,
        t.namaPelatihan,
        t.kategori,
        t.jumlahPeserta,
        t.durasiJamPerPeserta,
        t.jumlahPeserta * t.durasiJamPerPeserta,
        t.penyelenggara,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="03 / PENGEMBANGAN KOMPETENSI SDM"
        title="Pelatihan Karyawan per Jabatan & Perhitungan Jam Pelatihan"
        subtitle="Rekapitulasi kegiatan pelatihan karyawan pada seluruh jenjang jabatan serta kalkulasi total dan rata-rata jam pelatihan per karyawan."
        standardRef="GRI 404-1 · POJK 51/2017 Bagian 6.c.3"
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
              Tambah Pelatihan
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Jam Pelatihan (${year})`}
          value={formatNumber(totalJamPelatihan)}
          unit="Jam"
          context="Rumus: Σ (Jumlah Peserta × Durasi Jam)"
          tone="positive"
        />
        <KpiCard
          label="Rata-Rata Jam / Karyawan"
          value={avgJamPerKaryawan.toFixed(1)}
          unit="Jam / Orang"
          context={`${formatNumber(totalJamPelatihan)} jam ÷ ${formatNumber(wfTotals.totalKaryawan)} karyawan`}
          tone="positive"
        />
        <KpiCard
          label="Total Partisipasi Peserta"
          value={formatNumber(totalPesertaKumulatif)}
          unit="Peserta"
          context={`Dari ${yearTrainings.length} program pelatihan tercatat`}
        />
        <KpiCard
          label="Cakupan Level Jabatan"
          value="5 / 5"
          unit="Jenjang"
          context="Direksi hingga Operator & Teknisi"
        />
      </div>

      {/* Perhitungan Rata-Rata Jam Pelatihan tiap Jabatan */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Matriks Perhitungan Jam Pelatihan per Jabatan ({year})
          </h2>
          <p className="text-xs text-stone-500">
            Rata-rata jam pelatihan per jabatan = Total Jam Pelatihan Jabatan ÷ Jumlah Karyawan pada Jabatan tersebut
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Jenjang Jabatan</th>
                <th className="py-3 px-4 text-right">Jumlah Karyawan</th>
                <th className="py-3 px-4 text-right">Jumlah Sesi</th>
                <th className="py-3 px-4 text-right">Total Peserta</th>
                <th className="py-3 px-4 text-right">Total Jam Pelatihan</th>
                <th className="py-3 px-4 text-right">Rata-Rata (Jam/Org)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {perJabatanSummary.map((row) => (
                <tr key={row.jabatan} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4 font-medium text-stone-900">{row.jabatan}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {formatNumber(row.headcount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {row.sesi}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {formatNumber(row.peserta)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-stone-900 tabular-nums">
                    {formatNumber(row.jam)} Jam
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-emerald-900 tabular-nums">
                    {row.rataRata.toFixed(1)} Jam
                  </td>
                </tr>
              ))}
              <tr className="bg-stone-50 font-semibold border-t border-stone-200">
                <td className="py-3.5 px-4 text-stone-900">Total Perusahaan</td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(wfTotals.totalKaryawan)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {yearTrainings.length}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totalPesertaKumulatif)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totalJamPelatihan)} Jam
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-900 tabular-nums">
                  {avgJamPerKaryawan.toFixed(1)} Jam
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Distribusi Jam Pelatihan per Kategori ({year})
          </h2>
          <p className="text-xs text-stone-500 mb-4">Total jam pelatihan menurut tema kompetensi</p>
          <HorizontalBarList
            items={CATEGORIES.map((cat) => ({
              label: cat,
              value: yearTrainings
                .filter((t) => t.kategori === cat)
                .reduce((acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta, 0),
            }))}
            formatValue={(v) => `${formatNumber(v)} Jam`}
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Tren Rata-Rata Jam Pelatihan / Karyawan (2023–2025)
          </h2>
          <p className="text-xs text-stone-500 mb-4">Peningkatan investasi jam pengembangan kompetensi tahunan</p>
          <MultiYearBarChart
            data={multiYearAvg}
            primaryLabel="Rata-Rata Jam Pelatihan / Karyawan"
            formatValue={(v) => `${v.toFixed(1)} Jam`}
            primaryColor="#14532D"
          />
        </div>
      </div>

      {/* Detailed Training Catalog */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Daftar Kegiatan Pelatihan Tahun {year}
          </h2>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg no-print">
            {(['Semua', ...JOB_LEVELS] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterJabatan(lvl)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterJabatan === lvl
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {lvl === 'Supervisor & Superintendent' ? 'Supervisor' : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Nama Pelatihan & Penyelenggara</th>
                <th className="py-3 px-4">Jabatan Target</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Peserta</th>
                <th className="py-3 px-4 text-right">Durasi/Org</th>
                <th className="py-3 px-4 text-right">Total Jam</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-stone-900">{item.namaPelatihan}</div>
                    <div className="text-xs text-stone-500">{item.penyelenggara}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-stone-700 whitespace-nowrap">
                    {item.jabatan}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-stone-600 whitespace-nowrap">
                    {item.kategori}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                    {formatNumber(item.jumlahPeserta)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                    {item.durasiJamPerPeserta} Jam
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-emerald-900 tabular-nums">
                    {formatNumber(item.jumlahPeserta * item.durasiJamPerPeserta)} Jam
                  </td>
                  <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                      aria-label={`Edit ${item.namaPelatihan}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTraining(item.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                      aria-label={`Hapus ${item.namaPelatihan}`}
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
        title={editingId ? `Edit Kegiatan Pelatihan (${year})` : `Tambah Kegiatan Pelatihan (${year})`}
        subtitle="Total jam pelatihan dihitung otomatis (Peserta × Durasi)"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nama Pelatihan</label>
            <input
              type="text"
              required
              placeholder="Contoh: Sertifikasi Operator Forklift K3 Kelas 1"
              value={namaPelatihan}
              onChange={(e) => setNamaPelatihan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Jabatan Target</label>
              <select
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value as JobLevel)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                {JOB_LEVELS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as TrainingCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Jumlah Peserta</label>
              <input
                type="number"
                required
                min={1}
                value={jumlahPeserta}
                onChange={(e) => setJumlahPeserta(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Durasi per Peserta (Jam)</label>
              <input
                type="number"
                required
                min={1}
                value={durasiJamPerPeserta}
                onChange={(e) => setDurasiJamPerPeserta(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Penyelenggara</label>
            <input
              type="text"
              required
              value={penyelenggara}
              onChange={(e) => setPenyelenggara(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="p-3 bg-stone-50 rounded-lg text-xs font-mono text-stone-700">
            Total Jam Pelatihan Tambahan: {formatNumber((Number(jumlahPeserta) || 0) * (Number(durasiJamPerPeserta) || 0))} Jam
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
              Simpan Pelatihan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
