import React from 'react';
import { X } from 'lucide-react';

interface SectionHeaderProps {
  indexLabel: string;
  title: string;
  subtitle: string;
  standardRef?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  indexLabel,
  title,
  subtitle,
  standardRef,
  actions,
}) => {
  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-stone-200 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
          <span className="font-mono text-emerald-900">{indexLabel}</span>
          {standardRef && (
            <>
              <span aria-hidden="true">·</span>
              <span>{standardRef}</span>
            </>
          )}
        </div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-stone-600">{subtitle}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
          {actions}
        </div>
      )}
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  context?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  context,
  tone = 'neutral',
}) => {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-800'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-stone-900';

  return (
    <div className="flex flex-col justify-between p-5 bg-white border border-stone-200 rounded-xl">
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-mono text-2xl font-semibold tracking-tight tabular-nums ${toneClass}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-stone-500">{unit}</span>}
      </div>
      {context && (
        <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500">
          {context}
        </div>
      )}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-stone-200">
          <div>
            <h2 id="modal-title" className="font-serif text-lg font-semibold text-stone-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Tutup jendela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

interface StatusTextProps {
  tone: 'positive' | 'warning' | 'danger' | 'neutral';
  label: string;
}

export const StatusText: React.FC<StatusTextProps> = ({ tone, label }) => {
  const color =
    tone === 'positive'
      ? 'text-emerald-800'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-stone-700';

  return <span className={`text-xs font-semibold ${color}`}>{label}</span>;
};
