/**
 * BLOCK 50 — InfoTooltip Component
 * 
 * Provides contextual help for moderators.
 * Titles in English, descriptions in Russian.
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export function InfoTooltip({ 
  title, 
  description, 
  action,
  severity,
  placement = 'top',
  children 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const severityColors = {
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
  };

  const bgColor = severityColors[severity] || severityColors.info;

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="More info"
      >
        {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
      </button>

      {isOpen && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 w-72 p-4 rounded-xl border shadow-xl ${bgColor} ${
            placement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
            placement === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
            placement === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
            'left-full ml-2 top-1/2 -translate-y-1/2'
          }`}
        >
          {title && (
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
              {description}
            </p>
          )}
          {action && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Действия:</p>
              <p className="text-sm text-gray-700">{action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tooltips: English titles, Russian descriptions
export const FRACTAL_TOOLTIPS = {
  governance: {
    title: 'Governance Mode',
    description: 'Режим управления системой. NORMAL — штатная работа. PROTECTION — ограниченный режим. FROZEN — торговля приостановлена.',
    action: 'При статусе отличном от NORMAL — проверьте Playbook.',
  },
  freeze: {
    title: 'Contract Status',
    description: 'Статус контракта модели. FROZEN — параметры заблокированы от изменений.',
    action: 'FROZEN — нормальное состояние для production.',
  },
  guardrails: {
    title: 'Guardrails',
    description: 'Защитные ограничения параметров. VALID — все в норме.',
    action: 'При VIOLATIONS — требуется корректировка.',
  },
  health: {
    title: 'System Health',
    description: 'Общий показатель здоровья системы (0-100%). Учитывает надёжность, качество данных, стабильность.',
    action: 'HEALTHY (>80%) — норма. WATCH (60-80%) — наблюдение. ALERT (<60%) — внимание. CRITICAL (<40%) — срочно.',
    severity: 'info',
  },
  topRisks: {
    title: 'Top Risks',
    description: 'Ключевые факторы риска системы.',
    action: 'Фокус на ALERT и CRITICAL. OK и WARN — мониторинг.',
  },
  guard: {
    title: 'Catastrophic Guard',
    description: 'Защита от катастрофических потерь. Degeneration Score показывает приближение к опасным порогам.',
    action: 'OK (<55%) — безопасно. WARN (55-75%) — внимание. CRITICAL (>75%) — автоснижение риска.',
    severity: 'warning',
  },
  reliability: {
    title: 'Reliability',
    description: 'Надёжность текущих сигналов. Влияет на размер позиций.',
    action: 'При низкой надёжности (<50%) система автоматически уменьшает позиции.',
    severity: 'info',
  },
  tailRisk: {
    title: 'Tail Risk (MC)',
    description: 'Monte Carlo оценка максимальных потерь. P95 Max Drawdown — просадка в 95% сценариев.',
    action: 'До 35% — норма. 35-45% — повышенный риск. >45% — критично.',
    severity: 'warning',
  },
  performance: {
    title: 'Performance Windows',
    description: 'Историческая эффективность за 30/60/90 дней. Sharpe — доходность/риск. MaxDD — макс. просадка. Hit Rate — % прибыльных.',
    action: 'Sharpe >1.0 — отлично. 0.5-1.0 — хорошо. <0.5 — анализ.',
    severity: 'info',
  },
  playbook: {
    title: 'Playbook',
    description: 'Автоматическая рекомендация действий. Priority P1 — критично, P6 — информационно.',
    action: 'При P1-P2 — действуйте немедленно.',
    severity: 'warning',
  },
  recentActivity: {
    title: 'Recent Activity',
    description: 'График надёжности за 7 дней и журнал действий.',
    action: 'Следите за трендом. Падение может указывать на проблемы.',
  },
};

export default InfoTooltip;
