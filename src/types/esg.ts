export type ReportYear = 2023 | 2024 | 2025;

export type SectionId =
  | 'overview'
  | 'csr'
  | 'k3'
  | 'pelatihan'
  | 'kinerja-sosial'
  | 'energi'
  | 'lingkungan'
  | 'pemasaran'
  | 'supply-chain'
  | 'penghargaan'
  | 'asosiasi'
  | 'spreadsheet';

export interface CompanyProfile {
  namaPerusahaan: string;
  sektorUsaha: string;
  lokasiOperasional: string;
  standarAcuan: string;
  ringkasanDireksi: string;
  volumeProduksiTon: Record<ReportYear, number>;
}

export type CsrPillar =
  | 'Pendidikan'
  | 'Kesehatan'
  | 'Ekonomi & UMKM'
  | 'Lingkungan'
  | 'Sosial & Infrastruktur';

export interface CsrProgram {
  id: string;
  year: ReportYear;
  namaProgram: string;
  pilar: CsrPillar;
  lokasi: string;
  anggaranRp: number;
  realisasiRp: number;
  penerimaManfaat: number;
  satuanPenerima: string;
  status: 'Selesai' | 'Berjalan';
}

export interface K3YearSummary {
  year: ReportYear;
  jamKerjaSelamat: number;
  jamKerjaZeroAccidentKumulatif: number;
  jumlahTenagaKerja: number;
  basisPerhitungan: 200000 | 1000000;
  nearMiss: number;
  firstAid: number;
  medicalTreatment: number;
  restrictedWork: number;
  lti: number;
  fatality: number;
  hariHilang: number;
  catatanZeroAccident: string;
}

export interface K3IncidentLog {
  id: string;
  year: ReportYear;
  tanggal: string;
  kategori:
    | 'Near Miss'
    | 'First Aid'
    | 'Medical Treatment'
    | 'Restricted Work'
    | 'Lost Time Injury'
    | 'Fatality';
  unitKerja: string;
  deskripsi: string;
  hariHilang: number;
  tindakanPerbaikan: string;
}

export type JobLevel =
  | 'Direksi & Eksekutif'
  | 'Manajer'
  | 'Supervisor & Superintendent'
  | 'Staf & Analis'
  | 'Operator & Teknisi';

export type TrainingCategory =
  | 'K3 & Keselamatan'
  | 'Teknis & Operasional'
  | 'Kepemimpinan & Manajemen'
  | 'ESG & Lingkungan'
  | 'Digital & Tata Kelola';

export interface TrainingRecord {
  id: string;
  year: ReportYear;
  jabatan: JobLevel;
  namaPelatihan: string;
  kategori: TrainingCategory;
  jumlahPeserta: number;
  durasiJamPerPeserta: number;
  penyelenggara: string;
}

export interface JabatanComposition {
  jabatan: JobLevel;
  lakiLaki: number;
  perempuan: number;
  tetap: number;
  kontrak: number;
  lokal: number;
  tka: number;
}

export interface AgeComposition {
  rentang: '< 25 Tahun' | '25 - 35 Tahun' | '36 - 45 Tahun' | '46 - 55 Tahun' | '> 55 Tahun';
  jumlah: number;
}

export interface WorkforceYearData {
  year: ReportYear;
  lokalRing1: number;
  lokalNasional: number;
  tka: number;
  jabatanBreakdown: JabatanComposition[];
  usiaBreakdown: AgeComposition[];
  tingkatTurnoverPersen: number;
}

export type EnergyCategory = 'Listrik Grid' | 'Energi Terbarukan' | 'Bahan Bakar Fosil';

export interface EnergySourceEntry {
  id: string;
  year: ReportYear;
  sumber: string;
  kategori: EnergyCategory;
  unitAsli: 'kWh' | 'Ton' | 'Liter' | 'MMBTU';
  konsumsiAsli: number;
  faktorKonversiGJ: number;
  faktorEmisiTonCO2ePerGJ: number;
  catatanFaktor: string;
}

export interface NonB3WasteItem {
  id: string;
  jenis: string;
  jumlahTon: number;
  metodeKelola: string;
  persentaseDaurUlang: number;
}

export interface B3WasteItem {
  id: string;
  jenis: string;
  kodeLimbah: string;
  jumlahTon: number;
  pengelolaBerizin: string;
  statusManifest: 'Manifest SIRAJA Lengkap' | 'Dalam Proses Pengangkutan';
}

export interface EnvironmentYearData {
  year: ReportYear;
  air: {
    airTanahM3: number;
    pdamM3: number;
    airPermukaanM3: number;
    airDaurUlangM3: number;
  };
  limbahNonB3: NonB3WasteItem[];
  limbahB3: B3WasteItem[];
  emisiScope3TonCO2e: number;
  tanamanHayati: {
    luasanKonservasiHa: number;
    luasanRehabilitasiHa: number;
    luasanRthPabrikHa: number;
    jumlahPohonTertanam: number;
    spesiesTeridentifikasi: number;
    catatanKeanekaragaman: string;
  };
}

export interface MarketEntry {
  id: string;
  wilayahAtauNegara: string;
  segmenProduk: string;
  volumeTon: number;
  pendapatanMiliarRp: number;
}

export interface MarketingYearData {
  year: ReportYear;
  pasarDN: MarketEntry[];
  pasarLN: MarketEntry[];
  indeksKepuasanPelanggan: number;
  kepatuhanLabelPersen: number;
}

export interface SupplyChainEntry {
  id: string;
  year: ReportYear;
  kategoriPemasok:
    | 'UMKM Lokal (Ring-1)'
    | 'Korporasi Lokal Daerah'
    | 'Pemasok Nasional'
    | 'Pemasok Internasional';
  jenisKomoditas: string;
  jumlahPemasok: number;
  nilaiPengadaanMiliarRp: number;
  persentaseLolosScreeningESG: number;
  rataRataTkdnPersen: number;
}

export interface CertificationAward {
  id: string;
  year: ReportYear;
  tipe: 'Sertifikasi' | 'Penghargaan';
  nama: string;
  nomorSertifikat: string;
  lembagaPenerbit: string;
  ruangLingkup: string;
  masaBerlaku: string;
  status: 'Aktif' | 'Dalam Perpanjangan' | 'Diterima';
}

export interface AssociationMembership {
  id: string;
  year: ReportYear;
  namaAsosiasi: string;
  singkatan: string;
  tingkat: 'Daerah' | 'Nasional' | 'Internasional';
  peran: 'Anggota Aktif' | 'Pengurus / Dewan' | 'Komite Teknis ESG';
  tahunBergabung: number;
  bidangFokus: string;
}

export interface EsgDataset {
  company: CompanyProfile;
  csrPrograms: CsrProgram[];
  k3Summaries: Record<ReportYear, K3YearSummary>;
  k3Incidents: K3IncidentLog[];
  trainings: TrainingRecord[];
  workforce: Record<ReportYear, WorkforceYearData>;
  energyEntries: EnergySourceEntry[];
  environment: Record<ReportYear, EnvironmentYearData>;
  marketing: Record<ReportYear, MarketingYearData>;
  supplyChain: SupplyChainEntry[];
  certifications: CertificationAward[];
  associations: AssociationMembership[];
}

export interface SpreadsheetConnection {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface ProfileWorkspace {
  id: string;
  labelSingkat: string;
  dataset: EsgDataset;
  spreadsheet?: SpreadsheetConnection;
}
