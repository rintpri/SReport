import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { MarketEntry, MarketingYearData, ReportYear } from '../../types/esg';
import { exportToCSV, formatNumber } from '../../utils/formatters';
import { HorizontalBarList, StackedProportionBar } from '../Charts';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface PemasaranSectionProps {
  marketing: Record<ReportYear, MarketingYearData>;
  year: ReportYear;
  onUpdateMarketing: (year: ReportYear, updated: MarketingYearData) => void;
}

export const PemasaranSection: React.FC<PemasaranSectionProps> = ({
  marketing,
  year,
  onUpdateMarketing,
}) => {
  const mkt = marketing[year];
  const [modalOpen, setModalOpen] = useState<'dn' | 'ln' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wilayah, setWilayah] = useState('');
  const [segmen, setSegmen] = useState('');
  const [volume, setVolume] = useState('4500');
  const [pendapatan, setPendapatan] = useState('85');

  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [draftKepuasan, setDraftKepuasan] = useState(String(mkt.indeksKepuasanPelanggan));
  const [draftKepatuhan, setDraftKepatuhan] = useState(String(mkt.kepatuhanLabelPersen));

  const openAddMarket = (type: 'dn' | 'ln') => {
    setEditingId(null);
    setWilayah('');
    setSegmen('');
    setVolume('4500');
    setPendapatan('85');
    setModalOpen(type);
  };

  const openEditMarket = (type: 'dn' | 'ln', item: MarketEntry) => {
    setEditingId(item.id);
    setWilayah(item.wilayahAtauNegara);
    setSegmen(item.segmenProduk);
    setVolume(String(item.volumeTon));
    setPendapatan(String(item.pendapatanMiliarRp));
    setModalOpen(type);
  };

  const totalRevDN = mkt.pasarDN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);
  const totalRevLN = mkt.pasarLN.reduce((acc, m) => acc + m.pendapatanMiliarRp, 0);
  const totalRev = totalRevDN + totalRevLN;

  const totalVolDN = mkt.pasarDN.reduce((acc, m) => acc + m.volumeTon, 0);
  const totalVolLN = mkt.pasarLN.reduce((acc, m) => acc + m.volumeTon, 0);
  const totalVol = totalVolDN + totalVolLN;

  const pctDN = totalRev > 0 ? (totalRevDN / totalRev) * 100 : 0;
  const pctLN = totalRev > 0 ? (totalRevLN / totalRev) * 100 : 0;

  const handleAddMarket = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: MarketEntry = {
      id: editingId || `mkt-${Date.now()}`,
      wilayahAtauNegara: wilayah.trim(),
      segmenProduk: segmen.trim(),
      volumeTon: Number(volume) || 0,
      pendapatanMiliarRp: Number(pendapatan) || 0,
    };
    if (modalOpen === 'dn') {
      onUpdateMarketing(year, {
        ...mkt,
        pasarDN: editingId
          ? mkt.pasarDN.map((m) => (m.id === editingId ? entry : m))
          : [...mkt.pasarDN, entry],
      });
    } else if (modalOpen === 'ln') {
      onUpdateMarketing(year, {
        ...mkt,
        pasarLN: editingId
          ? mkt.pasarLN.map((m) => (m.id === editingId ? entry : m))
          : [...mkt.pasarLN, entry],
      });
    }
    setEditingId(null);
    setModalOpen(null);
  };

  const handleSaveMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMarketing(year, {
      ...mkt,
      indeksKepuasanPelanggan: Math.min(100, Math.max(0, Number(draftKepuasan) || 0)),
      kepatuhanLabelPersen: Math.min(100, Math.max(0, Number(draftKepatuhan) || 0)),
    });
    setMetricsModalOpen(false);
  };

  const handleDelete = (type: 'dn' | 'ln', id: string) => {
    if (type === 'dn') {
      onUpdateMarketing(year, { ...mkt, pasarDN: mkt.pasarDN.filter((m) => m.id !== id) });
    } else {
      onUpdateMarketing(year, { ...mkt, pasarLN: mkt.pasarLN.filter((m) => m.id !== id) });
    }
  };

  const handleExport = () => {
    exportToCSV(
      `Pemasaran_DN_LN_${year}.csv`,
      ['Jenis Pasar', 'Wilayah / Negara', 'Segmen Produk', 'Volume (Ton)', 'Pendapatan (Rp Miliar)'],
      [
        ...mkt.pasarDN.map((m) => ['Dalam Negeri (DN)', m.wilayahAtauNegara, m.segmenProduk, m.volumeTon, m.pendapatanMiliarRp]),
        ...mkt.pasarLN.map((m) => ['Luar Negeri (LN)', m.wilayahAtauNegara, m.segmenProduk, m.volumeTon, m.pendapatanMiliarRp]),
      ]
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="07 / PEMASARAN & JANGKAUAN PASAR"
        title="Distribusi Pasar Dalam Negeri (DN) dan Luar Negeri (LN)"
        subtitle="Kinerja pemasaran produk berkelanjutan pada pasar domestik maupun tujuan ekspor mancanegara berdasarkan volume penjualan dan nilai pendapatan."
        standardRef="GRI 201-1 · GRI 417-1 · POJK 51/2017"
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
              onClick={() => openAddMarket('dn')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pasar DN
            </button>
            <button
              type="button"
              onClick={() => openAddMarket('ln')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pasar LN
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftKepuasan(String(mkt.indeksKepuasanPelanggan));
                setDraftKepatuhan(String(mkt.kepatuhanLabelPersen));
                setMetricsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ubah Indeks Kepuasan
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Pendapatan Pasar (${year})`}
          value={`Rp ${formatNumber(totalRev)}`}
          unit="Miliar"
          context={`Total volume tersalurkan ${formatNumber(totalVol)} Ton`}
        />
        <KpiCard
          label="Pasar Dalam Negeri (DN)"
          value={`${pctDN.toFixed(1)}%`}
          unit={`Rp ${formatNumber(totalRevDN)} M`}
          context={`Volume domestik: ${formatNumber(totalVolDN)} Ton`}
          tone="positive"
        />
        <KpiCard
          label="Pasar Luar Negeri (Ekspor)"
          value={`${pctLN.toFixed(1)}%`}
          unit={`Rp ${formatNumber(totalRevLN)} M`}
          context={`Volume ekspor: ${formatNumber(totalVolLN)} Ton`}
        />
        <KpiCard
          label="Indeks Kepuasan & Kepatuhan Label"
          value={`${mkt.indeksKepuasanPelanggan}%`}
          context={`Kepatuhan informasi & label produk: ${mkt.kepatuhanLabelPersen}%`}
          tone="positive"
        />
      </div>

      <div className="p-6 bg-white border border-stone-200 rounded-xl">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
          Proporsi Pendapatan Pasar Dalam Negeri vs Luar Negeri ({year})
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Perbandingan kontribusi penjualan domestik terhadap pasar ekspor internasional
        </p>
        <StackedProportionBar
          segments={[
            { label: 'Pasar Dalam Negeri (DN)', value: totalRevDN, color: '#14532D' },
            { label: 'Pasar Luar Negeri (Ekspor)', value: totalRevLN, color: '#1E3A8A' },
          ]}
          formatValue={(v) => `Rp ${formatNumber(v)} M`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DN Breakdown */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Pasar Dalam Negeri (DN) — {year}
            </h2>
            <p className="text-xs text-stone-500">Wilayah distribusi domestik</p>
          </div>
          <div className="p-6 border-b border-stone-100">
            <HorizontalBarList
              items={mkt.pasarDN.map((m) => ({
                label: m.wilayahAtauNegara,
                value: m.pendapatanMiliarRp,
                secondaryLabel: `${formatNumber(m.volumeTon)} Ton`,
              }))}
              formatValue={(v) => `Rp ${formatNumber(v)} M`}
              defaultColor="#14532D"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-stone-100">
                {mkt.pasarDN.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{m.wilayahAtauNegara}</div>
                      <div className="text-stone-500">{m.segmenProduk}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatNumber(m.volumeTon)} Ton
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      Rp {formatNumber(m.pendapatanMiliarRp)} M
                    </td>
                    <td className="py-3 px-4 text-right no-print whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditMarket('dn', m)}
                        className="p-1 text-stone-400 hover:text-emerald-900"
                        aria-label={`Edit ${m.wilayahAtauNegara}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('dn', m.id)}
                        className="p-1 text-stone-400 hover:text-red-700"
                        aria-label={`Hapus ${m.wilayahAtauNegara}`}
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

        {/* LN Breakdown */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Pasar Luar Negeri (Ekspor) — {year}
            </h2>
            <p className="text-xs text-stone-500">Kawasan dan negara tujuan ekspor</p>
          </div>
          <div className="p-6 border-b border-stone-100">
            <HorizontalBarList
              items={mkt.pasarLN.map((m) => ({
                label: m.wilayahAtauNegara,
                value: m.pendapatanMiliarRp,
                secondaryLabel: `${formatNumber(m.volumeTon)} Ton`,
              }))}
              formatValue={(v) => `Rp ${formatNumber(v)} M`}
              defaultColor="#1E3A8A"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-stone-100">
                {mkt.pasarLN.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{m.wilayahAtauNegara}</div>
                      <div className="text-stone-500">{m.segmenProduk}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatNumber(m.volumeTon)} Ton
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      Rp {formatNumber(m.pendapatanMiliarRp)} M
                    </td>
                    <td className="py-3 px-4 text-right no-print whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditMarket('ln', m)}
                        className="p-1 text-stone-400 hover:text-emerald-900"
                        aria-label={`Edit ${m.wilayahAtauNegara}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('ln', m.id)}
                        className="p-1 text-stone-400 hover:text-red-700"
                        aria-label={`Hapus ${m.wilayahAtauNegara}`}
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
      </div>

      <Modal
        open={modalOpen !== null}
        onClose={() => setModalOpen(null)}
        title={
          editingId
            ? modalOpen === 'dn'
              ? `Edit Pasar Dalam Negeri (${year})`
              : `Edit Pasar Luar Negeri (${year})`
            : modalOpen === 'dn'
              ? `Tambah Pasar Dalam Negeri (${year})`
              : `Tambah Pasar Luar Negeri (${year})`
        }
      >
        <form onSubmit={handleAddMarket} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              {modalOpen === 'dn' ? 'Wilayah Domestik' : 'Negara / Kawasan Ekspor'}
            </label>
            <input
              type="text"
              required
              placeholder={modalOpen === 'dn' ? 'Contoh: Bali & Nusa Tenggara' : 'Contoh: Australia & Selandia Baru'}
              value={wilayah}
              onChange={(e) => setWilayah(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Segmen Produk</label>
            <input
              type="text"
              required
              value={segmen}
              onChange={(e) => setSegmen(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Volume (Ton)</label>
              <input
                type="number"
                min={0}
                required
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Pendapatan (Rp Miliar)</label>
              <input
                type="number"
                min={0}
                required
                value={pendapatan}
                onChange={(e) => setPendapatan(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Pasar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        title={`Edit Indeks Kepuasan & Kepatuhan Label (${year})`}
      >
        <form onSubmit={handleSaveMetrics} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Indeks Kepuasan Pelanggan (%)
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              required
              value={draftKepuasan}
              onChange={(e) => setDraftKepuasan(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Kepatuhan Informasi & Label Produk (%)
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              required
              value={draftKepatuhan}
              onChange={(e) => setDraftKepatuhan(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMetricsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Indeks
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
