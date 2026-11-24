import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { B3WasteItem, EnergySourceEntry, EnvironmentYearData, NonB3WasteItem, ReportYear } from '../../types/esg';
import { calculateEntryEmissionsTonCO2e, exportToCSV, formatNumber } from '../../utils/formatters';
import { HorizontalBarList, StackedProportionBar } from '../Charts';
import { KpiCard, Modal, SectionHeader, StatusText } from '../UiPrimitives';

interface LingkunganSectionProps {
  environment: Record<ReportYear, EnvironmentYearData>;
  energyEntries: EnergySourceEntry[];
  year: ReportYear;
  onUpdateEnvironment: (year: ReportYear, updated: EnvironmentYearData) => void;
}

export const LingkunganSection: React.FC<LingkunganSectionProps> = ({
  environment,
  energyEntries,
  year,
  onUpdateEnvironment,
}) => {
  const env = environment[year];
  const yearEnergy = energyEntries.filter((e) => e.year === year);

  const [editWaterModal, setEditWaterModal] = useState(false);
  const [waterDraft, setWaterDraft] = useState(env.air);
  const [hayatiDraft, setHayatiDraft] = useState(env.tanamanHayati);
  const [scope3Draft, setScope3Draft] = useState(env.emisiScope3TonCO2e);

  const [addWasteModal, setAddWasteModal] = useState<'nonb3' | 'b3' | null>(null);
  const [editingWasteId, setEditingWasteId] = useState<string | null>(null);
  const [wJenis, setWJenis] = useState('');
  const [wTon, setWTon] = useState('5.5');
  const [wExtra1, setWExtra1] = useState('');
  const [wExtra2, setWExtra2] = useState('90');
  const [wManifest, setWManifest] = useState<B3WasteItem['statusManifest']>('Manifest SIRAJA Lengkap');

  const openAddNonB3 = () => {
    setEditingWasteId(null);
    setWJenis('');
    setWTon('5.5');
    setWExtra1('Daur Ulang Pihak Ketiga');
    setWExtra2('90');
    setAddWasteModal('nonb3');
  };

  const openEditNonB3 = (item: NonB3WasteItem) => {
    setEditingWasteId(item.id);
    setWJenis(item.jenis);
    setWTon(String(item.jumlahTon));
    setWExtra1(item.metodeKelola);
    setWExtra2(String(item.persentaseDaurUlang));
    setAddWasteModal('nonb3');
  };

  const openAddB3 = () => {
    setEditingWasteId(null);
    setWJenis('');
    setWTon('2.5');
    setWExtra1('B105d');
    setWExtra2('PT Prasadha Pamunah Limbah Industri');
    setWManifest('Manifest SIRAJA Lengkap');
    setAddWasteModal('b3');
  };

  const openEditB3 = (item: B3WasteItem) => {
    setEditingWasteId(item.id);
    setWJenis(item.jenis);
    setWTon(String(item.jumlahTon));
    setWExtra1(item.kodeLimbah);
    setWExtra2(item.pengelolaBerizin);
    setWManifest(item.statusManifest);
    setAddWasteModal('b3');
  };

  const totalAirM3 =
    env.air.airTanahM3 +
    env.air.pdamM3 +
    env.air.airPermukaanM3 +
    env.air.airDaurUlangM3;
  const pctAirDaurUlang = totalAirM3 > 0 ? (env.air.airDaurUlangM3 / totalAirM3) * 100 : 0;

  const totalNonB3Ton = env.limbahNonB3.reduce((acc, w) => acc + w.jumlahTon, 0);
  const recycledNonB3Ton = env.limbahNonB3.reduce(
    (acc, w) => acc + (w.jumlahTon * w.persentaseDaurUlang) / 100,
    0
  );
  const pctNonB3Recycle = totalNonB3Ton > 0 ? (recycledNonB3Ton / totalNonB3Ton) * 100 : 0;

  const totalB3Ton = env.limbahB3.reduce((acc, w) => acc + w.jumlahTon, 0);

  // Scope 1 & Scope 2 dynamically derived from Energi data!
  const scope1Ton = yearEnergy
    .filter((e) => e.kategori === 'Bahan Bakar Fosil')
    .reduce((acc, e) => acc + calculateEntryEmissionsTonCO2e(e), 0);
  const scope2Ton = yearEnergy
    .filter((e) => e.kategori === 'Listrik Grid')
    .reduce((acc, e) => acc + calculateEntryEmissionsTonCO2e(e), 0);
  const totalScope1And2 = scope1Ton + scope2Ton;

  const totalHayatiHa =
    env.tanamanHayati.luasanKonservasiHa +
    env.tanamanHayati.luasanRehabilitasiHa +
    env.tanamanHayati.luasanRthPabrikHa;

  const handleSaveEnvParams = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEnvironment(year, {
      ...env,
      air: waterDraft,
      tanamanHayati: hayatiDraft,
      emisiScope3TonCO2e: scope3Draft,
    });
    setEditWaterModal(false);
  };

  const handleAddWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addWasteModal === 'nonb3') {
      const payload: NonB3WasteItem = {
        id: editingWasteId || `nb3-${Date.now()}`,
        jenis: wJenis.trim(),
        jumlahTon: Number(wTon) || 0,
        metodeKelola: wExtra1.trim() || 'Daur Ulang Pihak Ketiga',
        persentaseDaurUlang: Math.min(100, Math.max(0, Number(wExtra2) || 0)),
      };
      onUpdateEnvironment(year, {
        ...env,
        limbahNonB3: editingWasteId
          ? env.limbahNonB3.map((w) => (w.id === editingWasteId ? payload : w))
          : [...env.limbahNonB3, payload],
      });
    } else if (addWasteModal === 'b3') {
      const payload: B3WasteItem = {
        id: editingWasteId || `b3-${Date.now()}`,
        jenis: wJenis.trim(),
        kodeLimbah: wExtra1.trim() || 'B105d',
        jumlahTon: Number(wTon) || 0,
        pengelolaBerizin: wExtra2.trim() || 'Pengelola Berizin KLHK',
        statusManifest: wManifest,
      };
      onUpdateEnvironment(year, {
        ...env,
        limbahB3: editingWasteId
          ? env.limbahB3.map((w) => (w.id === editingWasteId ? payload : w))
          : [...env.limbahB3, payload],
      });
    }
    setEditingWasteId(null);
    setWJenis('');
    setWExtra1('');
    setAddWasteModal(null);
  };

  const handleDeleteNonB3 = (id: string) => {
    onUpdateEnvironment(year, {
      ...env,
      limbahNonB3: env.limbahNonB3.filter((w) => w.id !== id),
    });
  };

  const handleDeleteB3 = (id: string) => {
    onUpdateEnvironment(year, {
      ...env,
      limbahB3: env.limbahB3.filter((w) => w.id !== id),
    });
  };

  const handleExport = () => {
    exportToCSV(
      `Kinerja_Lingkungan_${year}.csv`,
      ['Aspek', 'Parameter', 'Nilai', 'Satuan'],
      [
        ['Air', 'Air Tanah', env.air.airTanahM3, 'm3'],
        ['Air', 'PDAM', env.air.pdamM3, 'm3'],
        ['Air', 'Air Permukaan', env.air.airPermukaanM3, 'm3'],
        ['Air', 'Air Daur Ulang', env.air.airDaurUlangM3, 'm3'],
        ['Limbah', 'Total Limbah Non-B3', totalNonB3Ton.toFixed(2), 'Ton'],
        ['Limbah', 'Total Limbah B3', totalB3Ton.toFixed(2), 'Ton'],
        ['Emisi', 'Scope 1 (Pembakaran Fosil)', scope1Ton.toFixed(1), 'tCO2e'],
        ['Emisi', 'Scope 2 (Listrik Grid)', scope2Ton.toFixed(1), 'tCO2e'],
        ['Emisi', 'Scope 3 (Rantai Nilai)', env.emisiScope3TonCO2e, 'tCO2e'],
        ['Hayati', 'Total Luasan Tanaman Hayati', totalHayatiHa.toFixed(2), 'Hektar'],
        ['Hayati', 'Jumlah Pohon Tertanam', env.tanamanHayati.jumlahPohonTertanam, 'Pohon'],
      ]
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="06 / PENGELOLAAN LINGKUNGAN & KEANEKARAGAMAN HAYATI"
        title="Pemakaian Air, Limbah Non-B3 & B3, Emisi GRK, dan Luasan Tanaman Hayati"
        subtitle="Pemantauan neraca penggunaan air, rasio daur ulang limbah non-B3, kepatuhan manifest limbah B3, inventarisasi emisi GRK Scope 1–3, serta konservasi area hayati."
        standardRef="GRI 303 · GRI 304 · GRI 305 · GRI 306 · ISO 14001"
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
              onClick={() => {
                setWaterDraft(env.air);
                setHayatiDraft(env.tanamanHayati);
                setScope3Draft(env.emisiScope3TonCO2e);
                setEditWaterModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ubah Data Air & Hayati
            </button>
          </>
        }
      />

      {/* 4 Key Environmental KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Pemakaian Air (${year})`}
          value={formatNumber(totalAirM3)}
          unit="m³"
          context={`Rasio air daur ulang: ${pctAirDaurUlang.toFixed(1)}%`}
          tone="positive"
        />
        <KpiCard
          label="Limbah Non-B3 & B3"
          value={`${formatNumber(totalNonB3Ton, 1)} / ${formatNumber(totalB3Ton, 1)}`}
          unit="Ton"
          context={`Daur ulang Non-B3: ${pctNonB3Recycle.toFixed(1)}% · B3: 100% berizin`}
        />
        <KpiCard
          label="Emisi GRK (Scope 1 & 2)"
          value={formatNumber(totalScope1And2)}
          unit="tCO₂e"
          context={`Scope 1: ${formatNumber(scope1Ton)} · Scope 2: ${formatNumber(scope2Ton)} tCO₂e`}
        />
        <KpiCard
          label="Luasan Tanaman Hayati"
          value={formatNumber(totalHayatiHa, 1)}
          unit="Hektar"
          context={`${formatNumber(env.tanamanHayati.jumlahPohonTertanam)} pohon · ${env.tanamanHayati.spesiesTeridentifikasi} spesies`}
          tone="positive"
        />
      </div>

      {/* Air & Emisi Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Sumber & Pemakaian Air ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Pengurangan ketergantungan air tanah melalui optimalisasi instalasi daur ulang air proses
            </p>
          </div>
          <HorizontalBarList
            items={[
              { label: 'PDAM / Utilitas Kawasan', value: env.air.pdamM3, color: '#1E3A8A' },
              { label: 'Air Daur Ulang (Water Recycling)', value: env.air.airDaurUlangM3, color: '#16A34A' },
              { label: 'Air Permukaan (Sungai Terizin)', value: env.air.airPermukaanM3, color: '#0F766E' },
              { label: 'Air Tanah (Sumur Pantau)', value: env.air.airTanahM3, color: '#64748B' },
            ]}
            formatValue={(v) => `${formatNumber(v)} m³`}
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Inventarisasi Emisi GRK — Scope 1, 2 & 3 ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Scope 1 & 2 dihitung otomatis dari konsumsi energi pada Pilar 05 (dalam ton CO₂ ekuivalen)
            </p>
          </div>
          <StackedProportionBar
            segments={[
              { label: 'Scope 1 (Bahan Bakar Fosil)', value: scope1Ton, color: '#334155' },
              { label: 'Scope 2 (Listrik Grid PLN)', value: scope2Ton, color: '#D97706' },
              { label: 'Scope 3 (Logistik & Rantai Nilai)', value: env.emisiScope3TonCO2e, color: '#64748B' },
            ]}
            formatValue={(v) => `${formatNumber(v)} tCO₂e`}
          />
          <div className="pt-3 border-t border-stone-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <div className="text-[11px] text-stone-500">Scope 1</div>
              <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                {formatNumber(scope1Ton)} tCO₂e
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <div className="text-[11px] text-stone-500">Scope 2</div>
              <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                {formatNumber(scope2Ton)} tCO₂e
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <div className="text-[11px] text-stone-500">Scope 3</div>
              <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                {formatNumber(env.emisiScope3TonCO2e)} tCO₂e
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Limbah Non-B3 Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-2 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Pengelolaan Limbah Non-B3 ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Total timbulan {formatNumber(totalNonB3Ton, 1)} Ton · Tingkat pemanfaatan/daur ulang {pctNonB3Recycle.toFixed(1)}%
            </p>
          </div>
          <button
            type="button"
            onClick={openAddNonB3}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Limbah Non-B3
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Jenis Limbah Non-B3</th>
                <th className="py-3 px-4">Metode Pengelolaan</th>
                <th className="py-3 px-4 text-right">Timbulan (Ton)</th>
                <th className="py-3 px-4 text-right">Rasio Daur Ulang</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {env.limbahNonB3.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4 font-medium text-stone-900">{item.jenis}</td>
                  <td className="py-3.5 px-4 text-xs text-stone-600">{item.metodeKelola}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold tabular-nums">
                    {formatNumber(item.jumlahTon, 1)} Ton
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-900 tabular-nums">
                    {item.persentaseDaurUlang}%
                  </td>
                  <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditNonB3(item)}
                      className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                      aria-label={`Edit ${item.jenis}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNonB3(item.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                      aria-label={`Hapus ${item.jenis}`}
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

      {/* Limbah B3 Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-2 px-6 py-4 border-b border-stone-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Pengelolaan Limbah B3 (Bahan Berbahaya & Beracun) — {year}
            </h2>
            <p className="text-xs text-stone-500">
              Total {formatNumber(totalB3Ton, 1)} Ton diserahkan sepenuhnya kepada pengolah berizin KLHK melalui sistem Festronik / SIRAJA
            </p>
          </div>
          <button
            type="button"
            onClick={openAddB3}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Limbah B3
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Jenis Limbah B3</th>
                <th className="py-3 px-4">Kode Limbah</th>
                <th className="py-3 px-4">Pihak Ketiga Berizin KLHK</th>
                <th className="py-3 px-4 text-right">Jumlah (Ton)</th>
                <th className="py-3 px-4">Kepatuhan Manifest</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {env.limbahB3.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/70">
                  <td className="py-3.5 px-4 font-medium text-stone-900">{item.jenis}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-stone-700">{item.kodeLimbah}</td>
                  <td className="py-3.5 px-4 text-xs text-stone-600">{item.pengelolaBerizin}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold tabular-nums">
                    {formatNumber(item.jumlahTon, 1)} Ton
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusText tone="positive" label={item.statusManifest} />
                  </td>
                  <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditB3(item)}
                      className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                      aria-label={`Edit ${item.jenis}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteB3(item.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                      aria-label={`Hapus ${item.jenis}`}
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

      {/* Luasan Tanaman Hayati */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Luasan Tanaman Hayati & Kawasan Keanekaragaman Hayati ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Total luasan tutupan vegetasi dan kawasan konservasi yang dikelola perusahaan
            </p>
          </div>
          <div className="font-mono text-sm font-semibold text-emerald-900 tabular-nums">
            Total: {formatNumber(totalHayatiHa, 1)} Ha ({formatNumber(totalHayatiHa * 10000)} m²)
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="p-4 bg-stone-50 rounded-lg">
            <div className="text-xs text-stone-500">Kawasan Konservasi & Kehati</div>
            <div className="mt-1 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              {formatNumber(env.tanamanHayati.luasanKonservasiHa, 1)} Ha
            </div>
          </div>
          <div className="p-4 bg-stone-50 rounded-lg">
            <div className="text-xs text-stone-500">Rehabilitasi Mangrove & DAS</div>
            <div className="mt-1 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              {formatNumber(env.tanamanHayati.luasanRehabilitasiHa, 1)} Ha
            </div>
          </div>
          <div className="p-4 bg-stone-50 rounded-lg">
            <div className="text-xs text-stone-500">Ruang Terbuka Hijau (RTH) Pabrik</div>
            <div className="mt-1 font-mono text-lg font-semibold text-stone-900 tabular-nums">
              {formatNumber(env.tanamanHayati.luasanRthPabrikHa, 1)} Ha
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          {env.tanamanHayati.catatanKeanekaragaman}
        </p>
      </div>

      {/* Modal Edit Air, Scope 3 & Hayati */}
      <Modal
        open={editWaterModal}
        onClose={() => setEditWaterModal(false)}
        title={`Perbarui Data Air, Emisi Scope 3 & Tanaman Hayati (${year})`}
      >
        <form onSubmit={handleSaveEnvParams} className="space-y-4">
          <div className="text-xs font-semibold text-stone-800">Pemakaian Air (m³)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Air Tanah (m³)</label>
              <input
                type="number"
                min={0}
                value={waterDraft.airTanahM3}
                onChange={(e) => setWaterDraft({ ...waterDraft, airTanahM3: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">PDAM (m³)</label>
              <input
                type="number"
                min={0}
                value={waterDraft.pdamM3}
                onChange={(e) => setWaterDraft({ ...waterDraft, pdamM3: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Air Permukaan (m³)</label>
              <input
                type="number"
                min={0}
                value={waterDraft.airPermukaanM3}
                onChange={(e) => setWaterDraft({ ...waterDraft, airPermukaanM3: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Air Daur Ulang (m³)</label>
              <input
                type="number"
                min={0}
                value={waterDraft.airDaurUlangM3}
                onChange={(e) => setWaterDraft({ ...waterDraft, airDaurUlangM3: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Emisi Scope 3 — Rantai Nilai & Distribusi (tCO₂e)
            </label>
            <input
              type="number"
              min={0}
              value={scope3Draft}
              onChange={(e) => setScope3Draft(Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
            />
          </div>

          <div className="text-xs font-semibold text-stone-800">Luasan Tanaman Hayati (Hektar)</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Konservasi (Ha)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={hayatiDraft.luasanKonservasiHa}
                onChange={(e) =>
                  setHayatiDraft({ ...hayatiDraft, luasanKonservasiHa: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Rehabilitasi (Ha)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={hayatiDraft.luasanRehabilitasiHa}
                onChange={(e) =>
                  setHayatiDraft({ ...hayatiDraft, luasanRehabilitasiHa: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">RTH Pabrik (Ha)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={hayatiDraft.luasanRthPabrikHa}
                onChange={(e) =>
                  setHayatiDraft({ ...hayatiDraft, luasanRthPabrikHa: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Jumlah Pohon</label>
              <input
                type="number"
                min={0}
                value={hayatiDraft.jumlahPohonTertanam}
                onChange={(e) =>
                  setHayatiDraft({ ...hayatiDraft, jumlahPohonTertanam: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 mb-1">Jumlah Spesies</label>
              <input
                type="number"
                min={0}
                value={hayatiDraft.spesiesTeridentifikasi}
                onChange={(e) =>
                  setHayatiDraft({ ...hayatiDraft, spesiesTeridentifikasi: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditWaterModal(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add/Edit Waste */}
      <Modal
        open={addWasteModal !== null}
        onClose={() => setAddWasteModal(null)}
        title={
          editingWasteId
            ? addWasteModal === 'b3'
              ? `Edit Limbah B3 (${year})`
              : `Edit Limbah Non-B3 (${year})`
            : addWasteModal === 'b3'
              ? `Tambah Limbah B3 (${year})`
              : `Tambah Limbah Non-B3 (${year})`
        }
      >
        <form onSubmit={handleAddWasteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Jenis Limbah</label>
            <input
              type="text"
              required
              value={wJenis}
              onChange={(e) => setWJenis(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Jumlah (Ton)</label>
            <input
              type="number"
              step="0.1"
              min={0}
              required
              value={wTon}
              onChange={(e) => setWTon(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              {addWasteModal === 'b3' ? 'Kode Limbah KLHK' : 'Metode Pengelolaan'}
            </label>
            <input
              type="text"
              required
              value={wExtra1}
              onChange={(e) => setWExtra1(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              {addWasteModal === 'b3' ? 'Pengelola Berizin KLHK' : 'Persentase Daur Ulang (%)'}
            </label>
            <input
              type={addWasteModal === 'b3' ? 'text' : 'number'}
              min={0}
              max={100}
              required
              value={wExtra2}
              onChange={(e) => setWExtra2(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          {addWasteModal === 'b3' && (
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Status Manifest</label>
              <select
                value={wManifest}
                onChange={(e) => setWManifest(e.target.value as B3WasteItem['statusManifest'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Manifest SIRAJA Lengkap">Manifest SIRAJA Lengkap</option>
                <option value="Dalam Proses Pengangkutan">Dalam Proses Pengangkutan</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddWasteModal(null)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
