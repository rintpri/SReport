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

export const ESG_SHEET_TABS = [
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

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

async function sheetsFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Google Sheets API error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {
      // ignore parse failure
    }
    throw new Error(msg);
  }
  return res;
}

export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<{
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetTitles: string[];
}> {
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    accessToken
  );
  const json = await res.json();
  return {
    spreadsheetId: json.spreadsheetId,
    title: json.properties?.title || 'Sustainability Report Spreadsheet',
    spreadsheetUrl:
      json.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    sheetTitles: (json.sheets || []).map(
      (s: { properties?: { title?: string } }) => s.properties?.title || ''
    ),
  };
}

export async function createSustainabilitySpreadsheet(
  title: string,
  accessToken: string
): Promise<{ spreadsheetId: string; title: string; spreadsheetUrl: string }> {
  const res = await sheetsFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title },
        sheets: ESG_SHEET_TABS.map((tab) => ({ properties: { title: tab } })),
      }),
    }
  );
  const json = await res.json();
  return {
    spreadsheetId: json.spreadsheetId,
    title: json.properties?.title || title,
    spreadsheetUrl:
      json.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${json.spreadsheetId}`,
  };
}

async function ensureRequiredTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  const missing = ESG_SHEET_TABS.filter((tab) => !meta.sheetTitles.includes(tab));
  if (missing.length === 0) return;

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((tab) => ({
          addSheet: { properties: { title: tab } },
        })),
      }),
    }
  );
}

export async function syncDatasetToSpreadsheet(
  spreadsheetId: string,
  dataset: EsgDataset,
  accessToken: string
): Promise<{ syncedAt: string; updatedTabs: number }> {
  await ensureRequiredTabs(spreadsheetId, accessToken);

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

  const dataPayload: { range: string; values: (string | number)[][] }[] = [
    { range: 'Profil_Ringkasan!A1', values: profilRows },
    { range: '01_CSR!A1', values: csrRows },
    { range: '02_K3_TSIR!A1', values: k3Rows },
    { range: '03_Pelatihan!A1', values: trainingRows },
    { range: '04_Kinerja_Sosial!A1', values: workforceRows },
    { range: '05_Energi_GJ!A1', values: energyRows },
    { range: '06_Lingkungan!A1', values: envRows },
    { range: '07_Pemasaran!A1', values: mktRows },
    { range: '08_Supply_Chain!A1', values: scRows },
    { range: '09_Sertifikasi!A1', values: certRows },
    { range: '10_Asosiasi!A1', values: asoRows },
  ];

  // Clear existing ranges first to remove stale deleted rows cleanly
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: ESG_SHEET_TABS.map((t) => `${t}!A1:Z500`),
      }),
    }
  );

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    }
  );

  return {
    syncedAt: new Date().toISOString(),
    updatedTabs: dataPayload.length,
  };
}

function parseYear(val: unknown): ReportYear {
  const num = Number(val);
  if (num === 2023 || num === 2024 || num === 2025) return num;
  return 2025;
}

export async function pullDatasetFromSpreadsheet(
  spreadsheetId: string,
  baseDataset: EsgDataset,
  accessToken: string
): Promise<EsgDataset> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  const availableTabs = ESG_SHEET_TABS.filter((t) => meta.sheetTitles.includes(t));
  if (availableTabs.length === 0) {
    throw new Error(
      'Spreadsheet tidak memiliki tab format SustainaLedger. Sinkronkan ke spreadsheet terlebih dahulu.'
    );
  }

  const params = availableTabs.map((t) => `ranges=${encodeURIComponent(`${t}!A1:Z500`)}`).join('&');
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    accessToken
  );
  const json = await res.json();
  const valueRanges: { range: string; values?: string[][] }[] = json.valueRanges || [];

  const getRows = (tabName: string): string[][] => {
    const found = valueRanges.find((vr) => vr.range.startsWith(tabName) || vr.range.startsWith(`'${tabName}'`));
    return found?.values || [];
  };

  const next: EsgDataset = JSON.parse(JSON.stringify(baseDataset));

  // Profil
  const profilRows = getRows('Profil_Ringkasan');
  if (profilRows.length > 1) {
    const map = new Map(profilRows.slice(1).map((r) => [r[0], r[1]]));
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
      .filter((r) => r[2])
      .map((r, idx): CsrProgram => ({
        id: r[0] || `csr-sheet-${idx}`,
        year: parseYear(r[1]),
        namaProgram: r[2] || '',
        pilar: (r[3] as CsrProgram['pilar']) || 'Pendidikan',
        lokasi: r[4] || '',
        anggaranRp: Number(String(r[5] || 0).replace(/[^0-9.-]/g, '')) || 0,
        realisasiRp: Number(String(r[6] || 0).replace(/[^0-9.-]/g, '')) || 0,
        penerimaManfaat: Number(r[7]) || 0,
        satuanPenerima: r[8] || 'Orang',
        status: r[9] === 'Berjalan' ? 'Berjalan' : 'Selesai',
      }));
  }

  // 02_K3_TSIR
  const k3Rows = getRows('02_K3_TSIR');
  if (k3Rows.length > 1) {
    const incidentHeaderIdx = k3Rows.findIndex((r) => r[0] === 'Log Insiden ID');
    const summarySlice = incidentHeaderIdx > -1 ? k3Rows.slice(1, incidentHeaderIdx) : k3Rows.slice(1);
    summarySlice
      .filter((r) => r[0] === '2023' || r[0] === '2024' || r[0] === '2025')
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
          catatanZeroAccident: r[14] || next.k3Summaries[y].catatanZeroAccident,
        };
      });
    if (incidentHeaderIdx > -1) {
      next.k3Incidents = k3Rows
        .slice(incidentHeaderIdx + 1)
        .filter((r) => r[2])
        .map((r, idx): K3IncidentLog => ({
          id: r[0] || `inc-sheet-${idx}`,
          year: parseYear(r[1]),
          tanggal: r[2] || '',
          kategori: (r[3] as K3IncidentLog['kategori']) || 'Near Miss',
          unitKerja: r[4] || '',
          deskripsi: r[5] || '',
          hariHilang: Number(r[6]) || 0,
          tindakanPerbaikan: r[7] || '',
        }));
    }
  }

  // 03_Pelatihan
  const trRows = getRows('03_Pelatihan');
  if (trRows.length > 1) {
    next.trainings = trRows
      .slice(1)
      .filter((r) => r[3])
      .map((r, idx): TrainingRecord => ({
        id: r[0] || `tr-sheet-${idx}`,
        year: parseYear(r[1]),
        jabatan: (r[2] as TrainingRecord['jabatan']) || 'Operator & Teknisi',
        namaPelatihan: r[3] || '',
        kategori: (r[4] as TrainingRecord['kategori']) || 'Teknis & Operasional',
        jumlahPeserta: Number(r[5]) || 0,
        durasiJamPerPeserta: Number(r[6]) || 0,
        penyelenggara: r[8] || '',
      }));
  }

  // 04_Kinerja_Sosial
  const wfRows = getRows('04_Kinerja_Sosial');
  if (wfRows.length > 1) {
    const summaryHeaderIdx = wfRows.findIndex((r) => r[0] === 'Ringkasan Tahun');
    const jabRows = summaryHeaderIdx > -1 ? wfRows.slice(1, summaryHeaderIdx) : wfRows.slice(1);
    const groupedJabatan: Record<ReportYear, JabatanComposition[]> = { 2023: [], 2024: [], 2025: [] };
    jabRows
      .filter((r) => (r[0] === '2023' || r[0] === '2024' || r[0] === '2025') && r[1])
      .forEach((r) => {
        const y = parseYear(r[0]);
        groupedJabatan[y].push({
          jabatan: (r[1] as JabatanComposition['jabatan']) || 'Operator & Teknisi',
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
        .filter((r) => r[0] === '2023' || r[0] === '2024' || r[0] === '2025')
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
      .filter((r) => r[2])
      .map((r, idx): EnergySourceEntry => ({
        id: r[0] || `en-sheet-${idx}`,
        year: parseYear(r[1]),
        sumber: r[2] || '',
        kategori: (r[3] as EnergySourceEntry['kategori']) || 'Bahan Bakar Fosil',
        unitAsli: (r[4] as EnergySourceEntry['unitAsli']) || 'kWh',
        konsumsiAsli: Number(r[5]) || 0,
        faktorKonversiGJ: Number(r[6]) || 0,
        faktorEmisiTonCO2ePerGJ: Number(r[8]) || 0,
        catatanFaktor: r[10] || '',
      }));
  }

  // 06_Lingkungan
  const envSheetRows = getRows('06_Lingkungan');
  if (envSheetRows.length > 1) {
    const wasteHeaderIdx = envSheetRows.findIndex((r) => r[0] === 'Log Limbah ID');
    const summarySlice = wasteHeaderIdx > -1 ? envSheetRows.slice(1, wasteHeaderIdx) : envSheetRows.slice(1);
    summarySlice
      .filter((r) => r[0] === '2023' || r[0] === '2024' || r[0] === '2025')
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
      envSheetRows
        .slice(wasteHeaderIdx + 1)
        .filter((r) => r[3])
        .forEach((r, idx) => {
          const y = parseYear(r[1]);
          if (r[2] === 'B3') {
            groupedB3[y].push({
              id: r[0] || `b3-sheet-${idx}`,
              jenis: r[3] || '',
              jumlahTon: Number(r[4]) || 0,
              kodeLimbah: r[5] || '-',
              pengelolaBerizin: r[6] || '',
              statusManifest:
                r[7] === 'Dalam Proses Pengangkutan'
                  ? 'Dalam Proses Pengangkutan'
                  : 'Manifest SIRAJA Lengkap',
            });
          } else {
            groupedNonB3[y].push({
              id: r[0] || `nb3-sheet-${idx}`,
              jenis: r[3] || '',
              jumlahTon: Number(r[4]) || 0,
              metodeKelola: r[5] || '',
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
  const mktSheetRows = getRows('07_Pemasaran');
  if (mktSheetRows.length > 1) {
    const groupedDN: Record<ReportYear, MarketEntry[]> = { 2023: [], 2024: [], 2025: [] };
    const groupedLN: Record<ReportYear, MarketEntry[]> = { 2023: [], 2024: [], 2025: [] };
    mktSheetRows
      .slice(1)
      .filter((r) => (r[0] === '2023' || r[0] === '2024' || r[0] === '2025') && r[2])
      .forEach((r, idx) => {
        const y = parseYear(r[0]);
        const entry: MarketEntry = {
          id: `mkt-sheet-${y}-${idx}`,
          wilayahAtauNegara: r[2] || '',
          segmenProduk: r[3] || '',
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
      .filter((r) => r[2])
      .map((r, idx): SupplyChainEntry => ({
        id: r[0] || `sc-sheet-${idx}`,
        year: parseYear(r[1]),
        kategoriPemasok: (r[2] as SupplyChainEntry['kategoriPemasok']) || 'UMKM Lokal (Ring-1)',
        jenisKomoditas: r[3] || '',
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
      .filter((r) => r[3])
      .map((r, idx): CertificationAward => ({
        id: r[0] || `cert-sheet-${idx}`,
        year: parseYear(r[1]),
        tipe: r[2] === 'Penghargaan' ? 'Penghargaan' : 'Sertifikasi',
        nama: r[3] || '',
        nomorSertifikat: r[4] || '',
        lembagaPenerbit: r[5] || '',
        ruangLingkup: r[6] || '',
        masaBerlaku: r[7] || '',
        status: (r[8] as CertificationAward['status']) || 'Aktif',
      }));
  }

  // 10_Asosiasi
  const asoRows = getRows('10_Asosiasi');
  if (asoRows.length > 1) {
    next.associations = asoRows
      .slice(1)
      .filter((r) => r[3])
      .map((r, idx): AssociationMembership => ({
        id: r[0] || `aso-sheet-${idx}`,
        year: parseYear(r[1]),
        singkatan: r[2] || '',
        namaAsosiasi: r[3] || '',
        tingkat: (r[4] as AssociationMembership['tingkat']) || 'Nasional',
        peran: (r[5] as AssociationMembership['peran']) || 'Anggota Aktif',
        tahunBergabung: Number(r[6]) || 2020,
        bidangFokus: r[7] || '',
      }));
  }

  return next;
}
