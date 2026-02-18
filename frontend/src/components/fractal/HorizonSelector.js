/**
 * BLOCK 70.2 STEP 2 — HorizonSelector 2.0
 * 
 * Real horizon control with:
 * - Tier color coding (TIMING/TACTICAL/STRUCTURE)
 * - Match count preview
 * - Active state indication
 */

import React from 'react';
import { HORIZONS, getTierColor, getTierLabel } from '../../hooks/useFocusPack';

export const HorizonSelector = ({ 
  focus, 
  onFocusChange, 
  matchesCounts = {},
  loading = false,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="horizon-selector">
      {/* Pills row */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        {HORIZONS.map(h => {
          const isActive = focus === h.key;
          const count = matchesCounts[h.key];
          const tierColor = getTierColor(h.tier);
          
          return (
            <button
              key={h.key}
              onClick={() => onFocusChange(h.key)}
              disabled={loading}
              className={`
                relative px-3 py-2 rounded-md text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}
                ${loading ? 'opacity-50 cursor-wait' : ''}
              `}
              data-testid={`horizon-${h.key}`}
            >
              {/* Tier indicator bar */}
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full transition-opacity"
                style={{ 
                  backgroundColor: tierColor,
                  opacity: isActive ? 1 : 0.3
                }}
              />
              
              {/* Label */}
              <span className="block">{h.label}</span>
              
              {/* Match count (if available) */}
              {count !== undefined && (
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  {count} matches
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Tier label */}
      <div className="flex items-center justify-between px-2 text-xs">
        <span className="text-slate-400">
          {getTierLabel(HORIZONS.find(h => h.key === focus)?.tier)}
        </span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTierColor('TIMING') }}/>
            <span className="text-slate-400">Timing</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTierColor('TACTICAL') }}/>
            <span className="text-slate-400">Tactical</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTierColor('STRUCTURE') }}/>
            <span className="text-slate-400">Structure</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version for inline use
 */
export const HorizonPills = ({ focus, onFocusChange, loading = false }) => {
  return (
    <div className="flex gap-1" data-testid="horizon-pills">
      {HORIZONS.map(h => {
        const isActive = focus === h.key;
        return (
          <button
            key={h.key}
            onClick={() => onFocusChange(h.key)}
            disabled={loading}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${isActive 
                ? 'bg-slate-800 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
              ${loading ? 'opacity-50' : ''}
            `}
            data-testid={`pill-${h.key}`}
          >
            {h.label}
          </button>
        );
      })}
    </div>
  );
};

export default HorizonSelector;
