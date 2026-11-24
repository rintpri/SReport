import React, { useState } from 'react';
import { Calculator, Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { K3IncidentLog, K3YearSummary, ReportYear } from '../../types/esg';
import {
  calculateLTIFR,
  calculateRecordableIncidents,
  calculateSeverityRate,
  calculateTSIR,
  exportToCSV,
  formatNumber,
} from '../../utils/formatters';
import { MultiYearBarChart } from '../Charts';
import { KpiCard, Modal, SectionHeader, StatusText } from '../UiPrimitives';

interface K3SectionProps {
  summaries: Record<ReportYear, K3YearSummary>;
  incidents: K3IncidentLog[];
  year: ReportYear;
  onUpdateSummary: (year: ReportYear, updated: K3YearSummary) => void;
  onAddIncident: (incident: K3IncidentLog) => void;
  onUpdateIncident: (incident: K3IncidentLog) => void;
  onDeleteIncident: (id: string) => void;
}

export const K3Section: React.FC<K3SectionProps> = ({
  summaries,
  incidents,
  year,
  onUpdateSummary,
  onAddIncident,
  onUpdateIncident,
  onDeleteIncident,
}) => {
  const summary = summaries[year];
  const yearIncidents = incidents.filter((i) => i.year === year);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState(`${year}-11-15`);
  const [kategori, setKategori] = useState<K3IncidentLog['kategori']>('Near Miss');
  const [unitKerja, setUnitKerja] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [hariHilang, setHariHilang] = useState('0');
  const [tindakanPerbaikan, setTindakanPerbaikan] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setTanggal(`${year}-11-15`);
    setKategori('Near Miss');
    setUnitKerja('');
    setDeskripsi('');
    setHariHilang('0');
    setTindakanPerbaikan('');
    setModalOpen(true);
  };

  const openEditModal = (inc: K3IncidentLog) => {
    setEditingId(inc.id);
    setTanggal(inc.tanggal);
    setKategori(inc.kategori);
    setUnitKerja(inc.unitKerja);
    setDeskripsi(inc.deskripsi);
    setHariHilang(String(inc.hariHilang));
    setTindakanPerbaikan(inc.tindakanPerbaikan);
    setModalOpen(true);
  };

  const recordable = calculateRecordableIncidents(summary);
  const tsir = calculateTSIR(summary);
  const ltifr = calculateLTIFR(summary);
  const severityRate = calculateSeverityRate(summary);

  const tsirTrend = ([2023, 2024, 2025] as ReportYear[]).map((y) => ({
    year: y,
    value: Number(calculateTSIR(summaries[y]).toFixed(3)),
  }));

  const handleFieldChange = (field: keyof K3YearSummary, value: number | string) => {
    onUpdateSummary(year, {
      ...summary,
      [field]: value,
    });
  };

  const handleAddIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: K3IncidentLog = {
      id: editingId || `inc-${Date.now()}`,
      year,
      tanggal,
      kategori,
      unitKerja: unitKerja.trim(),
      deskripsi: deskripsi.trim(),
      hariHilang: Number(hariHilang) || 0,
      tindakanPerbaikan: tindakanPerbaikan.trim(),
    };

    if (editingId) {
      onUpdateIncident(payload);
    } else {
      onAddIncident(payload);
      // Sync counters automatically when logging a new incident
      const next = { ...summary };
      if (kategori === 'Near Miss') next.nearMiss += 1;
      if (kategori === 'First Aid') next.firstAid += 1;
      if (kategori === 'Medical Treatment') next.medicalTreatment += 1;
      if (kategori === 'Restricted Work') next.restrictedWork += 1;
      if (kategori === 'Lost Time Injury') {
        next.lti += 1;
        next.hariHilang += Number(hariHilang) || 0;
      }
      if (kategori === 'Fatality') {
        next.fatality += 1;
        next.hariHilang += Number(hariHilang) || 0;
      }
      onUpdateSummary(year, next);
    }

    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `K3_TSIR_${year}.csv`,
      ['Tanggal', 'Kategori', 'Unit Kerja', 'Deskripsi', 'Hari Hilang', 'Tindakan Perbaikan'],
      yearIncidents.map((i) => [
        i.tanggal,
        i.kategori,
        i.unitKerja,
        i.deskripsi,
        i.hariHilang,
        i.tindakanPerbaikan,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="02 / KESELAMATAN & KESEHATAN KERJA (K3)"
        title="Kinerja K3, Jam Kerja Zero Accident & Kalkulator TSIR"
        subtitle="Pemantauan kejadian kecelakaan kerja, akumulasi jam kerja selamat tanpa hari hilang (Zero Accident), serta perhitungan otomatis Total Safety Incident Rate (TSIR) dan LTIFR."
        standardRef="GRI 403-9 · ISO 45001:2018 · SMK3 PP 50/2012"
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
              Catat Kejadian K3
            </button>
          </>
        }
      />

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Jam Kerja Zero Accident Kumulatif`}
          value={formatNumber(summary.jamKerjaZeroAccidentKumulatif)}
          unit="Jam"
          context={`${formatNumber(summary.jamKerjaSelamat)} jam kerja pada tahun ${year}`}
          tone="positive"
        />
        <KpiCard
          label={`TSIR (Total Safety Incident Rate)`}
          value={tsir.toFixed(3)}
          unit={`per ${formatNumber(summary.basisPerhitungan)} jam`}
          context={`${recordable} kejadian recordable (MTC + RWC + LTI + Fatality)`}
          tone={tsir <= 0.15 ? 'positive' : 'warning'}
        />
        <KpiCard
          label="LTIFR (Lost Time Injury Rate)"
          value={ltifr.toFixed(3)}
          unit={`per ${formatNumber(summary.basisPerhitungan)} jam`}
          context={`LTI: ${summary.lti} · Fatality: ${summary.fatality}`}
          tone={summary.lti === 0 && summary.fatality === 0 ? 'positive' : 'danger'}
        />
        <KpiCard
          label="Severity Rate (Tingkat Keparahan)"
          value={severityRate.toFixed(2)}
          unit="Hari Hilang"
          context={`Total ${summary.hariHilang} hari kerja hilang`}
          tone={summary.hariHilang === 0 ? 'positive' : 'warning'}
        />
      </div>

      {/* Interactive TSIR Calculator + Multi-Year Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 p-6 bg-white border border-stone-200 rounded-xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-900" />
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Kalkulator & Parameter TSIR ({year})
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg no-print">
              <button
                type="button"
                onClick={() => handleFieldChange('basisPerhitungan', 200000)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  summary.basisPerhitungan === 200000
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Basis 200.000 (OSHA)
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('basisPerhitungan', 1000000)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  summary.basisPerhitungan === 1000000
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Basis 1.000.000 (ISO)
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg font-mono text-xs text-stone-700 space-y-1">
            <div>
              TSIR = (Total Recordable Incidents × {formatNumber(summary.basisPerhitungan)}) ÷ Total Jam Kerja Selamat
            </div>
            <div className="text-stone-500">
              = ({recordable} × {formatNumber(summary.basisPerhitungan)}) ÷ {formatNumber(summary.jamKerjaSelamat)} ={' '}
              <span className="font-semibold text-emerald-900">{tsir.toFixed(4)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Jam Kerja Tahun {year}
              </label>
              <input
                type="number"
                min={1}
                value={summary.jamKerjaSelamat}
                onChange={(e) => handleFieldChange('jamKerjaSelamat', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Zero Accident Kumulatif
              </label>
              <input
                type="number"
                min={0}
                value={summary.jamKerjaZeroAccidentKumulatif}
                onChange={(e) =>
                  handleFieldChange('jamKerjaZeroAccidentKumulatif', Number(e.target.value) || 0)
                }
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Medical Treatment (MTC)
              </label>
              <input
                type="number"
                min={0}
                value={summary.medicalTreatment}
                onChange={(e) => handleFieldChange('medicalTreatment', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Restricted Work (RWC)
              </label>
              <input
                type="number"
                min={0}
                value={summary.restrictedWork}
                onChange={(e) => handleFieldChange('restrictedWork', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Lost Time Injury (LTI)
              </label>
              <input
                type="number"
                min={0}
                value={summary.lti}
                onChange={(e) => handleFieldChange('lti', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Fatality
              </label>
              <input
                type="number"
                min={0}
                value={summary.fatality}
                onChange={(e) => handleFieldChange('fatality', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                First Aid (P3K)
              </label>
              <input
                type="number"
                min={0}
                value={summary.firstAid}
                onChange={(e) => handleFieldChange('firstAid', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Near Miss (Hampir Celaka)
              </label>
              <input
                type="number"
                min={0}
                value={summary.nearMiss}
                onChange={(e) => handleFieldChange('nearMiss', Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1">
            <label className="block text-xs font-semibold text-stone-800">
              Catatan Status Zero Accident ({year})
            </label>
            <input
              type="text"
              value={summary.catatanZeroAccident}
              onChange={(e) => handleFieldChange('catatanZeroAccident', e.target.value)}
              className="w-full px-3 py-1.5 text-xs text-stone-700 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
        </div>

        <div className="lg:col-span-5 p-6 bg-white border border-stone-200 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
              Tren Penurunan TSIR (2023–2025)
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Angka lebih rendah menunjukkan peningkatan performa keselamatan kerja
            </p>
            <MultiYearBarChart
              data={tsirTrend}
              primaryLabel="Total Safety Incident Rate (TSIR)"
              formatValue={(v) => v.toFixed(3)}
              primaryColor="#0F766E"
              height={190}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-3 gap-2 text-center">
            {([2023, 2024, 2025] as ReportYear[]).map((y) => (
              <div key={y} className="p-2 bg-stone-50 rounded-lg">
                <div className="text-[11px] text-stone-500">{y}</div>
                <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                  {calculateRecordableIncidents(summaries[y])} Recordable
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Log Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Log Kejadian Kecelakaan & Near Miss Tahun {year}
          </h2>
          <p className="text-xs text-stone-500">
            Dokumentasi investigasi insiden dan tindakan perbaikan (CAPA)
          </p>
        </div>
        {yearIncidents.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500">
            Tidak ada log insiden yang tercatat pada tahun {year}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Unit Kerja</th>
                  <th className="py-3 px-4">Uraian Kejadian & Tindakan Perbaikan</th>
                  <th className="py-3 px-4 text-right">Hari Hilang</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {yearIncidents.map((inc) => {
                  const tone =
                    inc.kategori === 'Lost Time Injury' || inc.kategori === 'Fatality'
                      ? 'danger'
                      : inc.kategori === 'Medical Treatment' || inc.kategori === 'Restricted Work'
                        ? 'warning'
                        : 'neutral';
                  return (
                    <tr key={inc.id} className="hover:bg-stone-50/70">
                      <td className="py-3.5 px-4 font-mono text-xs text-stone-600 whitespace-nowrap tabular-nums">
                        {inc.tanggal}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText tone={tone} label={inc.kategori} />
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-stone-800 whitespace-nowrap">
                        {inc.unitKerja}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-700 max-w-md">
                        <div className="font-medium text-stone-900">{inc.deskripsi}</div>
                        <div className="mt-1 text-stone-500">CAPA: {inc.tindakanPerbaikan}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                        {inc.hariHilang}
                      </td>
                      <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(inc)}
                          className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                          aria-label="Edit log kejadian"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteIncident(inc.id)}
                          className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                          aria-label="Hapus log kejadian"
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
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Log Kejadian K3 (${year})` : `Catat Kejadian K3 (${year})`}
        subtitle="Kelola dokumentasi insiden keselamatan kerja"
      >
        <form onSubmit={handleAddIncidentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as K3IncidentLog['kategori'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Near Miss">Near Miss</option>
                <option value="First Aid">First Aid</option>
                <option value="Medical Treatment">Medical Treatment (Recordable)</option>
                <option value="Restricted Work">Restricted Work (Recordable)</option>
                <option value="Lost Time Injury">Lost Time Injury (LTI)</option>
                <option value="Fatality">Fatality</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Unit Kerja / Area</label>
              <input
                type="text"
                required
                placeholder="Contoh: Lini Produksi 1 Karawang"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Hari Kerja Hilang</label>
              <input
                type="number"
                min={0}
                value={hariHilang}
                onChange={(e) => setHariHilang(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Deskripsi Kejadian</label>
            <textarea
              rows={2}
              required
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Tindakan Perbaikan (CAPA)</label>
            <textarea
              rows={2}
              required
              value={tindakanPerbaikan}
              onChange={(e) => setTindakanPerbaikan(e.target.value)}
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
              Simpan Kejadian
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
