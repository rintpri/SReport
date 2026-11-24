import React, { useState } from 'react';
import { Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { EnergyCategory, EnergySourceEntry, ReportYear } from '../../types/esg';
import {
  calculateEntryEmissionsTonCO2e,
  calculateEntryGJ,
  exportToCSV,
  formatNumber,
} from '../../utils/formatters';
import { HorizontalBarList, MultiYearBarChart, StackedProportionBar } from '../Charts';
import { KpiCard, Modal, SectionHeader } from '../UiPrimitives';

interface EnergiSectionProps {
  entries: EnergySourceEntry[];
  volumeProduksiTon: Record<ReportYear, number>;
  year: ReportYear;
  onUpdateEntry: (id: string, konsumsiAsli: number) => void;
  onUpdateFullEntry: (entry: EnergySourceEntry) => void;
  onAddEntry: (entry: EnergySourceEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const DEFAULT_FACTORS: Record<
  EnergySourceEntry['unitAsli'],
  { faktorGJ: number; faktorEmisi: number; note: string }
> = {
  kWh: {
    faktorGJ: 0.0036,
    faktorEmisi: 0.2417,
    note: '1 kWh = 0,0036 GJ · Grid ESDM',
  },
  Ton: {
    faktorGJ: 25.8,
    faktorEmisi: 0.0946,
    note: 'IPCC NCV Batu Bara 25,8 GJ/ton',
  },
  Liter: {
    faktorGJ: 0.0364,
    faktorEmisi: 0.0741,
    note: '1 Liter Solar = 0,0364 GJ',
  },
  MMBTU: {
    faktorGJ: 1.05506,
    faktorEmisi: 0.0561,
    note: '1 MMBTU = 1,05506 GJ',
  },
};

export const EnergiSection: React.FC<EnergiSectionProps> = ({
  entries,
  volumeProduksiTon,
  year,
  onUpdateEntry,
  onUpdateFullEntry,
  onAddEntry,
  onDeleteEntry,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sumber, setSumber] = useState('');
  const [kategori, setKategori] = useState<EnergyCategory>('Bahan Bakar Fosil');
  const [unitAsli, setUnitAsli] = useState<EnergySourceEntry['unitAsli']>('Liter');
  const [konsumsiAsli, setKonsumsiAsli] = useState('100000');
  const [faktorKonversiGJ, setFaktorKonversiGJ] = useState('0.0364');
  const [faktorEmisi, setFaktorEmisi] = useState('0.0741');

  const openAddModal = () => {
    setEditingId(null);
    setSumber('');
    setKategori('Bahan Bakar Fosil');
    setUnitAsli('Liter');
    setKonsumsiAsli('100000');
    setFaktorKonversiGJ('0.0364');
    setFaktorEmisi('0.0741');
    setModalOpen(true);
  };

  const openEditModal = (item: EnergySourceEntry) => {
    setEditingId(item.id);
    setSumber(item.sumber);
    setKategori(item.kategori);
    setUnitAsli(item.unitAsli);
    setKonsumsiAsli(String(item.konsumsiAsli));
    setFaktorKonversiGJ(String(item.faktorKonversiGJ));
    setFaktorEmisi(String(item.faktorEmisiTonCO2ePerGJ));
    setModalOpen(true);
  };

  const yearEntries = entries.filter((e) => e.year === year);
  const totalGJ = yearEntries.reduce((acc, e) => acc + calculateEntryGJ(e), 0);
  const renewableGJ = yearEntries
    .filter((e) => e.kategori === 'Energi Terbarukan')
    .reduce((acc, e) => acc + calculateEntryGJ(e), 0);
  const gridGJ = yearEntries
    .filter((e) => e.kategori === 'Listrik Grid')
    .reduce((acc, e) => acc + calculateEntryGJ(e), 0);
  const fossilGJ = yearEntries
    .filter((e) => e.kategori === 'Bahan Bakar Fosil')
    .reduce((acc, e) => acc + calculateEntryGJ(e), 0);

  const produksi = volumeProduksiTon[year] || 1;
  const intensityGJPerTon = totalGJ / produksi;
  const renewableShare = totalGJ > 0 ? (renewableGJ / totalGJ) * 100 : 0;

  const multiYearGJ = ([2023, 2024, 2025] as ReportYear[]).map((y) => ({
    year: y,
    value: entries
      .filter((e) => e.year === y)
      .reduce((acc, e) => acc + calculateEntryGJ(e), 0),
    secondaryValue: entries
      .filter((e) => e.year === y && e.kategori === 'Energi Terbarukan')
      .reduce((acc, e) => acc + calculateEntryGJ(e), 0),
  }));

  const handleUnitChange = (u: EnergySourceEntry['unitAsli']) => {
    setUnitAsli(u);
    setFaktorKonversiGJ(String(DEFAULT_FACTORS[u].faktorGJ));
    setFaktorEmisi(String(DEFAULT_FACTORS[u].faktorEmisi));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EnergySourceEntry = {
      id: editingId || `en-${Date.now()}`,
      year,
      sumber: sumber.trim(),
      kategori,
      unitAsli,
      konsumsiAsli: Number(konsumsiAsli) || 0,
      faktorKonversiGJ: Number(faktorKonversiGJ) || 0,
      faktorEmisiTonCO2ePerGJ: kategori === 'Energi Terbarukan' ? 0 : Number(faktorEmisi) || 0,
      catatanFaktor: DEFAULT_FACTORS[unitAsli].note,
    };
    if (editingId) {
      onUpdateFullEntry(payload);
    } else {
      onAddEntry(payload);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      `Konsumsi_Energi_GJ_${year}.csv`,
      ['Sumber Energi', 'Kategori', 'Konsumsi Fisik', 'Satuan', 'Faktor Konversi GJ', 'Total Energi (GJ)', 'Porsi (%)', 'Estimasi Emisi (tCO2e)'],
      yearEntries.map((e) => {
        const gj = calculateEntryGJ(e);
        return [
          e.sumber,
          e.kategori,
          e.konsumsiAsli,
          e.unitAsli,
          e.faktorKonversiGJ,
          gj.toFixed(2),
          totalGJ > 0 ? ((gj / totalGJ) * 100).toFixed(2) : '0',
          calculateEntryEmissionsTonCO2e(e).toFixed(2),
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        indexLabel="05 / KONSUMSI & EFISIENSI ENERGI"
        title="Penggunaan Energi (Listrik, Batu Bara, Solar / BBM) dalam Gigajoule (GJ)"
        subtitle="Konversi terstandarisasi konsumsi energi listrik, batu bara, bahan bakar minyak (solar/biosolar), gas alam, dan pembangkit energi terbarukan ke dalam satuan Gigajoule (GJ)."
        standardRef="GRI 302-1 · GRI 302-3 · ISO 50001:2018"
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
              Tambah Sumber Energi
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Total Konsumsi Energi (${year})`}
          value={formatNumber(totalGJ)}
          unit="GJ"
          context="Akumulasi seluruh sumber energi operasional"
        />
        <KpiCard
          label="Energi Terbarukan (PLTS)"
          value={formatNumber(renewableGJ)}
          unit="GJ"
          context={`Kontribusi ${renewableShare.toFixed(1)}% terhadap bauran energi`}
          tone="positive"
        />
        <KpiCard
          label="Intensitas Energi"
          value={intensityGJPerTon.toFixed(2)}
          unit="GJ / Ton Produk"
          context={`Volume produksi: ${formatNumber(produksi)} Ton`}
        />
        <KpiCard
          label="Listrik Grid PLN"
          value={formatNumber(gridGJ)}
          unit="GJ"
          context={`Setara ${formatNumber(gridGJ / 0.0036)} kWh`}
        />
      </div>

      {/* Bauran Energi */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
          Bauran Konsumsi Energi dalam Gigajoule ({year})
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Proporsi bahan bakar fosil langsung, listrik grid, dan energi baru terbarukan
        </p>
        <StackedProportionBar
          segments={[
            { label: 'Bahan Bakar Fosil (Batu Bara, Solar, Gas)', value: fossilGJ, color: '#334155' },
            { label: 'Listrik Grid PLN', value: gridGJ, color: '#D97706' },
            { label: 'Energi Terbarukan (PLTS Atap)', value: renewableGJ, color: '#16A34A' },
          ]}
          formatValue={(v) => `${formatNumber(v)} GJ`}
        />
      </div>

      {/* Interactive GJ Conversion Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Tabel Konversi Konsumsi Fisik ke Gigajoule (GJ) — {year}
          </h2>
          <p className="text-xs text-stone-500">
            Ubah angka konsumsi fisik secara langsung pada kolom input untuk melihat konversi GJ dan kontribusi emisi secara otomatis
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Sumber Energi</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Konsumsi Fisik (Edit)</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4 text-right">Faktor (GJ/Unit)</th>
                <th className="py-3 px-4 text-right">Total Energi (GJ)</th>
                <th className="py-3 px-4 text-right">Porsi</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {yearEntries.map((item) => {
                const gj = calculateEntryGJ(item);
                const share = totalGJ > 0 ? (gj / totalGJ) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-stone-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-900">{item.sumber}</div>
                      <div className="text-xs text-stone-500">{item.catatanFaktor}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-700 whitespace-nowrap">
                      {item.kategori}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <input
                        type="number"
                        min={0}
                        value={item.konsumsiAsli}
                        onChange={(e) => onUpdateEntry(item.id, Number(e.target.value) || 0)}
                        className="w-36 px-2.5 py-1 text-right font-mono text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        aria-label={`Konsumsi ${item.sumber}`}
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                      {item.unitAsli}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                      {item.faktorKonversiGJ}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-emerald-900 tabular-nums whitespace-nowrap">
                      {formatNumber(gj, 1)} GJ
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600 tabular-nums">
                      {share.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right no-print whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-stone-400 hover:text-emerald-900 rounded-md"
                        aria-label={`Edit ${item.sumber}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(item.id)}
                        className="p-1.5 text-stone-400 hover:text-red-700 rounded-md"
                        aria-label={`Hapus ${item.sumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-stone-50 font-semibold border-t border-stone-200">
                <td className="py-3.5 px-4 text-stone-900" colSpan={5}>
                  Total Energi Terkonsumsi ({year})
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-900 tabular-nums">
                  {formatNumber(totalGJ, 1)} GJ
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">100.0%</td>
                <td className="no-print" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Peringkat Sumber Energi Terbesar ({year})
          </h2>
          <p className="text-xs text-stone-500 mb-4">Konsumsi tiap sumber energi dalam satuan Gigajoule (GJ)</p>
          <HorizontalBarList
            items={yearEntries
              .map((e) => ({
                label: e.sumber,
                value: calculateEntryGJ(e),
                color: e.kategori === 'Energi Terbarukan' ? '#16A34A' : '#334155',
              }))
              .sort((a, b) => b.value - a.value)}
            formatValue={(v) => `${formatNumber(v)} GJ`}
          />
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1">
            Tren Konsumsi Energi Tahunan (2023–2025)
          </h2>
          <p className="text-xs text-stone-500 mb-4">Total energi (GJ) dibandingkan ekspansi energi terbarukan</p>
          <MultiYearBarChart
            data={multiYearGJ}
            primaryLabel="Total Energi (GJ)"
            secondaryLabel="Energi Terbarukan (GJ)"
            formatValue={(v) => `${formatNumber(v)} GJ`}
            primaryColor="#334155"
            secondaryColor="#16A34A"
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Sumber Energi (${year})` : `Tambah Sumber Energi (${year})`}
        subtitle="Konversi ke Gigajoule (GJ) menggunakan faktor kalor standar IPCC / ESDM"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nama Sumber Energi</label>
            <input
              type="text"
              required
              placeholder="Contoh: Biosolar B35 Armada Distribusi Gresik"
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as EnergyCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="Bahan Bakar Fosil">Bahan Bakar Fosil</option>
                <option value="Listrik Grid">Listrik Grid</option>
                <option value="Energi Terbarukan">Energi Terbarukan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Satuan Fisik</label>
              <select
                value={unitAsli}
                onChange={(e) => handleUnitChange(e.target.value as EnergySourceEntry['unitAsli'])}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="kWh">kWh (Listrik)</option>
                <option value="Ton">Ton (Batu Bara / Biomassa)</option>
                <option value="Liter">Liter (Solar / BBM)</option>
                <option value="MMBTU">MMBTU (Gas Alam)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Konsumsi Fisik</label>
              <input
                type="number"
                required
                min={0}
                value={konsumsiAsli}
                onChange={(e) => setKonsumsiAsli(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Faktor GJ/Unit</label>
              <input
                type="number"
                step="any"
                required
                min={0}
                value={faktorKonversiGJ}
                onChange={(e) => setFaktorKonversiGJ(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Emisi (tCO₂e/GJ)</label>
              <input
                type="number"
                step="any"
                required
                min={0}
                value={kategori === 'Energi Terbarukan' ? '0' : faktorEmisi}
                disabled={kategori === 'Energi Terbarukan'}
                onChange={(e) => setFaktorEmisi(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg disabled:bg-stone-100"
              />
            </div>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg text-xs font-mono text-stone-700">
            Hasil Konversi: {formatNumber((Number(konsumsiAsli) || 0) * (Number(faktorKonversiGJ) || 0), 2)} GJ
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
              Simpan Energi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
