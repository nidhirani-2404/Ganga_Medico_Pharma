import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'emerald', subtitle, onClick }) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      border: 'border-emerald-100 hover:border-emerald-300'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-blue-100 hover:border-blue-300'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
      border: 'border-purple-100 hover:border-purple-300'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      iconBg: 'bg-amber-100',
      border: 'border-amber-100 hover:border-amber-300'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      iconBg: 'bg-red-100',
      border: 'border-red-100 hover:border-red-300'
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      iconBg: 'bg-slate-200',
      border: 'border-slate-200 hover:border-slate-300'
    }
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white rounded-2xl border transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${scheme.border}`}
    >
      <div className="flex items-center justify-between">
        {/* Metric Value & Label */}
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
          <h3 className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{value}</h3>
        </div>

        {/* Icon container */}
        <div className={`p-3 rounded-xl ${scheme.iconBg} ${scheme.text}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Subtitle description */}
      {subtitle && (
        <div className="mt-4 flex items-center">
          <span className="text-xs text-slate-500">{subtitle}</span>
        </div>
      )}
    </div>
  );
}
