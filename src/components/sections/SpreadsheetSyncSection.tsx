import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Unlink,
  Upload,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { EsgDataset, ProfileWorkspace, SpreadsheetConnection } from '../../types/esg';
import {
  exportAllProfilesToExcel,
  exportDatasetToExcel,
  importDatasetFromExcel,
} from '../../services/excelSync';
import {
  createSustainabilitySpreadsheet,
  ESG_SHEET_TABS,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  pullDatasetFromSpreadsheet,
  syncDatasetToSpreadsheet,
} from '../../services/googleSheetsSync';
import { KpiCard, Modal, SectionHeader, StatusText } from '../UiPrimitives';

interface SpreadsheetSyncSectionProps {
  companyName: string;
  dataset: EsgDataset;
  profiles: ProfileWorkspace[];
  connection?: SpreadsheetConnection;
  googleUser: User | null;
  hasAccessToken: boolean;
  isSyncing: boolean;
  syncError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateConnection: (conn: SpreadsheetConnection | undefined) => void;
  onReplaceDataset: (next: EsgDataset) => void;
  onTriggerManualSync: () => Promise<void>;
  getAccessToken: () => string | null;
}

type ConfirmAction =
  | { type: 'push-existing'; spreadsheetId: string; title: string }
  | { type: 'enable-autosync'; spreadsheetId: string; title: string }
  | { type: 'pull-from-sheet'; spreadsheetId: string; title: string }
  | { type: 'disconnect' }
  | null;

export const SpreadsheetSyncSection: React.FC<SpreadsheetSyncSectionProps> = ({
  companyName,
  dataset,
  profiles,
  connection,
  googleUser,
  hasAccessToken,
  isSyncing,
  syncError,
  onSignIn,
  onSignOut,
  onUpdateConnection,
  onReplaceDataset,
  onTriggerManualSync,
  getAccessToken,
}) => {
  const [newSheetTitle, setNewSheetTitle] = useState(
    `Laporan Keberlanjutan - ${companyName}`
  );
  const [existingUrlInput, setExistingUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    setNewSheetTitle(`Laporan Keberlanjutan - ${companyName}`);
    setLocalError(null);
    setLocalSuccess(null);
  }, [companyName]);

  const handleCreateSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setLocalError('Silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    setLocalSuccess(null);
    try {
      const created = await createSustainabilitySpreadsheet(
        newSheetTitle.trim() || `Laporan Keberlanjutan - ${companyName}`,
        token
      );
      const syncRes = await syncDatasetToSpreadsheet(created.spreadsheetId, dataset, token);
      onUpdateConnection({
        spreadsheetId: created.spreadsheetId,
        spreadsheetTitle: created.title,
        spreadsheetUrl: created.spreadsheetUrl,
        autoSync: true,
        lastSyncedAt: syncRes.syncedAt,
      });
      setLocalSuccess(
        `Spreadsheet "${created.title}" berhasil dibuat dengan ${syncRes.updatedTabs} tab dan sinkronisasi otomatis telah aktif.`
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Gagal membuat spreadsheet baru.');
    } finally {
      setBusy(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setLocalError('Silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }
    const id = extractSpreadsheetId(existingUrlInput);
    if (!id) {
      setLocalError('URL atau ID Google Sheets tidak valid.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    setLocalSuccess(null);
    try {
      const meta = await getSpreadsheetMetadata(id, token);
      onUpdateConnection({
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: meta.spreadsheetUrl,
        autoSync: false,
      });
      setExistingUrlInput('');
      setLocalSuccess(
        `Terhubung ke "${meta.title}". Anda dapat menarik data dari Spreadsheet atau menyinkronkan data aplikasi ke Spreadsheet.`
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Gagal membaca metadata spreadsheet.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmExecute = async () => {
    if (!confirmAction) return;
    const token = getAccessToken();

    if (confirmAction.type === 'disconnect') {
      onUpdateConnection(undefined);
      setConfirmAction(null);
      setLocalSuccess('Koneksi Spreadsheet telah diputuskan dari profil ini.');
      return;
    }

    if (!token) {
      setConfirmAction(null);
      setLocalError('Sesi Google Sheets belum aktif. Silakan klik Sign in with Google.');
      return;
    }

    setBusy(true);
    setLocalError(null);
    setLocalSuccess(null);
    try {
      if (confirmAction.type === 'push-existing') {
        await onTriggerManualSync();
        setLocalSuccess('Seluruh data 10 pilar berhasil disinkronkan ke Google Sheets.');
      } else if (confirmAction.type === 'enable-autosync' && connection) {
        const res = await syncDatasetToSpreadsheet(connection.spreadsheetId, dataset, token);
        onUpdateConnection({
          ...connection,
          autoSync: true,
          lastSyncedAt: res.syncedAt,
        });
        setLocalSuccess('Sinkronisasi otomatis diaktifkan dan data telah diperbarui ke Spreadsheet.');
      } else if (confirmAction.type === 'pull-from-sheet' && connection) {
        const pulled = await pullDatasetFromSpreadsheet(
          connection.spreadsheetId,
          dataset,
          token
        );
        onReplaceDataset(pulled);
        setLocalSuccess('Data berhasil ditarik dari Google Sheets ke aplikasi.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Operasi Google Sheets gagal.');
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setLocalError(null);
    setLocalSuccess(null);
    try {
      const imported = await importDatasetFromExcel(file, dataset);
      onReplaceDataset(imported);
      setLocalSuccess(
        `File Excel "${file.name}" berhasil dimuat ke localStorage untuk profil ${companyName}.`
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Gagal membaca file Excel.');
    } finally {
      setBusy(false);
    }
  };

  const formattedLastSync = connection?.lastSyncedAt
    ? new Date(connection.lastSyncedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Belum pernah';

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="EXCEL, HTML MANDIRI & GOOGLE SHEETS"
        title="Penyimpanan LocalStorage ke Excel (.xlsx), Versi HTML & Google Sheets"
        subtitle="Simpan dan muat ulang seluruh data localStorage ke file Excel (.xlsx 11 tab), unduh versi HTML tunggal (siap upload ke GitHub tanpa build), atau sinkronkan ke Google Sheets."
        standardRef="Excel .xlsx (11 Tab) · HTML Offline · Sheets API v4"
      />

      {/* LocalStorage -> Excel & Standalone HTML Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Simpan & Muat LocalStorage ke Excel (.xlsx)
            </h2>
            <p className="text-xs text-stone-600">
              Ekspor seluruh data 10 pilar dari localStorage menjadi workbook Excel multi-sheet (11 tab) atau muat kembali file Excel ke browser tanpa memerlukan login cloud.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                exportDatasetToExcel(dataset);
                setLocalSuccess(`Data profil "${companyName}" berhasil disimpan sebagai file Excel (.xlsx).`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Simpan Profil ke Excel (.xlsx)
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              Muat Excel (.xlsx) ke LocalStorage
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                exportAllProfilesToExcel(profiles);
                setLocalSuccess(`Cadangan ${profiles.length} profil tersimpan berhasil diunduh ke Excel (.xlsx).`);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-900 border border-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Cadangkan Semua Profil ({profiles.length})
            </button>
          </div>
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Versi HTML Tunggal Mandiri (Siap Upload GitHub / Offline)
            </h2>
            <p className="text-xs text-stone-600">
              Satu file HTML murni berisi seluruh 10 menu, fitur tambah/edit/hapus, ganti profil, penyimpanan localStorage, dan ekspor/impor Excel (.xlsx) tanpa memerlukan Node.js atau proses build. Cukup ganti namanya menjadi <code className="font-mono bg-stone-100 px-1 rounded">index.html</code> jika ingin langsung diunggah ke GitHub Pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a
              href="./laporan-keberlanjutan.html"
              download="laporan-keberlanjutan.html"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Unduh File HTML Tunggal (.html)
            </a>
            <a
              href="./laporan-keberlanjutan.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Pratinjau Versi HTML
            </a>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Status Akun Google"
          value={hasAccessToken ? 'Terhubung' : 'Belum Masuk'}
          context={googleUser?.email || 'Masuk dengan Google untuk mengakses Spreadsheet'}
          tone={hasAccessToken ? 'positive' : 'warning'}
        />
        <KpiCard
          label="Spreadsheet Tertaut"
          value={connection ? connection.spreadsheetTitle : 'Belum Tertaut'}
          context={connection ? `Sinkronisasi terakhir: ${formattedLastSync}` : 'Buat baru atau tautkan ID'}
        />
        <KpiCard
          label="Mode Sinkronisasi Otomatis"
          value={connection?.autoSync ? 'Aktif' : 'Manual'}
          context={
            isSyncing
              ? 'Sedang mengirim pembaruan ke Google Sheets...'
              : connection?.autoSync
                ? 'Setiap perubahan data otomatis dikirim ke Spreadsheet'
                : 'Klik Sinkronkan untuk memperbarui Spreadsheet'
          }
          tone={connection?.autoSync ? 'positive' : 'neutral'}
        />
      </div>

      {(localError || syncError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {localError || syncError}
        </div>
      )}

      {localSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{localSuccess}</span>
        </div>
      )}

      {/* Auth Panel */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            1. Autentikasi Akun Google Sheets
          </h2>
          <p className="text-xs text-stone-600">
            {hasAccessToken && googleUser
              ? `Masuk sebagai ${googleUser.displayName || googleUser.email} (${googleUser.email}). Token sesi disimpan aman hanya di memori.`
              : 'Masuk dengan akun Google Anda agar aplikasi dapat membuat, membaca, dan memperbarui Spreadsheet Anda.'}
          </p>
        </div>

        <div className="shrink-0">
          {!hasAccessToken ? (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Akun Google
            </button>
          )}
        </div>
      </div>

      {/* Connected Spreadsheet Controls OR Connect/Create Forms */}
      {connection ? (
        <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-semibold text-stone-900">
                    {connection.spreadsheetTitle}
                  </h2>
                  <StatusText
                    tone={connection.autoSync ? 'positive' : 'neutral'}
                    label={connection.autoSync ? 'Auto-Sync Aktif' : 'Mode Manual'}
                  />
                </div>
                <div className="mt-1 font-mono text-xs text-stone-500 break-all">
                  ID: {connection.spreadsheetId}
                </div>
              </div>
            </div>

            <a
              href={connection.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Buka Google Sheets
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!hasAccessToken || busy || isSyncing}
              onClick={() =>
                setConfirmAction({
                  type: 'push-existing',
                  spreadsheetId: connection.spreadsheetId,
                  title: connection.spreadsheetTitle,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sinkronkan Sekarang ke Sheets
            </button>

            <button
              type="button"
              disabled={!hasAccessToken || busy}
              onClick={() =>
                setConfirmAction({
                  type: 'pull-from-sheet',
                  spreadsheetId: connection.spreadsheetId,
                  title: connection.spreadsheetTitle,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Tarik Data dari Sheets ke Aplikasi
            </button>

            {!connection.autoSync ? (
              <button
                type="button"
                disabled={!hasAccessToken || busy}
                onClick={() =>
                  setConfirmAction({
                    type: 'enable-autosync',
                    spreadsheetId: connection.spreadsheetId,
                    title: connection.spreadsheetTitle,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-900 border border-emerald-800 hover:bg-emerald-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Aktifkan Auto-Sync Otomatis
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onUpdateConnection({
                    ...connection,
                    autoSync: false,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Jeda Auto-Sync
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'disconnect' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap ml-auto"
            >
              <Unlink className="w-3.5 h-3.5" />
              Putuskan Koneksi
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleCreateSpreadsheet}
            className="p-6 bg-white border border-stone-200 rounded-xl space-y-4"
          >
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                2A. Buat Spreadsheet Baru Otomatis
              </h2>
              <p className="text-xs text-stone-600">
                Membuat file Google Sheets baru berisi 11 tab lengkap dan mengaktifkan Auto-Sync otomatis.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Judul File Google Spreadsheet
              </label>
              <input
                type="text"
                required
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={!hasAccessToken || busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {busy ? 'Membuat Spreadsheet...' : 'Buat & Sinkronkan Otomatis'}
            </button>
          </form>

          <form
            onSubmit={handleConnectExisting}
            className="p-6 bg-white border border-stone-200 rounded-xl space-y-4"
          >
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                2B. Tautkan Spreadsheet yang Sudah Ada
              </h2>
              <p className="text-xs text-stone-600">
                Tempelkan tautan (URL) atau ID Google Spreadsheet yang ingin dihubungkan ke profil ini.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                URL atau Spreadsheet ID
              </label>
              <input
                type="text"
                required
                placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                value={existingUrlInput}
                onChange={(e) => setExistingUrlInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={!hasAccessToken || busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {busy ? 'Menghubungkan...' : 'Hubungkan Spreadsheet'}
            </button>
          </form>
        </div>
      )}

      {/* Schema Reference Table */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-3">
        <h3 className="font-serif text-base font-semibold text-stone-900">
          Struktur Tab Google Sheets Terkelola (11 Tab)
        </h3>
        <p className="text-xs text-stone-500">
          Setiap tab dipetakan langsung ke 10 pilar laporan keberlanjutan dan profil perusahaan aktif:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono text-stone-700">
          {ESG_SHEET_TABS.map((tab) => (
            <div key={tab} className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg truncate">
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Confirmation Modal before mutating Spreadsheet or overwriting local data */}
      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title="Konfirmasi Sinkronisasi Data"
      >
        <div className="space-y-4">
          {confirmAction?.type === 'push-existing' && (
            <p className="text-sm text-stone-700 leading-relaxed">
              Aplikasi akan memperbarui dan menimpa isi ke-11 tab laporan keberlanjutan pada Google Spreadsheet{' '}
              <strong>"{confirmAction.title}"</strong> dengan data terbaru dari profil{' '}
              <strong>{companyName}</strong>. Lanjutkan?
            </p>
          )}
          {confirmAction?.type === 'enable-autosync' && (
            <p className="text-sm text-stone-700 leading-relaxed">
              Mengaktifkan <strong>Auto-Sync</strong> berarti setiap penambahan, pengeditan, atau penghapusan data di aplikasi akan otomatis memperbarui tab terkait pada Google Spreadsheet{' '}
              <strong>"{confirmAction.title}"</strong>. Lanjutkan dan sinkronkan sekarang?
            </p>
          )}
          {confirmAction?.type === 'pull-from-sheet' && (
            <p className="text-sm text-stone-700 leading-relaxed">
              Data lokal pada profil <strong>{companyName}</strong> akan diperbarui menggunakan data terbaru yang dibaca dari Google Spreadsheet{' '}
              <strong>"{confirmAction.title}"</strong>. Lanjutkan?
            </p>
          )}
          {confirmAction?.type === 'disconnect' && (
            <p className="text-sm text-stone-700 leading-relaxed">
              Koneksi Spreadsheet akan dilepaskan dari profil <strong>{companyName}</strong> (file di Google Drive Anda tidak akan dihapus). Lanjutkan?
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleConfirmExecute}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              {busy ? 'Memproses...' : 'Konfirmasi & Lanjutkan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
