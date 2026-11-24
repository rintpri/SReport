import React, { useState } from 'react';
import { ArrowRight, ArrowLeftRight, Building2, Edit3, FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import coverImage from '../../assets/images/sustainability_report_cover_1795423870059.jpg';
import { EsgDataset, ReportYear, SectionId } from '../../types/esg';
import {
  calculateEntryEmissionsTonCO2e,
  calculateEntryGJ,
  calculateTSIR,
  formatIDRCompact,
  formatNumber,
  getWorkforceTotals,
} from '../../utils/formatters';
import { exportDatasetToExcel } from '../../services/excelSync';
import { HorizontalBarList, MultiYearBarChart } from '../Charts';
import { KpiCard, Modal } from '../UiPrimitives';

interface OverviewSectionProps {
  data: EsgDataset;
  year: ReportYear;
  onSelectSection: (section: SectionId) => void;
  onUpdateCompany: (updated: EsgDataset['company']) => void;
  onPrintReport: () => void;
  onExportFullJson: () => void;
  onOpenProfileManager: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  data,
  year,
  onSelectSection,
  onUpdateCompany,
  onPrintReport,
  onExportFullJson,
  onOpenProfileManager,
}) => {
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [formState, setFormState] = useState(data.company);
  const [imgError, setImgError] = useState(false);

  const years: ReportYear[] = [2023, 2024, 2025];

  // Computed KPIs for selected year
  const csrYearPrograms = data.csrPrograms.filter((p) => p.year === year);
  const totalCsrRealisasi = csrYearPrograms.reduce((acc, p) => acc + p.realisasiRp, 0);

  const k3Summary = data.k3Summaries[year];
  const tsir = calculateTSIR(k3Summary);

  const wfTotals = getWorkforceTotals(data.workforce[year]);

  const yearTrainings = data.trainings.filter((t) => t.year === year);
  const totalTrainingHours = yearTrainings.reduce(
    (acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta,
    0
  );
  const avgTrainingHours =
    wfTotals.totalKaryawan > 0 ? totalTrainingHours / wfTotals.totalKaryawan : 0;

  const yearEnergy = data.energyEntries.filter((e) => e.year === year);
  const totalGJ = yearEnergy.reduce((acc, e) => acc + calculateEntryGJ(e), 0);
  const renewableGJ = yearEnergy
    .filter((e) => e.kategori === 'Energi Terbarukan')
    .reduce((acc, e) => acc + calculateEntryGJ(e), 0);
  const renewableShare = totalGJ > 0 ? (renewableGJ / totalGJ) * 100 : 0;

  const envYear = data.environment[year];
  const totalAirM3 =
    envYear.air.airTanahM3 +
    envYear.air.pdamM3 +
    envYear.air.airPermukaanM3 +
    envYear.air.airDaurUlangM3;
  const scope1And2Emissions = yearEnergy.reduce(
    (acc, e) => acc + calculateEntryEmissionsTonCO2e(e),
    0
  );
  const totalHayatiHa =
    envYear.tanamanHayati.luasanKonservasiHa +
    envYear.tanamanHayati.luasanRehabilitasiHa +
    envYear.tanamanHayati.luasanRthPabrikHa;

  const mktYear = data.marketing[year];
  const revDN = mktYear.pasarDN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);
  const revLN = mktYear.pasarLN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);

  const scYear = data.supplyChain.filter((s) => s.year === year);
  const totalSuppliers = scYear.reduce((acc, s) => acc + s.jumlahPemasok, 0);
  const totalProcurement = scYear.reduce((acc, s) => acc + s.nilaiPengadaanMiliarRp, 0);

  const activeCerts = data.certifications.filter((c) => c.tipe === 'Sertifikasi').length;
  const totalAwards = data.certifications.filter((c) => c.tipe === 'Penghargaan').length;

  const csrMultiYear = years.map((y) => ({
    year: y,
    value: data.csrPrograms
      .filter((p) => p.year === y)
      .reduce((acc, p) => acc + p.realisasiRp / 1_000_000_000, 0),
  }));

  const energyMultiYear = years.map((y) => ({
    year: y,
    value: data.energyEntries
      .filter((e) => e.year === y)
      .reduce((acc, e) => acc + calculateEntryGJ(e), 0),
    secondaryValue: data.energyEntries
      .filter((e) => e.year === y && e.kategori === 'Energi Terbarukan')
      .reduce((acc, e) => acc + calculateEntryGJ(e), 0),
  }));

  const pillarDirectory: {
    id: SectionId;
    num: string;
    title: string;
    metric: string;
    detail: string;
  }[] = [
    {
      id: 'csr',
      num: '01',
      title: 'Tanggung Jawab Sosial (CSR)',
      metric: formatIDRCompact(totalCsrRealisasi),
      detail: `${csrYearPrograms.length} program terealisasi lintas 5 pilar komunitas`,
    },
    {
      id: 'k3',
      num: '02',
      title: 'Keselamatan Kerja (K3 & TSIR)',
      metric: `TSIR ${tsir.toFixed(2)}`,
      detail: `${formatNumber(k3Summary.jamKerjaZeroAccidentKumulatif)} jam kerja selamat kumulatif`,
    },
    {
      id: 'pelatihan',
      num: '03',
      title: 'Pelatihan & Pengembangan',
      metric: `${formatNumber(avgTrainingHours, 1)} Jam/Karyawan`,
      detail: `${formatNumber(totalTrainingHours)} total jam pelatihan di 5 level jabatan`,
    },
    {
      id: 'kinerja-sosial',
      num: '04',
      title: 'Kinerja Sosial & SDM',
      metric: `${formatNumber(wfTotals.totalKaryawan)} Karyawan`,
      detail: `Tetap ${((wfTotals.totalTetap / Math.max(wfTotals.totalKaryawan, 1)) * 100).toFixed(1)}% · TKA ${wfTotals.totalTka} orang`,
    },
    {
      id: 'energi',
      num: '05',
      title: 'Konsumsi Energi (GJ)',
      metric: `${formatNumber(totalGJ)} GJ`,
      detail: `Porsi energi terbarukan ${renewableShare.toFixed(1)}% dari total bauran`,
    },
    {
      id: 'lingkungan',
      num: '06',
      title: 'Pengelolaan Lingkungan',
      metric: `${formatNumber(scope1And2Emissions)} tCO₂e`,
      detail: `Air ${formatNumber(totalAirM3)} m³ · Area hayati ${formatNumber(totalHayatiHa, 1)} Ha`,
    },
    {
      id: 'pemasaran',
      num: '07',
      title: 'Pemasaran (DN & LN)',
      metric: `Rp ${formatNumber(revDN + revLN)} M`,
      detail: `Domestik ${((revDN / Math.max(revDN + revLN, 1)) * 100).toFixed(0)}% · Ekspor ${((revLN / Math.max(revDN + revLN, 1)) * 100).toFixed(0)}%`,
    },
    {
      id: 'supply-chain',
      num: '08',
      title: 'Rantai Pasok (Supply Chain)',
      metric: `${formatNumber(totalSuppliers)} Pemasok`,
      detail: `Nilai pengadaan Rp ${formatNumber(totalProcurement)} Miliar`,
    },
    {
      id: 'penghargaan',
      num: '09',
      title: 'Penghargaan & Sertifikasi',
      metric: `${activeCerts} ISO · ${totalAwards} Award`,
      detail: 'ISO 9001, 14001, 45001, 50001, SMK3 & PROPER',
    },
    {
      id: 'asosiasi',
      num: '10',
      title: 'Keanggotaan Asosiasi',
      metric: `${data.associations.length} Organisasi`,
      detail: 'KADIN, APINDO, IGCN, AEI, FK3IN & AKIKB',
    },
  ];

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany(formState);
    setEditProfileOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Hero Masthead */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-stone-200 rounded-xl overflow-hidden items-stretch">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
              <span className="font-mono text-emerald-900">TAHUN BUKU {year}</span>
              <span aria-hidden="true">·</span>
              <span>{data.company.standarAcuan}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 leading-tight">
              Laporan Keberlanjutan {data.company.namaPerusahaan}
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
              {data.company.ringkasanDireksi}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                {data.company.sektorUsaha}
              </span>
              <span aria-hidden="true">·</span>
              <span>{data.company.lokasiOperasional}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Produksi {year}: {formatNumber(data.company.volumeProduksiTon[year])} Ton
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-100 no-print">
            <button
              type="button"
              onClick={onPrintReport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF Ringkasan
            </button>
            <button
              type="button"
              onClick={() => exportDatasetToExcel(data)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Simpan Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('spreadsheet')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-900" />
              Excel, HTML & Sheets
            </button>
            <button
              type="button"
              onClick={onOpenProfileManager}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Ganti Profil
            </button>
            <button
              type="button"
              onClick={() => {
                setFormState(data.company);
                setEditProfileOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ubah Profil
            </button>
            <button
              type="button"
              onClick={onExportFullJson}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0"
            >
              Ekspor JSON
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[240px] bg-stone-100">
          {!imgError ? (
            <img
              src={coverImage}
              alt="Fasilitas industri berkelanjutan dengan panel surya dan kawasan hutan penyangga"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          ) : (
            <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-950 to-stone-900 text-stone-200 text-center">
              <span className="font-serif text-lg font-medium">{data.company.namaPerusahaan}</span>
              <span className="mt-1 text-xs text-stone-400">Laporan Kinerja Keberlanjutan {year}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <div className="text-xs font-medium text-stone-200">
              Operasional Terintegrasi · Zero LTI {year === 2023 ? 'Baseline' : 'Terjaga'}
            </div>
          </div>
        </div>
      </section>

      {/* Top-Level Executive KPI Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Realisasi Dana CSR (${year})`}
          value={formatIDRCompact(totalCsrRealisasi)}
          context={`${csrYearPrograms.length} program aktif di wilayah operasi`}
          tone="positive"
        />
        <KpiCard
          label={`TSIR Keselamatan Kerja (${year})`}
          value={tsir.toFixed(2)}
          unit={`per ${formatNumber(k3Summary.basisPerhitungan)} jam`}
          context={`${formatNumber(k3Summary.jamKerjaZeroAccidentKumulatif)} jam Zero Accident kumulatif`}
          tone={tsir <= 0.15 ? 'positive' : 'warning'}
        />
        <KpiCard
          label={`Total Konsumsi Energi (${year})`}
          value={formatNumber(totalGJ)}
          unit="GJ"
          context={`Porsi EBT ${renewableShare.toFixed(1)}% · Intensitas ${(totalGJ / Math.max(data.company.volumeProduksiTon[year], 1)).toFixed(2)} GJ/Ton`}
        />
        <KpiCard
          label={`Emisi GRK Scope 1 & 2 (${year})`}
          value={formatNumber(scope1And2Emissions)}
          unit="tCO₂e"
          context={`Area konservasi hayati ${formatNumber(totalHayatiHa, 1)} Hektar`}
        />
      </section>

      {/* Multi-Year Trend Comparison */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Tren Penyaluran Dana CSR (2023–2025)
            </h2>
            <p className="text-xs text-stone-500">
              Realisasi investasi sosial masyarakat dalam Miliar Rupiah per tahun buku
            </p>
          </div>
          <MultiYearBarChart
            data={csrMultiYear}
            primaryLabel="Realisasi Dana CSR (Rp Miliar)"
            formatValue={(v) => `Rp ${v.toFixed(2)} M`}
            primaryColor="#14532D"
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Tren Konsumsi Energi & Transisi EBT (2023–2025)
            </h2>
            <p className="text-xs text-stone-500">
              Total energi dalam Gigajoule (GJ) dibandingkan porsi Energi Baru Terbarukan (PLTS)
            </p>
          </div>
          <MultiYearBarChart
            data={energyMultiYear}
            primaryLabel="Total Energi (GJ)"
            secondaryLabel="Energi Terbarukan (GJ)"
            formatValue={(v) => `${formatNumber(v)} GJ`}
            primaryColor="#334155"
            secondaryColor="#16A34A"
          />
        </div>
      </section>

      {/* 10 Pillars Directory */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-900">
              Direktori 10 Pilar Laporan Keberlanjutan ({year})
            </h2>
            <p className="text-xs text-stone-500">
              Pilih salah satu pilar untuk melihat rincian data, rumus kalkulasi, dan pemutakhiran data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pillarDirectory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className="group flex flex-col justify-between p-5 text-left bg-white border border-stone-200 rounded-xl hover:border-emerald-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-xs font-medium text-emerald-900">
                    Pilar {item.num}
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-emerald-900 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-900 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <div className="font-mono text-lg font-semibold text-stone-900 tabular-nums">
                  {item.metric}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">{item.detail}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Market & Workforce Snapshot */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Ringkasan Jam Pelatihan per Jabatan ({year})
              </h2>
              <p className="text-xs text-stone-500">Akumulasi jam pelatihan karyawan berdasarkan jenjang jabatan</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSection('pelatihan')}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap shrink-0"
            >
              Lihat Detail
            </button>
          </div>
          <HorizontalBarList
            items={data.workforce[year].jabatanBreakdown.map((jb) => {
              const hrs = yearTrainings
                .filter((t) => t.jabatan === jb.jabatan)
                .reduce((acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta, 0);
              return {
                label: jb.jabatan,
                value: hrs,
                secondaryLabel: `${jb.lakiLaki + jb.perempuan} org`,
              };
            })}
            formatValue={(v) => `${formatNumber(v)} Jam`}
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Komposisi Rantai Pasok ({year})
              </h2>
              <p className="text-xs text-stone-500">Nilai pengadaan (Rp Miliar) menurut kategori pemasok</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSection('supply-chain')}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap shrink-0"
            >
              Lihat Detail
            </button>
          </div>
          <HorizontalBarList
            items={scYear.map((s) => ({
              label: s.kategoriPemasok,
              value: s.nilaiPengadaanMiliarRp,
              secondaryLabel: `${s.jumlahPemasok} pemasok`,
            }))}
            formatValue={(v) => `Rp ${formatNumber(v)} M`}
            defaultColor="#1E3A8A"
          />
        </div>
      </section>

      {/* Edit Company Modal */}
      <Modal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Ubah Profil Perusahaan Pelapor"
        subtitle="Informasi identitas entitas pada sampul dan ringkasan laporan"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              type="text"
              required
              value={formState.namaPerusahaan}
              onChange={(e) => setFormState({ ...formState, namaPerusahaan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Sektor Usaha
            </label>
            <input
              type="text"
              required
              value={formState.sektorUsaha}
              onChange={(e) => setFormState({ ...formState, sektorUsaha: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Lokasi Operasional
            </label>
            <input
              type="text"
              required
              value={formState.lokasiOperasional}
              onChange={(e) => setFormState({ ...formState, lokasiOperasional: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Volume Produksi Tahun {year} (Ton)
            </label>
            <input
              type="number"
              min={1}
              required
              value={formState.volumeProduksiTon[year]}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  volumeProduksiTon: {
                    ...formState.volumeProduksiTon,
                    [year]: Number(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Ringkasan Pernyataan Keberlanjutan
            </label>
            <textarea
              rows={3}
              required
              value={formState.ringkasanDireksi}
              onChange={(e) => setFormState({ ...formState, ringkasanDireksi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditProfileOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
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
    </div>
  );
};
