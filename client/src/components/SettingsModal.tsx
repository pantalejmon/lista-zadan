import type { Settings } from '../lib/settings';
import {
  THEME_OPTIONS,
  ACCENT_OPTIONS,
  FONT_SIZE_OPTIONS,
  FONT_SIZE_PX,
  HIDEABLE_MODULES,
} from '../lib/settings';

interface SettingsModalProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  // Moduły to sekcje wymagające konta — bez niego nie ma czego ukrywać.
  isCloud: boolean;
}

export function SettingsModal({ settings, onChange, onClose, isCloud }: SettingsModalProps) {
  const toggleModule = (id: (typeof HIDEABLE_MODULES)[number]['id']) => {
    const hidden = settings.hiddenModules.includes(id)
      ? settings.hiddenModules.filter((m) => m !== id)
      : [...settings.hiddenModules, id];
    onChange({ hiddenModules: hidden });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md sm:mx-4 p-5 space-y-6 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Ustawienia</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Zamknij"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme */}
        <section>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Motyw</p>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((option) => {
              const active = settings.theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onChange({ theme: option.id })}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all text-left ${
                    active
                      ? 'border-primary-500 ring-2 ring-primary-500/40'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Miniatura: karta na tle strony — dokładnie to, co zobaczy user */}
                  <span
                    className="w-9 h-9 rounded-xl border border-black/10 shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: option.bg }}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/10"
                      style={{ backgroundColor: option.card }}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{option.label}</span>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500">{option.mode}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Accent colour */}
        <section>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Kolor akcentu</p>
          {/* Siatka, nie zawijany rząd — dziewięć próbek w układzie 5+4 czyta
              się jak paleta, a przy zawijaniu wychodziło przypadkowe 7+2. */}
          <div className="grid grid-cols-5 gap-3 justify-items-center">
            {ACCENT_OPTIONS.map((option) => {
              const active = settings.accent === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onChange({ accent: option.id })}
                  title={option.label}
                  aria-label={option.label}
                  className={`w-9 h-9 rounded-full transition-transform active:scale-95 flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${
                    active ? 'ring-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: option.color, ...(active ? { boxShadow: `0 0 0 2px ${option.color}` } : {}) }}
                >
                  {active && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Visible modules */}
        {isCloud && (
          <section>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Widoczne moduły</p>
            <div className="space-y-1.5">
              {HIDEABLE_MODULES.map((module) => {
                const visible = !settings.hiddenModules.includes(module.id);
                return (
                  <label
                    key={module.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleModule(module.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{module.label}</span>
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{module.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              Zadania są zawsze widoczne. Ukryty moduł znika z menu — dane zostają nietknięte.
            </p>
          </section>
        )}

        {/* Font size */}
        <section>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Rozmiar tekstu</p>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZE_OPTIONS.map((option) => {
              const active = settings.fontSize === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onChange({ fontSize: option.id })}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border transition-all ${
                    active
                      ? 'border-primary-500 ring-2 ring-primary-500/40 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="font-semibold leading-none" style={{ fontSize: FONT_SIZE_PX[option.id] }}>A</span>
                  <span className="text-[10px] leading-tight text-gray-400 dark:text-gray-500">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
