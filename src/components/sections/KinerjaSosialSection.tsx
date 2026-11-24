import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { AgeComposition, JabatanComposition, ReportYear, WorkforceYearData } from '../../types/esg';
import { exportToCSV, formatNumber, getWorkforceTotals } from '../../utils/formatters';
import { HorizontalBarList, StackedProportionBar } from '../Charts';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface KinerjaSosialSectionProps {
  workforce: Record<ReportYear, WorkforceYearData>;
  year: ReportYear;
  onUpdateWorkforce: (year: ReportYear, updated: WorkforceYearData) => void;
}

export const KinerjaSosialSection: React.FC<KinerjaSosialSectionProps> = ({
  workforce,
  year,
  onUpdateWorkforce,
}) => {
  const wf = workforce[year];
  const totals = getWorkforceTotals(wf);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftJabatan, setDraftJabatan] = useState<JabatanComposition[]>(wf.jabatanBreakdown);
  const [draftUsia, setDraftUsia] = useState<AgeComposition[]>(wf.usiaBreakdown);
  const [draftRing1, setDraftRing1] = useState(wf.lokalRing1);
  const [draftTurnover, setDraftTurnover] = useState(wf.tingkatTurnoverPersen);

  const openEditModal = () => {
    setDraftJabatan(wf.jabatanBreakdown.map((j) => ({ ...j })));
    setDraftUsia(wf.usiaBreakdown.map((u) => ({ ...u })));
    setDraftRing1(wf.lokalRing1);
    setDraftTurnover(wf.tingkatTurnoverPersen);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalLokal = draftJabatan.reduce((acc, j) => acc + j.lokal, 0);
    const totalTka = draftJabatan.reduce((acc, j) => acc + j.tka, 0);
    const clampedRing1 = Math.min(draftRing1, totalLokal);
    onUpdateWorkforce(year, {
      ...wf,
      lokalRing1: clampedRing1,
      lokalNasional: Math.max(0, totalLokal - clampedRing1),
      tka: totalTka,
      tingkatTurnoverPersen: draftTurnover,
      jabatanBreakdown: draftJabatan,
      usiaBreakdown: draftUsia,
    });
    setEditModalOpen(false);
  };

  const handleClearJabatanRow = (jabatanName: JabatanComposition['jabatan']) => {
    const updatedJabatan = wf.jabatanBreakdown.map((j) =>
      j.jabatan === jabatanName
        ? { ...j, lakiLaki: 0, perempuan: 0, tetap: 0, kontrak: 0, lokal: 0, tka: 0 }
        : j
    );
    const totalLokal = updatedJabatan.reduce((acc, j) => acc + j.lokal, 0);
    const totalTka = updatedJabatan.reduce((acc, j) => acc + j.tka, 0);
    const clampedRing1 = Math.min(wf.lokalRing1, totalLokal);
    onUpdateWorkforce(year, {
      ...wf,
      lokalRing1: clampedRing1,
      lokalNasional: Math.max(0, totalLokal - clampedRing1),
      tka: totalTka,
      jabatanBreakdown: updatedJabatan,
    });
  };

  const handleExport = () => {
    exportToCSV(
      `Kinerja_Sosial_SDM_${year}.csv`,
      ['Jenjang Jabatan', 'Total', 'Laki-laki', 'Perempuan', 'Tetap (PKWTT)', 'Kontrak (PKWT)', 'Lokal (TKI)', 'TKA'],
      wf.jabatanBreakdown.map((j) => [
        j.jabatan,
        j.lakiLaki + j.perempuan,
        j.lakiLaki,
        j.perempuan,
        j.tetap,
        j.kontrak,
        j.lokal,
        j.tka,
      ])
    );
  };

  const pctPerempuan = totals.totalKaryawan
    ? (totals.totalPerempuan / totals.totalKaryawan) * 100
    : 0;
  const pctTetap = totals.totalKaryawan
    ? (totals.totalTetap / totals.totalKaryawan) * 100
    : 0;
  const pctLokal = totals.totalKaryawan
    ? (totals.totalLokal / totals.totalKaryawan) * 100
    : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="04 / KINERJA SOSIAL & KETENAGAKERJAAN"
        title="Komposisi Karyawan, Gender, Status Hubungan Kerja & TKA/Lokal"
        subtitle="Transparansi demografi tenaga kerja mencakup jumlah karyawan, kesetaraan gender, status kepegawaian tetap/kontrak, serta penyerapan tenaga kerja lokal dibandingkan TKA."
        standardRef="GRI 2-7 · GRI 405-1 · POJK 51/2017"
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
              onClick={openEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ubah Data SDM
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Karyawan (${year})`}
          value={formatNumber(totals.totalKaryawan)}
          unit="Orang"
          context={`Turnover tahunan ${wf.tingkatTurnoverPersen.toFixed(1)}%`}
        />
        <KpiCard
          label="Komposisi Gender"
          value={`${pctPerempuan.toFixed(1)}%`}
          unit="Perempuan"
          context={`Laki-laki: ${formatNumber(totals.totalLaki)} · Perempuan: ${formatNumber(totals.totalPerempuan)}`}
        />
        <KpiCard
          label="Karyawan Tetap (PKWTT)"
          value={`${pctTetap.toFixed(1)}%`}
          unit="Tetap"
          context={`Tetap: ${formatNumber(totals.totalTetap)} · Kontrak: ${formatNumber(totals.totalKontrak)}`}
          tone="positive"
        />
        <KpiCard
          label="Tenaga Kerja Lokal vs TKA"
          value={`${pctLokal.toFixed(1)}%`}
          unit="Lokal (TKI)"
          context={`Lokal: ${formatNumber(totals.totalLokal)} (${formatNumber(wf.lokalRing1)} Ring-1) · TKA: ${totals.totalTka}`}
          tone="positive"
        />
      </div>

      {/* Proportional Composition Bars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="p-5 bg-white border border-stone-200 rounded-xl">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Proporsi Gender</h3>
          <StackedProportionBar
            segments={[
              { label: 'Laki-laki', value: totals.totalLaki, color: '#334155' },
              { label: 'Perempuan', value: totals.totalPerempuan, color: '#0F766E' },
            ]}
            formatValue={(v) => `${formatNumber(v)} org`}
          />
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-xl">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Status Kepegawaian</h3>
          <StackedProportionBar
            segments={[
              { label: 'Tetap (PKWTT)', value: totals.totalTetap, color: '#14532D' },
              { label: 'Kontrak (PKWT)', value: totals.totalKontrak, color: '#D97706' },
            ]}
            formatValue={(v) => `${formatNumber(v)} org`}
          />
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-xl">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Asal Tenaga Kerja (Lokal vs TKA)</h3>
          <StackedProportionBar
            segments={[
              { label: 'Lokal Ring-1', value: wf.lokalRing1, color: '#16A34A' },
              { label: 'Lokal Nasional', value: wf.lokalNasional, color: '#1E3A8A' },
              { label: 'Tenaga Kerja Asing', value: totals.totalTka, color: '#64748B' },
            ]}
            formatValue={(v) => `${formatNumber(v)} org`}
          />
        </div>
      </div>

      {/* Detailed Composition Table by Job Level */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Matriks Komposisi Tenaga Kerja per Jenjang Jabatan ({year})
          </h2>
          <p className="text-xs text-stone-500">
            Rincian gender, ikatan kerja (tetap/kontrak), dan kewarganegaraan (Lokal/TKA) pada tiap jabatan
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Jenjang Jabatan</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Laki-laki</th>
                <th className="py-3 px-4 text-right">Perempuan</th>
                <th className="py-3 px-4 text-right">Tetap</th>
                <th className="py-3 px-4 text-right">Kontrak</th>
                <th className="py-3 px-4 text-right">Lokal (TKI)</th>
                <th className="py-3 px-4 text-right">TKA</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {wf.jabatanBreakdown.map((row) => (
                <tr key={row.jabatan} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4 font-medium text-stone-900">{row.jabatan}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-stone-900 tabular-nums">
                    {formatNumber(row.lakiLaki + row.perempuan)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {formatNumber(row.lakiLaki)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {formatNumber(row.perempuan)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-900 tabular-nums">
                    {formatNumber(row.tetap)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-amber-800 tabular-nums">
                    {formatNumber(row.kontrak)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-700 tabular-nums">
                    {formatNumber(row.lokal)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                    {formatNumber(row.tka)}
                  </td>
                  <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                      aria-label={`Edit ${row.jabatan}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearJabatanRow(row.jabatan)}
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                      aria-label={`Kosongkan ${row.jabatan}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-stone-50 font-semibold border-t border-stone-200">
                <td className="py-3.5 px-4 text-stone-900">Total Keseluruhan</td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalKaryawan)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalLaki)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalPerempuan)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalTetap)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalKontrak)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalLokal)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                  {formatNumber(totals.totalTka)}
                </td>
                <td className="no-print" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Age Demographics */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
              Distribusi Usia Karyawan ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Struktur demografi usia mendukung keberlanjutan regenerasi talenta operasional
            </p>
          </div>
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Kelola Usia & SDM
          </button>
        </div>
        <HorizontalBarList
          items={wf.usiaBreakdown.map((u) => ({
            label: u.rentang,
            value: u.jumlah,
            secondaryLabel: `${((u.jumlah / Math.max(totals.totalKaryawan, 1)) * 100).toFixed(1)}%`,
          }))}
          formatValue={(v) => `${formatNumber(v)} Orang`}
          defaultColor="#334155"
        />
      </div>

      {/* Edit Workforce Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Perbarui Data SDM (${year})`}
        subtitle="Pastikan jumlah Laki+Perempuan, Tetap+Kontrak, dan Lokal+TKA konsisten per jabatan"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {draftJabatan.map((row, idx) => (
              <div key={row.jabatan} className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-stone-900">{row.jabatan}</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(
                    [
                      ['Laki-laki', 'lakiLaki'],
                      ['Perempuan', 'perempuan'],
                      ['Tetap', 'tetap'],
                      ['Kontrak', 'kontrak'],
                      ['Lokal', 'lokal'],
                      ['TKA', 'tka'],
                    ] as const
                  ).map(([lbl, key]) => (
                    <div key={key}>
                      <label className="block text-[10px] text-stone-500 mb-0.5">{lbl}</label>
                      <input
                        type="number"
                        min={0}
                        value={row[key]}
                        onChange={(e) => {
                          const next = [...draftJabatan];
                          next[idx] = { ...next[idx], [key]: Number(e.target.value) || 0 };
                          setDraftJabatan(next);
                        }}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-stone-800">Distribusi Kelompok Usia</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {draftUsia.map((u, idx) => (
                <div key={u.rentang}>
                  <label className="block text-[10px] text-stone-500 mb-0.5">{u.rentang}</label>
                  <input
                    type="number"
                    min={0}
                    value={u.jumlah}
                    onChange={(e) => {
                      const next = [...draftUsia];
                      next[idx] = { ...next[idx], jumlah: Number(e.target.value) || 0 };
                      setDraftUsia(next);
                    }}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Karyawan Lokal Ring-1 (Sekitar Pabrik)
              </label>
              <input
                type="number"
                min={0}
                value={draftRing1}
                onChange={(e) => setDraftRing1(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Tingkat Turnover (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={draftTurnover}
                onChange={(e) => setDraftTurnover(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Data SDM
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
