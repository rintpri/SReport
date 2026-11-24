import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  BookOpen,
  Building,
  FileSpreadsheet,
  Flame,
  Globe2,
  HandHeart,
  HardHat,
  Leaf,
  Menu,
  Printer,
  RotateCcw,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { INITIAL_PROFILES } from './data/initialEsgData';
import {
  AssociationMembership,
  CertificationAward,
  CompanyProfile,
  CsrProgram,
  EnergySourceEntry,
  EnvironmentYearData,
  EsgDataset,
  K3IncidentLog,
  K3YearSummary,
  MarketingYearData,
  ProfileWorkspace,
  ReportYear,
  SectionId,
  SpreadsheetConnection,
  SupplyChainEntry,
  TrainingRecord,
  WorkforceYearData,
} from './types/esg';
import {
  getSheetsAccessToken,
  initGoogleAuth,
  signInWithGoogleSheets,
  signOutGoogle,
} from './services/googleAuth';
import { syncDatasetToSpreadsheet } from './services/googleSheetsSync';
import { exportToJSON } from './utils/formatters';
import { OverviewSection } from './components/sections/OverviewSection';
import { CsrSection } from './components/sections/CsrSection';
import { K3Section } from './components/sections/K3Section';
import { PelatihanSection } from './components/sections/PelatihanSection';
import { KinerjaSosialSection } from './components/sections/KinerjaSosialSection';
import { EnergiSection } from './components/sections/EnergiSection';
import { LingkunganSection } from './components/sections/LingkunganSection';
import { PemasaranSection } from './components/sections/PemasaranSection';
import { SupplyChainSection } from './components/sections/SupplyChainSection';
import { PenghargaanSection } from './components/sections/PenghargaanSection';
import { AsosiasiSection } from './components/sections/AsosiasiSection';
import { SpreadsheetSyncSection } from './components/sections/SpreadsheetSyncSection';
import { PrintReportView } from './components/sections/PrintReportView';
import { ProfileManagerModal } from './components/ProfileManagerModal';

const PROFILES_STORAGE_KEY = 'sustainability_report_profiles_v2';
const ACTIVE_PROFILE_KEY = 'sustainability_report_active_profile_v2';
const LEGACY_STORAGE_KEY = 'sustainability_report_esg_v1';

interface NavItem {
  id: SectionId;
  num?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Ringkasan Eksekutif', icon: BarChart3 },
  { id: 'csr', num: '01', label: 'CSR & Komunitas', icon: HandHeart },
  { id: 'k3', num: '02', label: 'K3 & Kalkulator TSIR', icon: HardHat },
  { id: 'pelatihan', num: '03', label: 'Pelatihan Karyawan', icon: BookOpen },
  { id: 'kinerja-sosial', num: '04', label: 'Kinerja Sosial & SDM', icon: Users },
  { id: 'energi', num: '05', label: 'Konsumsi Energi (GJ)', icon: Flame },
  { id: 'lingkungan', num: '06', label: 'Pengelolaan Lingkungan', icon: Leaf },
  { id: 'pemasaran', num: '07', label: 'Pemasaran (DN & LN)', icon: Globe2 },
  { id: 'supply-chain', num: '08', label: 'Rantai Pasok', icon: Truck },
  { id: 'penghargaan', num: '09', label: 'Sertifikasi & Award', icon: Award },
  { id: 'asosiasi', num: '10', label: 'Keanggotaan Asosiasi', icon: Building },
  { id: 'spreadsheet', label: 'Excel, HTML & Sheets', icon: FileSpreadsheet },
];

export default function App() {
  const [profiles, setProfiles] = useState<ProfileWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProfileWorkspace[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const legacyData = JSON.parse(legacy) as EsgDataset;
        return [
          {
            id: 'profile-nusantara',
            labelSingkat: legacyData.company.namaPerusahaan,
            dataset: legacyData,
          },
          ...INITIAL_PROFILES.slice(1),
        ];
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return INITIAL_PROFILES[0].id;
  });

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const data = activeProfile.dataset;

  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [selectedYear, setSelectedYear] = useState<ReportYear>(2025);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Google Sheets OAuth & Auto-Sync state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const skipNextAutoSyncRef = useRef(true);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
        setHasAccessToken(Boolean(getSheetsAccessToken()));
      },
      (user) => {
        setGoogleUser(user);
        setHasAccessToken(Boolean(getSheetsAccessToken()));
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfile.id);
    } catch {
      // ignore storage errors
    }
  }, [profiles, activeProfile.id]);

  const updateActiveDataset = useCallback(
    (updater: (prev: EsgDataset) => EsgDataset) => {
      setProfiles((prev) =>
        prev.map((prof) => {
          if (prof.id !== activeProfile.id) return prof;
          const nextDataset = updater(prof.dataset);
          return {
            ...prof,
            labelSingkat: nextDataset.company.namaPerusahaan,
            dataset: nextDataset,
          };
        })
      );
    },
    [activeProfile.id]
  );

  const updateActiveConnection = useCallback(
    (conn: SpreadsheetConnection | undefined) => {
      skipNextAutoSyncRef.current = true;
      setProfiles((prev) =>
        prev.map((prof) =>
          prof.id === activeProfile.id ? { ...prof, spreadsheet: conn } : prof
        )
      );
    },
    [activeProfile.id]
  );

  const runSpreadsheetSync = useCallback(
    async (profileSnapshot: ProfileWorkspace) => {
      const token = getSheetsAccessToken();
      const conn = profileSnapshot.spreadsheet;
      if (!token || !conn) return;

      setIsSyncing(true);
      setSyncError(null);
      try {
        const res = await syncDatasetToSpreadsheet(
          conn.spreadsheetId,
          profileSnapshot.dataset,
          token
        );
        setProfiles((prev) =>
          prev.map((prof) =>
            prof.id === profileSnapshot.id && prof.spreadsheet
              ? {
                  ...prof,
                  spreadsheet: {
                    ...prof.spreadsheet,
                    lastSyncedAt: res.syncedAt,
                  },
                }
              : prof
          )
        );
      } catch (err) {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Sinkronisasi otomatis ke Google Sheets gagal.'
        );
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const latestProfileRef = useRef(activeProfile);
  latestProfileRef.current = activeProfile;

  // Automatic debounced Google Sheets synchronization whenever active profile data changes
  useEffect(() => {
    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      return;
    }

    const currentProfile = latestProfileRef.current;
    const conn = currentProfile.spreadsheet;
    const token = getSheetsAccessToken();
    if (!conn?.autoSync || !token || !hasAccessToken) return;

    const timer = window.setTimeout(() => {
      runSpreadsheetSync(latestProfileRef.current);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [activeProfile.dataset, activeProfile.spreadsheet?.autoSync, hasAccessToken, runSpreadsheetSync]);

  const handleGoogleSignIn = async () => {
    setSyncError(null);
    try {
      const res = await signInWithGoogleSheets();
      setGoogleUser(res.user);
      setHasAccessToken(true);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.'
      );
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setHasAccessToken(false);
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleSelectSection = (id: SectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetData = () => {
    skipNextAutoSyncRef.current = true;
    setProfiles(INITIAL_PROFILES);
    setActiveProfileId(INITIAL_PROFILES[0].id);
    localStorage.removeItem(PROFILES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setResetConfirm(false);
  };

  if (printMode) {
    return (
      <PrintReportView
        data={data}
        year={selectedYear}
        onClose={() => setPrintMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F8F6] text-[#141816]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-stone-200 no-print">
        <div className="px-4 py-4 border-b border-stone-200 space-y-2.5">
          <div className="px-1 font-serif text-lg font-bold tracking-tight text-stone-900">
            SustainaLedger
          </div>

          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-left transition-colors"
            title="Ganti atau kelola profil perusahaan"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-stone-500">Profil Aktif</div>
              <div className="text-xs font-semibold text-stone-900 truncate">
                {data.company.namaPerusahaan}
              </div>
            </div>
            <ArrowLeftRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Navigasi Pilar ESG">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-900 text-white'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-200' : 'text-stone-400'}`} />
                <span className="truncate flex-1">
                  {item.num ? `${item.num}. ${item.label}` : item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          {activeProfile.spreadsheet?.autoSync && (
            <div className="px-2 py-1.5 text-[11px] text-emerald-900 bg-emerald-50 rounded-md truncate">
              {isSyncing ? 'Menyinkronkan ke Sheets...' : 'Auto-Sync Sheets Aktif'}
            </div>
          )}

          {!resetConfirm ? (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data Contoh
            </button>
          ) : (
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
              <div className="text-[11px] text-stone-700">
                Kembalikan semua profil ke data awal?
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex-1 px-2 py-1 text-[11px] font-semibold text-white bg-red-700 rounded"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setResetConfirm(false)}
                  className="flex-1 px-2 py-1 text-[11px] font-medium text-stone-700 bg-stone-200 rounded"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex flex-col w-72 max-w-[85vw] bg-white h-full border-r border-stone-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <span className="font-serif text-lg font-bold text-stone-900">SustainaLedger</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg"
                aria-label="Tutup menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-left"
              >
                <span className="text-xs font-semibold text-stone-900 truncate">
                  {data.company.namaPerusahaan}
                </span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-emerald-900 text-white'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {item.num ? `${item.num}. ${item.label}` : item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3 bg-white/95 backdrop-blur-sm border-b border-stone-200 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-stone-600 hover:text-stone-900 rounded-lg lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-stone-500 min-w-0">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="hover:text-stone-900 whitespace-nowrap shrink-0 hidden md:inline truncate max-w-[180px]"
              >
                {data.company.namaPerusahaan}
              </button>
              <span className="hidden md:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-stone-900 truncate">
                {activeNav.num ? `${activeNav.num}. ${activeNav.label}` : activeNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg"
              role="group"
              aria-label="Pilih Tahun Pelaporan"
            >
              {([2023, 2024, 2025] as ReportYear[]).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedYear === yr
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPrintMode(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Ringkasan Cetak
            </button>
          </div>
        </header>

        {/* Active Pillar Viewport */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {activeSection === 'overview' && (
            <OverviewSection
              data={data}
              year={selectedYear}
              onSelectSection={handleSelectSection}
              onUpdateCompany={(company) =>
                updateActiveDataset((prev) => ({ ...prev, company }))
              }
              onPrintReport={() => setPrintMode(true)}
              onExportFullJson={() =>
                exportToJSON(`Sustainability_Report_${selectedYear}.json`, data)
              }
              onOpenProfileManager={() => setProfileModalOpen(true)}
            />
          )}

          {activeSection === 'csr' && (
            <CsrSection
              programs={data.csrPrograms}
              year={selectedYear}
              onAddProgram={(program: CsrProgram) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  csrPrograms: [program, ...prev.csrPrograms],
                }))
              }
              onUpdateProgram={(program: CsrProgram) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  csrPrograms: prev.csrPrograms.map((p) =>
                    p.id === program.id ? program : p
                  ),
                }))
              }
              onDeleteProgram={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  csrPrograms: prev.csrPrograms.filter((p) => p.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'k3' && (
            <K3Section
              summaries={data.k3Summaries}
              incidents={data.k3Incidents}
              year={selectedYear}
              onUpdateSummary={(yr: ReportYear, updated: K3YearSummary) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  k3Summaries: { ...prev.k3Summaries, [yr]: updated },
                }))
              }
              onAddIncident={(inc: K3IncidentLog) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  k3Incidents: [inc, ...prev.k3Incidents],
                }))
              }
              onUpdateIncident={(inc: K3IncidentLog) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  k3Incidents: prev.k3Incidents.map((i) =>
                    i.id === inc.id ? inc : i
                  ),
                }))
              }
              onDeleteIncident={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  k3Incidents: prev.k3Incidents.filter((i) => i.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'pelatihan' && (
            <PelatihanSection
              trainings={data.trainings}
              workforce={data.workforce}
              year={selectedYear}
              onAddTraining={(record: TrainingRecord) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  trainings: [record, ...prev.trainings],
                }))
              }
              onUpdateTraining={(record: TrainingRecord) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  trainings: prev.trainings.map((t) =>
                    t.id === record.id ? record : t
                  ),
                }))
              }
              onDeleteTraining={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  trainings: prev.trainings.filter((t) => t.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'kinerja-sosial' && (
            <KinerjaSosialSection
              workforce={data.workforce}
              year={selectedYear}
              onUpdateWorkforce={(yr: ReportYear, updated: WorkforceYearData) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  workforce: { ...prev.workforce, [yr]: updated },
                }))
              }
            />
          )}

          {activeSection === 'energi' && (
            <EnergiSection
              entries={data.energyEntries}
              volumeProduksiTon={data.company.volumeProduksiTon}
              year={selectedYear}
              onUpdateEntry={(id: string, konsumsiAsli: number) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  energyEntries: prev.energyEntries.map((e) =>
                    e.id === id ? { ...e, konsumsiAsli } : e
                  ),
                }))
              }
              onUpdateFullEntry={(entry: EnergySourceEntry) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  energyEntries: prev.energyEntries.map((e) =>
                    e.id === entry.id ? entry : e
                  ),
                }))
              }
              onAddEntry={(entry: EnergySourceEntry) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  energyEntries: [...prev.energyEntries, entry],
                }))
              }
              onDeleteEntry={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  energyEntries: prev.energyEntries.filter((e) => e.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'lingkungan' && (
            <LingkunganSection
              environment={data.environment}
              energyEntries={data.energyEntries}
              year={selectedYear}
              onUpdateEnvironment={(yr: ReportYear, updated: EnvironmentYearData) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  environment: { ...prev.environment, [yr]: updated },
                }))
              }
            />
          )}

          {activeSection === 'pemasaran' && (
            <PemasaranSection
              marketing={data.marketing}
              year={selectedYear}
              onUpdateMarketing={(yr: ReportYear, updated: MarketingYearData) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  marketing: { ...prev.marketing, [yr]: updated },
                }))
              }
            />
          )}

          {activeSection === 'supply-chain' && (
            <SupplyChainSection
              entries={data.supplyChain}
              year={selectedYear}
              onAddEntry={(entry: SupplyChainEntry) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  supplyChain: [...prev.supplyChain, entry],
                }))
              }
              onUpdateEntry={(entry: SupplyChainEntry) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  supplyChain: prev.supplyChain.map((s) =>
                    s.id === entry.id ? entry : s
                  ),
                }))
              }
              onDeleteEntry={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  supplyChain: prev.supplyChain.filter((s) => s.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'penghargaan' && (
            <PenghargaanSection
              items={data.certifications}
              year={selectedYear}
              onAddItem={(item: CertificationAward) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  certifications: [item, ...prev.certifications],
                }))
              }
              onUpdateItem={(item: CertificationAward) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  certifications: prev.certifications.map((c) =>
                    c.id === item.id ? item : c
                  ),
                }))
              }
              onDeleteItem={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  certifications: prev.certifications.filter((c) => c.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'asosiasi' && (
            <AsosiasiSection
              items={data.associations}
              year={selectedYear}
              onAddItem={(item: AssociationMembership) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  associations: [...prev.associations, item],
                }))
              }
              onUpdateItem={(item: AssociationMembership) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  associations: prev.associations.map((a) =>
                    a.id === item.id ? item : a
                  ),
                }))
              }
              onDeleteItem={(id: string) =>
                updateActiveDataset((prev) => ({
                  ...prev,
                  associations: prev.associations.filter((a) => a.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'spreadsheet' && (
            <SpreadsheetSyncSection
              companyName={data.company.namaPerusahaan}
              dataset={data}
              profiles={profiles}
              connection={activeProfile.spreadsheet}
              googleUser={googleUser}
              hasAccessToken={hasAccessToken}
              isSyncing={isSyncing}
              syncError={syncError}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleGoogleSignOut}
              onUpdateConnection={updateActiveConnection}
              onReplaceDataset={(next) => {
                skipNextAutoSyncRef.current = true;
                updateActiveDataset(() => next);
              }}
              onTriggerManualSync={() => runSpreadsheetSync(activeProfile)}
              getAccessToken={getSheetsAccessToken}
            />
          )}
        </main>

        <footer className="px-4 sm:px-8 py-5 border-t border-stone-200 text-xs text-stone-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 no-print">
          <span>
            {data.company.namaPerusahaan} · Laporan Keberlanjutan Tahun Buku {selectedYear}
          </span>
          <span>Acuan Pelaporan: {data.company.standarAcuan}</span>
        </footer>
      </div>

      <ProfileManagerModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfile.id}
        onSwitchProfile={(id) => {
          skipNextAutoSyncRef.current = true;
          setActiveProfileId(id);
        }}
        onCreateProfile={(newProfile) => {
          skipNextAutoSyncRef.current = true;
          setProfiles((prev) => [...prev, newProfile]);
        }}
        onUpdateProfileCompany={(id, company: CompanyProfile) => {
          setProfiles((prev) =>
            prev.map((prof) =>
              prof.id === id
                ? {
                    ...prof,
                    labelSingkat: company.namaPerusahaan,
                    dataset: { ...prof.dataset, company },
                  }
                : prof
            )
          );
        }}
        onDeleteProfile={(id) => {
          setProfiles((prev) => {
            const next = prev.filter((p) => p.id !== id);
            if (next.length > 0 && id === activeProfileId) {
              skipNextAutoSyncRef.current = true;
              setActiveProfileId(next[0].id);
            }
            return next;
          });
        }}
      />
    </div>
  );
}
