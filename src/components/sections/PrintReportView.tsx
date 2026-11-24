import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { EsgDataset, ReportYear } from '../../types/esg';
import {
  calculateEntryEmissionsTonCO2e,
  calculateEntryGJ,
  calculateLTIFR,
  calculateTSIR,
  formatIDRCompact,
  formatNumber,
  getWorkforceTotals,
} from '../../utils/formatters';

interface PrintReportViewProps {
  data: EsgDataset;
  year: ReportYear;
  onClose: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ data, year, onClose }) => {
  const csrPrograms = data.csrPrograms.filter((p) => p.year === year);
  const totalCsr = csrPrograms.reduce((acc, p) => acc + p.realisasiRp, 0);

  const k3 = data.k3Summaries[year];
  const tsir = calculateTSIR(k3);
  const ltifr = calculateLTIFR(k3);

  const wf = data.workforce[year];
  const wfTotals = getWorkforceTotals(wf);

  const trainings = data.trainings.filter((t) => t.year === year);
  const totalTrainingHours = trainings.reduce(
    (acc, t) => acc + t.jumlahPeserta * t.durasiJamPerPeserta,
    0
  );

  const energy = data.energyEntries.filter((e) => e.year === year);
  const totalGJ = energy.reduce((acc, e) => acc + calculateEntryGJ(e), 0);

  const env = data.environment[year];
  const totalAir =
    env.air.airTanahM3 +
    env.air.pdamM3 +
    env.air.airPermukaanM3 +
    env.air.airDaurUlangM3;
  const totalNonB3 = env.limbahNonB3.reduce((acc, w) => acc + w.jumlahTon, 0);
  const totalB3 = env.limbahB3.reduce((acc, w) => acc + w.jumlahTon, 0);
  const totalEmisi12 = energy.reduce((acc, e) => acc + calculateEntryEmissionsTonCO2e(e), 0);
  const totalHayatiHa =
    env.tanamanHayati.luasanKonservasiHa +
    env.tanamanHayati.luasanRehabilitasiHa +
    env.tanamanHayati.luasanRthPabrikHa;

  const mkt = data.marketing[year];
  const revDN = mkt.pasarDN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);
  const revLN = mkt.pasarLN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);

  const sc = data.supplyChain.filter((s) => s.year === year);
  const totalSuppliers = sc.reduce((acc, s) => acc + s.jumlahPemasok, 0);
  const totalSpend = sc.reduce((acc, s) => acc + s.nilaiPengadaanMiliarRp, 0);

  return (
    <div className="min-h-screen bg-white text-stone-900">
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-stone-900 text-white no-print">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </button>
        <div className="text-xs text-stone-300">
          Pratinjau Cetak Ringkasan Laporan Keberlanjutan {year}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 rounded-lg"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak / Simpan PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <header className="pb-6 border-b-2 border-stone-900 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-900">
            Laporan Keberlanjutan · Tahun Buku {year}
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            {data.company.namaPerusahaan}
          </h1>
          <p className="text-xs text-stone-600">
            {data.company.sektorUsaha} · {data.company.lokasiOperasional} · {data.company.standarAcuan}
          </p>
          <p className="pt-2 text-sm text-stone-700 leading-relaxed">{data.company.ringkasanDireksi}</p>
        </header>

        <section className="space-y-2 print-break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
            01. Tanggung Jawab Sosial Perusahaan (CSR)
          </h2>
          <p className="text-xs text-stone-600">
            Total Dana Disalurkan: <strong className="font-mono">{formatIDRCompact(totalCsr)}</strong> melalui {csrPrograms.length} program.
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-stone-500">
                <th className="py-1.5 text-left">Program</th>
                <th className="py-1.5 text-left">Pilar</th>
                <th className="py-1.5 text-right">Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {csrPrograms.map((p) => (
                <tr key={p.id}>
                  <td className="py-1.5">{p.namaProgram}</td>
                  <td className="py-1.5">{p.pilar}</td>
                  <td className="py-1.5 text-right font-mono">{formatIDRCompact(p.realisasiRp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-2 print-break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
            02. Keselamatan & Kesehatan Kerja (K3 & TSIR)
          </h2>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">Zero Accident Kumulatif</div>
              <div className="font-mono font-semibold">{formatNumber(k3.jamKerjaZeroAccidentKumulatif)} Jam</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">TSIR (Basis {formatNumber(k3.basisPerhitungan)})</div>
              <div className="font-mono font-semibold">{tsir.toFixed(3)}</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">LTIFR</div>
              <div className="font-mono font-semibold">{ltifr.toFixed(3)}</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">LTI / Fatality</div>
              <div className="font-mono font-semibold">{k3.lti} / {k3.fatality}</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6 print-break-inside-avoid">
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              03. Pelatihan Karyawan
            </h2>
            <p className="text-xs text-stone-700">
              Total Jam Pelatihan: <strong className="font-mono">{formatNumber(totalTrainingHours)} Jam</strong> · Rata-rata:{' '}
              <strong className="font-mono">
                {(wfTotals.totalKaryawan ? totalTrainingHours / wfTotals.totalKaryawan : 0).toFixed(1)} Jam/Karyawan
              </strong>
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              04. Kinerja Sosial & SDM
            </h2>
            <p className="text-xs text-stone-700">
              Total: <strong className="font-mono">{formatNumber(wfTotals.totalKaryawan)}</strong> · Laki/Perempuan:{' '}
              <strong className="font-mono">{wfTotals.totalLaki}/{wfTotals.totalPerempuan}</strong> · Tetap/Kontrak:{' '}
              <strong className="font-mono">{wfTotals.totalTetap}/{wfTotals.totalKontrak}</strong> · Lokal/TKA:{' '}
              <strong className="font-mono">{wfTotals.totalLokal}/{wfTotals.totalTka}</strong>
            </p>
          </div>
        </section>

        <section className="space-y-2 print-break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
            05. Konsumsi Energi dalam Gigajoule (GJ)
          </h2>
          <p className="text-xs text-stone-600">
            Total Konsumsi Energi: <strong className="font-mono">{formatNumber(totalGJ, 1)} GJ</strong>
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-stone-500">
                <th className="py-1.5 text-left">Sumber Energi</th>
                <th className="py-1.5 text-right">Konsumsi Fisik</th>
                <th className="py-1.5 text-right">Energi (GJ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {energy.map((e) => (
                <tr key={e.id}>
                  <td className="py-1.5">{e.sumber}</td>
                  <td className="py-1.5 text-right font-mono">{formatNumber(e.konsumsiAsli)} {e.unitAsli}</td>
                  <td className="py-1.5 text-right font-mono">{formatNumber(calculateEntryGJ(e), 1)} GJ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-2 print-break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
            06. Kinerja Lingkungan & Tanaman Hayati
          </h2>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">Pemakaian Air</div>
              <div className="font-mono font-semibold">{formatNumber(totalAir)} m³</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">Limbah Non-B3 / B3</div>
              <div className="font-mono font-semibold">{formatNumber(totalNonB3, 1)} / {formatNumber(totalB3, 1)} Ton</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">Emisi Scope 1 & 2</div>
              <div className="font-mono font-semibold">{formatNumber(totalEmisi12)} tCO₂e</div>
            </div>
            <div className="p-2.5 border border-stone-200 rounded">
              <div className="text-stone-500">Area Tanaman Hayati</div>
              <div className="font-mono font-semibold">{formatNumber(totalHayatiHa, 1)} Ha</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6 print-break-inside-avoid">
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              07. Pemasaran (DN & LN)
            </h2>
            <p className="text-xs text-stone-700">
              Dalam Negeri: <strong className="font-mono">Rp {formatNumber(revDN)} M</strong> · Luar Negeri:{' '}
              <strong className="font-mono">Rp {formatNumber(revLN)} M</strong>
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              08. Rantai Pasok (Supply Chain)
            </h2>
            <p className="text-xs text-stone-700">
              Total Pemasok: <strong className="font-mono">{formatNumber(totalSuppliers)} entitas</strong> · Nilai Pengadaan:{' '}
              <strong className="font-mono">Rp {formatNumber(totalSpend)} M</strong>
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6 print-break-inside-avoid">
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              09. Sertifikasi & Penghargaan
            </h2>
            <ul className="text-xs text-stone-700 space-y-1 list-disc pl-4">
              {data.certifications.slice(0, 6).map((c) => (
                <li key={c.id}>{c.nama} ({c.lembagaPenerbit})</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold border-b border-stone-200 pb-1">
              10. Keanggotaan Asosiasi
            </h2>
            <ul className="text-xs text-stone-700 space-y-1 list-disc pl-4">
              {data.associations.map((a) => (
                <li key={a.id}>{a.singkatan} — {a.peran} ({a.tingkat})</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};
