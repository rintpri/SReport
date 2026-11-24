import * as XLSX from 'xlsx';
import {
  AssociationMembership,
  B3WasteItem,
  CertificationAward,
  CsrProgram,
  EnergySourceEntry,
  EsgDataset,
  JabatanComposition,
  K3IncidentLog,
  MarketEntry,
  NonB3WasteItem,
  ProfileWorkspace,
  ReportYear,
  SupplyChainEntry,
  TrainingRecord,
} from '../types/esg';
import {
  calculateEntryEmissionsTonCO2e,
  calculateEntryGJ,
  calculateLTIFR,
  calculateTSIR,
  getWorkforceTotals,
} from '../utils/formatters';

export const EXCEL_SHEET_TABS = [
  'Profil_Ringkasan',
  '01_CSR',
  '02_K3_TSIR',
  '03_Pelatihan',
  '04_Kinerja_Sosial',
  '05_Energi_GJ',
  '06_Lingkungan',
  '07_Pemasaran',
  '08_Supply_Chain',
  '09_Sertifikasi',
  '10_Asosiasi',
] as const;

function autoWidthColumns(rows: (string | number)[][]): { wch: number }[] {
  if (!rows.length) return [];
  const maxCols = Math.max(...rows.map((r) => r.length));
  const widths: { wch: number }[] = [];
  for (let col = 0; col < maxCols; col++) {
    let maxLen = 12;
    for (const row of rows) {
      const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
      if (val.length + 2 > maxLen) {
        maxLen = Math.min(val.length + 2, 48);
      }
    }
    widths.push({ wch: maxLen });
  }
  return widths;
}

function appendSheet(
  wb: XLSX.WorkBook,
  name: string,
  rows: (string | number)[][]
): void {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoWidthColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function buildWorkbookFromDataset(dataset: EsgDataset): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const years: ReportYear[] = [2023, 2024, 2025];

  const profilRows: (string | number)[][] = [
    ['Field', 'Nilai'],
    ['Nama Perusahaan', dataset.company.namaPerusahaan],
    ['Sektor Usaha', dataset.company.sektorUsaha],
    ['Lokasi Operasional', dataset.company.lokasiOperasional],
    ['Standar Acuan', dataset.company.standarAcuan],
    ['Ringkasan Direksi', dataset.company.ringkasanDireksi],
    ['Produksi 2023 (Ton)', dataset.company.volumeProduksiTon[2023]],
    ['Produksi 2024 (Ton)', dataset.company.volumeProduksiTon[2024]],
    ['Produksi 2025 (Ton)', dataset.company.volumeProduksiTon[2025]],
  ];

  const csrRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Nama Program', 'Pilar', 'Lokasi', 'Anggaran (Rp)', 'Realisasi (Rp)', 'Penerima Manfaat', 'Satuan', 'Status'],
    ...dataset.csrPrograms.map((p) => [
      p.id,
      p.year,
      p.namaProgram,
      p.pilar,
      p.lokasi,
      p.anggaranRp,
      p.realisasiRp,
      p.penerimaManfaat,
      p.satuanPenerima,
      p.status,
    ]),
  ];

  const k3Rows: (string | number)[][] = [
    ['Tahun', 'Jam Kerja Selamat', 'Zero Accident Kumulatif', 'Tenaga Kerja', 'Basis TSIR', 'Near Miss', 'First Aid', 'MTC', 'RWC', 'LTI', 'Fatality', 'Hari Hilang', 'TSIR', 'LTIFR', 'Catatan Zero Accident'],
    ...years.map((y) => {
      const s = dataset.k3Summaries[y];
      return [
        y,
        s.jamKerjaSelamat,
        s.jamKerjaZeroAccidentKumulatif,
        s.jumlahTenagaKerja,
        s.basisPerhitungan,
        s.nearMiss,
        s.firstAid,
        s.medicalTreatment,
        s.restrictedWork,
        s.lti,
        s.fatality,
        s.hariHilang,
        Number(calculateTSIR(s).toFixed(4)),
        Number(calculateLTIFR(s).toFixed(4)),
        s.catatanZeroAccident,
      ];
    }),
    [],
    ['Log Insiden ID', 'Tahun', 'Tanggal', 'Kategori', 'Unit Kerja', 'Deskripsi', 'Hari Hilang', 'Tindakan Perbaikan'],
    ...dataset.k3Incidents.map((i) => [
      i.id,
      i.year,
      i.tanggal,
      i.kategori,
      i.unitKerja,
      i.deskripsi,
      i.hariHilang,
      i.tindakanPerbaikan,
    ]),
  ];

  const trainingRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Jabatan', 'Nama Pelatihan', 'Kategori', 'Jumlah Peserta', 'Durasi (Jam/Org)', 'Total Jam Pelatihan', 'Penyelenggara'],
    ...dataset.trainings.map((t) => [
      t.id,
      t.year,
      t.jabatan,
      t.namaPelatihan,
      t.kategori,
      t.jumlahPeserta,
      t.durasiJamPerPeserta,
      t.jumlahPeserta * t.durasiJamPerPeserta,
      t.penyelenggara,
    ]),
  ];

  const workforceRows: (string | number)[][] = [
    ['Tahun', 'Jabatan', 'Laki-laki', 'Perempuan', 'Tetap (PKWTT)', 'Kontrak (PKWT)', 'Lokal (TKI)', 'TKA'],
    ...years.flatMap((y) =>
      dataset.workforce[y].jabatanBreakdown.map((j) => [
        y,
        j.jabatan,
        j.lakiLaki,
        j.perempuan,
        j.tetap,
        j.kontrak,
        j.lokal,
        j.tka,
      ])
    ),
    [],
    ['Ringkasan Tahun', 'Total Karyawan', 'Lokal Ring-1', 'Lokal Nasional', 'TKA', 'Turnover (%)'],
    ...years.map((y) => {
      const wf = dataset.workforce[y];
      const tot = getWorkforceTotals(wf);
      return [y, tot.totalKaryawan, wf.lokalRing1, wf.lokalNasional, tot.totalTka, wf.tingkatTurnoverPersen];
    }),
  ];

  const energyRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Sumber Energi', 'Kategori', 'Unit Fisik', 'Konsumsi Fisik', 'Faktor Konversi GJ', 'Total Energi (GJ)', 'Faktor Emisi (tCO2e/GJ)', 'Estimasi Emisi (tCO2e)', 'Catatan'],
    ...dataset.energyEntries.map((e) => [
      e.id,
      e.year,
      e.sumber,
      e.kategori,
      e.unitAsli,
      e.konsumsiAsli,
      e.faktorKonversiGJ,
      Number(calculateEntryGJ(e).toFixed(2)),
      e.faktorEmisiTonCO2ePerGJ,
      Number(calculateEntryEmissionsTonCO2e(e).toFixed(2)),
      e.catatanFaktor,
    ]),
  ];

  const envRows: (string | number)[][] = [
    ['Tahun', 'Air Tanah (m3)', 'PDAM (m3)', 'Air Permukaan (m3)', 'Air Daur Ulang (m3)', 'Limbah Non-B3 (Ton)', 'Limbah B3 (Ton)', 'Emisi Scope 3 (tCO2e)', 'Konservasi (Ha)', 'Rehabilitasi (Ha)', 'RTH Pabrik (Ha)', 'Pohon Tertanam'],
    ...years.map((y) => {
      const env = dataset.environment[y];
      const nb3 = env.limbahNonB3.reduce((a, w) => a + w.jumlahTon, 0);
      const b3 = env.limbahB3.reduce((a, w) => a + w.jumlahTon, 0);
      return [
        y,
        env.air.airTanahM3,
        env.air.pdamM3,
        env.air.airPermukaanM3,
        env.air.airDaurUlangM3,
        Number(nb3.toFixed(2)),
        Number(b3.toFixed(2)),
        env.emisiScope3TonCO2e,
        env.tanamanHayati.luasanKonservasiHa,
        env.tanamanHayati.luasanRehabilitasiHa,
        env.tanamanHayati.luasanRthPabrikHa,
        env.tanamanHayati.jumlahPohonTertanam,
      ];
    }),
    [],
    ['Log Limbah ID', 'Tahun', 'Klasifikasi', 'Jenis Limbah', 'Jumlah (Ton)', 'Metode / Kode Limbah', 'Pihak Pengelola / Daur Ulang (%)', 'Status Manifest'],
    ...years.flatMap((y) => [
      ...dataset.environment[y].limbahNonB3.map((w) => [
        w.id,
        y,
        'Non-B3',
        w.jenis,
        w.jumlahTon,
        w.metodeKelola,
        w.persentaseDaurUlang,
        '',
      ]),
      ...dataset.environment[y].limbahB3.map((w) => [
        w.id,
        y,
        'B3',
        w.jenis,
        w.jumlahTon,
        w.kodeLimbah,
        w.pengelolaBerizin,
        w.statusManifest,
      ]),
    ]),
  ];

  const mktRows: (string | number)[][] = [
    ['Tahun', 'Tipe Pasar', 'Wilayah / Negara', 'Segmen Produk', 'Volume (Ton)', 'Pendapatan (Rp Miliar)'],
    ...years.flatMap((y) => [
      ...dataset.marketing[y].pasarDN.map((m) => [
        y,
        'Dalam Negeri (DN)',
        m.wilayahAtauNegara,
        m.segmenProduk,
        m.volumeTon,
        m.pendapatanMiliarRp,
      ]),
      ...dataset.marketing[y].pasarLN.map((m) => [
        y,
        'Luar Negeri (LN)',
        m.wilayahAtauNegara,
        m.segmenProduk,
        m.volumeTon,
        m.pendapatanMiliarRp,
      ]),
    ]),
  ];

  const scRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Kategori Pemasok', 'Komoditas', 'Jumlah Pemasok', 'Nilai Pengadaan (Rp Miliar)', 'Lolos Screening ESG (%)', 'Rata-rata TKDN (%)'],
    ...dataset.supplyChain.map((s) => [
      s.id,
      s.year,
      s.kategoriPemasok,
      s.jenisKomoditas,
      s.jumlahPemasok,
      s.nilaiPengadaanMiliarRp,
      s.persentaseLolosScreeningESG,
      s.rataRataTkdnPersen,
    ]),
  ];

  const certRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Tipe', 'Nama Sertifikasi / Penghargaan', 'Nomor', 'Lembaga Penerbit', 'Ruang Lingkup', 'Masa Berlaku', 'Status'],
    ...dataset.certifications.map((c) => [
      c.id,
      c.year,
      c.tipe,
      c.nama,
      c.nomorSertifikat,
      c.lembagaPenerbit,
      c.ruangLingkup,
      c.masaBerlaku,
      c.status,
    ]),
  ];

  const asoRows: (string | number)[][] = [
    ['ID', 'Tahun', 'Singkatan', 'Nama Asosiasi', 'Tingkat', 'Peran', 'Tahun Bergabung', 'Bidang Fokus'],
    ...dataset.associations.map((a) => [
      a.id,
      a.year,
      a.singkatan,
      a.namaAsosiasi,
      a.tingkat,
      a.peran,
      a.tahunBergabung,
      a.bidangFokus,
    ]),
  ];

  appendSheet(wb, 'Profil_Ringkasan', profilRows);
  appendSheet(wb, '01_CSR', csrRows);
  appendSheet(wb, '02_K3_TSIR', k3Rows);
  appendSheet(wb, '03_Pelatihan', trainingRows);
  appendSheet(wb, '04_Kinerja_Sosial', workforceRows);
  appendSheet(wb, '05_Energi_GJ', energyRows);
  appendSheet(wb, '06_Lingkungan', envRows);
  appendSheet(wb, '07_Pemasaran', mktRows);
  appendSheet(wb, '08_Supply_Chain', scRows);
  appendSheet(wb, '09_Sertifikasi', certRows);
  appendSheet(wb, '10_Asosiasi', asoRows);

  return wb;
}

export function exportDatasetToExcel(dataset: EsgDataset, filename?: string): void {
  const wb = buildWorkbookFromDataset(dataset);
  const safeName = dataset.company.namaPerusahaan
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const finalName = filename || `Laporan_Keberlanjutan_${safeName || 'ESG'}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

export function exportAllProfilesToExcel(profiles: ProfileWorkspace[]): void {
  const wb = XLSX.utils.book_new();
  const overviewRows: (string | number)[][] = [
    ['Profile ID', 'Nama Perusahaan', 'Sektor Usaha', 'Lokasi', 'Standar Acuan', 'Program CSR', 'Pelatihan', 'Sumber Energi', 'Sertifikasi', 'Asosiasi'],
    ...profiles.map((p) => [
      p.id,
      p.dataset.company.namaPerusahaan,
      p.dataset.company.sektorUsaha,
      p.dataset.company.lokasiOperasional,
      p.dataset.company.standarAcuan,
      p.dataset.csrPrograms.length,
      p.dataset.trainings.length,
      p.dataset.energyEntries.length,
      p.dataset.certifications.length,
      p.dataset.associations.length,
    ]),
  ];
  appendSheet(wb, 'Daftar_Profil', overviewRows);

  // Also include full raw localStorage snapshot sheet so multi-profile backup restores 100% identically
  const backupRows: (string | number)[][] = [
    ['Profile ID', 'Label', 'JSON_Snapshot_Chunk'],
  ];
  profiles.forEach((p) => {
    const json = JSON.stringify(p);
    // Split at 30,000 chars per cell (Excel cell limit is 32,767 chars)
    for (let i = 0; i < json.length; i += 30000) {
      backupRows.push([p.id, p.labelSingkat, json.slice(i, i + 30000)]);
    }
  });
  appendSheet(wb, 'Backup_LocalStorage', backupRows);

  XLSX.writeFile(wb, `Backup_Semua_Profil_ESG_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function parseYear(val: unknown): ReportYear {
  const num = Number(val);
  if (num === 2023 || num === 2024 || num === 2025) return num;
  return 2025;
}

export async function importDatasetFromExcel(
  file: File,
  baseDataset: EsgDataset
): Promise<EsgDataset> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const getRows = (tabName: string): unknown[][] => {
    const ws = wb.Sheets[tabName];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
  };

  if (!wb.SheetNames.some((n) => (EXCEL_SHEET_TABS as readonly string[]).includes(n))) {
    throw new Error(
      'Format workbook Excel tidak dikenali. Gunakan file Excel yang diekspor dari aplikasi ini (memiliki tab Profil_Ringkasan, 01_CSR, dst).'
    );
  }

  const next: EsgDataset = JSON.parse(JSON.stringify(baseDataset));

  // Profil
  const profilRows = getRows('Profil_Ringkasan');
  if (profilRows.length > 1) {
    const map = new Map(profilRows.slice(1).map((r) => [String(r[0]), String(r[1] ?? '')]));
    if (map.get('Nama Perusahaan')) next.company.namaPerusahaan = map.get('Nama Perusahaan')!;
    if (map.get('Sektor Usaha')) next.company.sektorUsaha = map.get('Sektor Usaha')!;
    if (map.get('Lokasi Operasional')) next.company.lokasiOperasional = map.get('Lokasi Operasional')!;
    if (map.get('Standar Acuan')) next.company.standarAcuan = map.get('Standar Acuan')!;
    if (map.get('Ringkasan Direksi')) next.company.ringkasanDireksi = map.get('Ringkasan Direksi')!;
    if (map.get('Produksi 2023 (Ton)')) next.company.volumeProduksiTon[2023] = Number(map.get('Produksi 2023 (Ton)')) || next.company.volumeProduksiTon[2023];
    if (map.get('Produksi 2024 (Ton)')) next.company.volumeProduksiTon[2024] = Number(map.get('Produksi 2024 (Ton)')) || next.company.volumeProduksiTon[2024];
    if (map.get('Produksi 2025 (Ton)')) next.company.volumeProduksiTon[2025] = Number(map.get('Produksi 2025 (Ton)')) || next.company.volumeProduksiTon[2025];
  }

  // 01_CSR
  const csrRows = getRows('01_CSR');
  if (csrRows.length > 1) {
    next.csrPrograms = csrRows
      .slice(1)
      .filter((r) => String(r[2] || '').trim() !== '')
      .map((r, idx): CsrProgram => ({
        id: String(r[0] || `csr-xl-${idx}`),
        year: parseYear(r[1]),
        namaProgram: String(r[2] || ''),
        pilar: (String(r[3]) as CsrProgram['pilar']) || 'Pendidikan',
        lokasi: String(r[4] || ''),
        anggaranRp: Number(String(r[5] || 0).replace(/[^0-9.-]/g, '')) || 0,
        realisasiRp: Number(String(r[6] || 0).replace(/[^0-9.-]/g, '')) || 0,
        penerimaManfaat: Number(r[7]) || 0,
        satuanPenerima: String(r[8] || 'Orang'),
        status: String(r[9]) === 'Berjalan' ? 'Berjalan' : 'Selesai',
      }));
  }

  // 02_K3_TSIR
  const k3Rows = getRows('02_K3_TSIR');
  if (k3Rows.length > 1) {
    const incidentHeaderIdx = k3Rows.findIndex((r) => String(r[0]) === 'Log Insiden ID');
    const summarySlice = incidentHeaderIdx > -1 ? k3Rows.slice(1, incidentHeaderIdx) : k3Rows.slice(1);
    summarySlice
      .filter((r) => ['2023', '2024', '2025'].includes(String(r[0])))
      .forEach((r) => {
        const y = parseYear(r[0]);
        next.k3Summaries[y] = {
          ...next.k3Summaries[y],
          jamKerjaSelamat: Number(r[1]) || 0,
          jamKerjaZeroAccidentKumulatif: Number(r[2]) || 0,
          jumlahTenagaKerja: Number(r[3]) || 0,
          basisPerhitungan: Number(r[4]) === 1000000 ? 1000000 : 200000,
          nearMiss: Number(r[5]) || 0,
          firstAid: Number(r[6]) || 0,
          medicalTreatment: Number(r[7]) || 0,
          restrictedWork: Number(r[8]) || 0,
          lti: Number(r[9]) || 0,
          fatality: Number(r[10]) || 0,
          hariHilang: Number(r[11]) || 0,
          catatanZeroAccident: String(r[14] || next.k3Summaries[y].catatanZeroAccident),
        };
      });
    if (incidentHeaderIdx > -1) {
      next.k3Incidents = k3Rows
        .slice(incidentHeaderIdx + 1)
        .filter((r) => String(r[2] || '').trim() !== '')
        .map((r, idx): K3IncidentLog => ({
          id: String(r[0] || `inc-xl-${idx}`),
          year: parseYear(r[1]),
          tanggal: String(r[2] || ''),
          kategori: (String(r[3]) as K3IncidentLog['kategori']) || 'Near Miss',
          unitKerja: String(r[4] || ''),
          deskripsi: String(r[5] || ''),
          hariHilang: Number(r[6]) || 0,
          tindakanPerbaikan: String(r[7] || ''),
        }));
    }
  }

  // 03_Pelatihan
  const trRows = getRows('03_Pelatihan');
  if (trRows.length > 1) {
    next.trainings = trRows
      .slice(1)
      .filter((r) => String(r[3] || '').trim() !== '')
      .map((r, idx): TrainingRecord => ({
        id: String(r[0] || `tr-xl-${idx}`),
        year: parseYear(r[1]),
        jabatan: (String(r[2]) as TrainingRecord['jabatan']) || 'Operator & Teknisi',
        namaPelatihan: String(r[3] || ''),
        kategori: (String(r[4]) as TrainingRecord['kategori']) || 'Teknis & Operasional',
        jumlahPeserta: Number(r[5]) || 0,
        durasiJamPerPeserta: Number(r[6]) || 0,
        penyelenggara: String(r[8] || ''),
      }));
  }

  // 04_Kinerja_Sosial
  const wfRows = getRows('04_Kinerja_Sosial');
  if (wfRows.length > 1) {
    const summaryHeaderIdx = wfRows.findIndex((r) => String(r[0]) === 'Ringkasan Tahun');
    const jabRows = summaryHeaderIdx > -1 ? wfRows.slice(1, summaryHeaderIdx) : wfRows.slice(1);
    const groupedJabatan: Record<ReportYear, JabatanComposition[]> = { 2023: [], 2024: [], 2025: [] };
    jabRows
      .filter((r) => ['2023', '2024', '2025'].includes(String(r[0])) && String(r[1] || '').trim() !== '')
      .forEach((r) => {
        const y = parseYear(r[0]);
        groupedJabatan[y].push({
          jabatan: (String(r[1]) as JabatanComposition['jabatan']) || 'Operator & Teknisi',
          lakiLaki: Number(r[2]) || 0,
          perempuan: Number(r[3]) || 0,
          tetap: Number(r[4]) || 0,
          kontrak: Number(r[5]) || 0,
          lokal: Number(r[6]) || 0,
          tka: Number(r[7]) || 0,
        });
      });
    ([2023, 2024, 2025] as ReportYear[]).forEach((y) => {
      if (groupedJabatan[y].length > 0) {
        const totalLokal = groupedJabatan[y].reduce((a, b) => a + b.lokal, 0);
        const totalTka = groupedJabatan[y].reduce((a, b) => a + b.tka, 0);
        next.workforce[y] = {
          ...next.workforce[y],
          jabatanBreakdown: groupedJabatan[y],
          lokalRing1: Math.min(next.workforce[y].lokalRing1, totalLokal),
          lokalNasional: Math.max(0, totalLokal - Math.min(next.workforce[y].lokalRing1, totalLokal)),
          tka: totalTka,
        };
      }
    });
    if (summaryHeaderIdx > -1) {
      wfRows
        .slice(summaryHeaderIdx + 1)
        .filter((r) => ['2023', '2024', '2025'].includes(String(r[0])))
        .forEach((r) => {
          const y = parseYear(r[0]);
          next.workforce[y] = {
            ...next.workforce[y],
            lokalRing1: Number(r[2]) || 0,
            lokalNasional: Number(r[3]) || 0,
            tka: Number(r[4]) || 0,
            tingkatTurnoverPersen: Number(r[5]) || 0,
          };
        });
    }
  }

  // 05_Energi_GJ
  const enRows = getRows('05_Energi_GJ');
  if (enRows.length > 1) {
    next.energyEntries = enRows
      .slice(1)
      .filter((r) => String(r[2] || '').trim() !== '')
      .map((r, idx): EnergySourceEntry => ({
        id: String(r[0] || `en-xl-${idx}`),
        year: parseYear(r[1]),
        sumber: String(r[2] || ''),
        kategori: (String(r[3]) as EnergySourceEntry['kategori']) || 'Bahan Bakar Fosil',
        unitAsli: (String(r[4]) as EnergySourceEntry['unitAsli']) || 'kWh',
        konsumsiAsli: Number(r[5]) || 0,
        faktorKonversiGJ: Number(r[6]) || 0,
        faktorEmisiTonCO2ePerGJ: Number(r[8]) || 0,
        catatanFaktor: String(r[10] || ''),
      }));
  }

  // 06_Lingkungan
  const envRows = getRows('06_Lingkungan');
  if (envRows.length > 1) {
    const wasteHeaderIdx = envRows.findIndex((r) => String(r[0]) === 'Log Limbah ID');
    const summarySlice = wasteHeaderIdx > -1 ? envRows.slice(1, wasteHeaderIdx) : envRows.slice(1);
    summarySlice
      .filter((r) => ['2023', '2024', '2025'].includes(String(r[0])))
      .forEach((r) => {
        const y = parseYear(r[0]);
        next.environment[y] = {
          ...next.environment[y],
          air: {
            airTanahM3: Number(r[1]) || 0,
            pdamM3: Number(r[2]) || 0,
            airPermukaanM3: Number(r[3]) || 0,
            airDaurUlangM3: Number(r[4]) || 0,
          },
          emisiScope3TonCO2e: Number(r[7]) || 0,
          tanamanHayati: {
            ...next.environment[y].tanamanHayati,
            luasanKonservasiHa: Number(r[8]) || 0,
            luasanRehabilitasiHa: Number(r[9]) || 0,
            luasanRthPabrikHa: Number(r[10]) || 0,
            jumlahPohonTertanam: Number(r[11]) || 0,
          },
        };
      });
    if (wasteHeaderIdx > -1) {
      const groupedNonB3: Record<ReportYear, NonB3WasteItem[]> = { 2023: [], 2024: [], 2025: [] };
      const groupedB3: Record<ReportYear, B3WasteItem[]> = { 2023: [], 2024: [], 2025: [] };
      envRows
        .slice(wasteHeaderIdx + 1)
        .filter((r) => String(r[3] || '').trim() !== '')
        .forEach((r, idx) => {
          const y = parseYear(r[1]);
          if (String(r[2]) === 'B3') {
            groupedB3[y].push({
              id: String(r[0] || `b3-xl-${idx}`),
              jenis: String(r[3] || ''),
              jumlahTon: Number(r[4]) || 0,
              kodeLimbah: String(r[5] || '-'),
              pengelolaBerizin: String(r[6] || ''),
              statusManifest:
                String(r[7]) === 'Dalam Proses Pengangkutan'
                  ? 'Dalam Proses Pengangkutan'
                  : 'Manifest SIRAJA Lengkap',
            });
          } else {
            groupedNonB3[y].push({
              id: String(r[0] || `nb3-xl-${idx}`),
              jenis: String(r[3] || ''),
              jumlahTon: Number(r[4]) || 0,
              metodeKelola: String(r[5] || ''),
              persentaseDaurUlang: Number(r[6]) || 0,
            });
          }
        });
      ([2023, 2024, 2025] as ReportYear[]).forEach((y) => {
        if (groupedNonB3[y].length > 0) next.environment[y].limbahNonB3 = groupedNonB3[y];
        if (groupedB3[y].length > 0) next.environment[y].limbahB3 = groupedB3[y];
      });
    }
  }

  // 07_Pemasaran
  const mktRows = getRows('07_Pemasaran');
  if (mktRows.length > 1) {
    const groupedDN: Record<ReportYear, MarketEntry[]> = { 2023: [], 2024: [], 2025: [] };
    const groupedLN: Record<ReportYear, MarketEntry[]> = { 2023: [], 2024: [], 2025: [] };
    mktRows
      .slice(1)
      .filter((r) => ['2023', '2024', '2025'].includes(String(r[0])) && String(r[2] || '').trim() !== '')
      .forEach((r, idx) => {
        const y = parseYear(r[0]);
        const entry: MarketEntry = {
          id: `mkt-xl-${y}-${idx}`,
          wilayahAtauNegara: String(r[2] || ''),
          segmenProduk: String(r[3] || ''),
          volumeTon: Number(r[4]) || 0,
          pendapatanMiliarRp: Number(r[5]) || 0,
        };
        if (String(r[1]).includes('LN') || String(r[1]).toLowerCase().includes('luar')) {
          groupedLN[y].push(entry);
        } else {
          groupedDN[y].push(entry);
        }
      });
    ([2023, 2024, 2025] as ReportYear[]).forEach((y) => {
      if (groupedDN[y].length > 0 || groupedLN[y].length > 0) {
        next.marketing[y] = {
          ...next.marketing[y],
          pasarDN: groupedDN[y],
          pasarLN: groupedLN[y],
        };
      }
    });
  }

  // 08_Supply_Chain
  const scRows = getRows('08_Supply_Chain');
  if (scRows.length > 1) {
    next.supplyChain = scRows
      .slice(1)
      .filter((r) => String(r[2] || '').trim() !== '')
      .map((r, idx): SupplyChainEntry => ({
        id: String(r[0] || `sc-xl-${idx}`),
        year: parseYear(r[1]),
        kategoriPemasok: (String(r[2]) as SupplyChainEntry['kategoriPemasok']) || 'UMKM Lokal (Ring-1)',
        jenisKomoditas: String(r[3] || ''),
        jumlahPemasok: Number(r[4]) || 0,
        nilaiPengadaanMiliarRp: Number(r[5]) || 0,
        persentaseLolosScreeningESG: Number(r[6]) || 0,
        rataRataTkdnPersen: Number(r[7]) || 0,
      }));
  }

  // 09_Sertifikasi
  const certRows = getRows('09_Sertifikasi');
  if (certRows.length > 1) {
    next.certifications = certRows
      .slice(1)
      .filter((r) => String(r[3] || '').trim() !== '')
      .map((r, idx): CertificationAward => ({
        id: String(r[0] || `cert-xl-${idx}`),
        year: parseYear(r[1]),
        tipe: String(r[2]) === 'Penghargaan' ? 'Penghargaan' : 'Sertifikasi',
        nama: String(r[3] || ''),
        nomorSertifikat: String(r[4] || ''),
        lembagaPenerbit: String(r[5] || ''),
        ruangLingkup: String(r[6] || ''),
        masaBerlaku: String(r[7] || ''),
        status: (String(r[8]) as CertificationAward['status']) || 'Aktif',
      }));
  }

  // 10_Asosiasi
  const asoRows = getRows('10_Asosiasi');
  if (asoRows.length > 1) {
    next.associations = asoRows
      .slice(1)
      .filter((r) => String(r[3] || '').trim() !== '')
      .map((r, idx): AssociationMembership => ({
        id: String(r[0] || `aso-xl-${idx}`),
        year: parseYear(r[1]),
        singkatan: String(r[2] || ''),
        namaAsosiasi: String(r[3] || ''),
        tingkat: (String(r[4]) as AssociationMembership['tingkat']) || 'Nasional',
        peran: (String(r[5]) as AssociationMembership['peran']) || 'Anggota Aktif',
        tahunBergabung: Number(r[6]) || 2020,
        bidangFokus: String(r[7] || ''),
      }));
  }

  return next;
}
