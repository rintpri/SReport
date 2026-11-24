import { EnergySourceEntry, K3YearSummary, WorkforceYearData } from '../types/esg';

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIDRCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} Jt`;
  }
  return formatIDR(amount);
}

export function formatNumber(val: number, decimals = 0): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calculateRecordableIncidents(summary: K3YearSummary): number {
  return summary.medicalTreatment + summary.restrictedWork + summary.lti + summary.fatality;
}

export function calculateTSIR(summary: K3YearSummary): number {
  if (summary.jamKerjaSelamat <= 0) return 0;
  const recordable = calculateRecordableIncidents(summary);
  return (recordable * summary.basisPerhitungan) / summary.jamKerjaSelamat;
}

export function calculateLTIFR(summary: K3YearSummary): number {
  if (summary.jamKerjaSelamat <= 0) return 0;
  return ((summary.lti + summary.fatality) * summary.basisPerhitungan) / summary.jamKerjaSelamat;
}

export function calculateSeverityRate(summary: K3YearSummary): number {
  if (summary.jamKerjaSelamat <= 0) return 0;
  return (summary.hariHilang * summary.basisPerhitungan) / summary.jamKerjaSelamat;
}

export function calculateEntryGJ(entry: EnergySourceEntry): number {
  return entry.konsumsiAsli * entry.faktorKonversiGJ;
}

export function calculateEntryEmissionsTonCO2e(entry: EnergySourceEntry): number {
  const gj = calculateEntryGJ(entry);
  return gj * entry.faktorEmisiTonCO2ePerGJ;
}

export function getWorkforceTotals(wf: WorkforceYearData) {
  const totalKaryawan = wf.jabatanBreakdown.reduce((acc, j) => acc + j.lakiLaki + j.perempuan, 0);
  const totalLaki = wf.jabatanBreakdown.reduce((acc, j) => acc + j.lakiLaki, 0);
  const totalPerempuan = wf.jabatanBreakdown.reduce((acc, j) => acc + j.perempuan, 0);
  const totalTetap = wf.jabatanBreakdown.reduce((acc, j) => acc + j.tetap, 0);
  const totalKontrak = wf.jabatanBreakdown.reduce((acc, j) => acc + j.kontrak, 0);
  const totalLokal = wf.jabatanBreakdown.reduce((acc, j) => acc + j.lokal, 0);
  const totalTka = wf.jabatanBreakdown.reduce((acc, j) => acc + j.tka, 0);

  return {
    totalKaryawan,
    totalLaki,
    totalPerempuan,
    totalTetap,
    totalKontrak,
    totalLokal,
    totalTka,
  };
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
