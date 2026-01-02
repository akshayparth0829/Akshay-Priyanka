
import React, { useState, useMemo } from 'react';
import { MarketStat } from '../types';

interface MarketDashboardProps {
  stats: MarketStat[];
}

type SortKey = 'avgPrice' | 'growth' | 'inventory' | 'area';

const MarketDashboard: React.FC<MarketDashboardProps> = ({ stats }) => {
  const [sortBy, setSortBy] = useState<SortKey>('area');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc'); // Default to desc for metrics as usually higher is more interesting
    }
  };

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = (aVal as number) - (bVal as number);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [stats, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Filter/Sort Controls */}
      <div className="flex flex-col space-y-3 pb-4 border-b border-slate-50">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Sort Market By</span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Area', key: 'area' as SortKey, icon: 'fa-map-marker-alt' },
            { label: 'Price', key: 'avgPrice' as SortKey, icon: 'fa-tag' },
            { label: 'Growth', key: 'growth' as SortKey, icon: 'fa-chart-line' },
            { label: 'Inventory', key: 'inventory' as SortKey, icon: 'fa-boxes-stacked' },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleSort(btn.key)}
              className={`flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                sortBy === btn.key
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-600'
              }`}
            >
              <i className={`fas ${btn.icon} mr-1.5 opacity-70`}></i>
              {btn.label}
              {sortBy === btn.key && (
                <i className={`fas fa-chevron-${sortOrder === 'asc' ? 'up' : 'down'} ml-1.5 text-[8px]`}></i>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Neighborhood List */}
      <div className="space-y-5">
        {sortedStats.map((stat) => (
          <div key={stat.area} className="group cursor-default animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                {stat.area}
              </span>
              <div className="flex items-center bg-green-50 px-2 py-0.5 rounded-full border border-green-100/50">
                 <i className="fas fa-caret-up text-[8px] text-green-600 mr-1"></i>
                 <span className="text-[10px] font-black text-green-600">
                  {stat.growth}%
                </span>
              </div>
            </div>
            
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-black text-slate-900 tracking-tight">
                <span className="text-slate-300 text-sm font-bold mr-0.5">$</span>
                {(stat.avgPrice / 1000).toFixed(0)}
                <span className="text-slate-300 text-sm font-bold">k</span>
              </p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                {stat.inventory} Active Listings
              </p>
            </div>
            
            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out group-hover:bg-blue-400"
                style={{ width: `${Math.min(100, (stat.avgPrice / 1000000) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-50">
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
           <div className="flex items-center mb-2">
             <i className="fas fa-shield-halved text-blue-500 text-[10px] mr-2"></i>
             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Pricing Security</span>
           </div>
           <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
             Our data updates every 15 minutes. Taylor cross-references these trends with closed sales to generate your maximum offer ceiling.
           </p>
        </div>
      </div>
    </div>
  );
};

export default MarketDashboard;
