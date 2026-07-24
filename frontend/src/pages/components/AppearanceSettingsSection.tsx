import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Check, ShieldAlert } from 'lucide-react';
import { THEME_PRESETS, applyTheme, getSavedTheme, type ThemePreset } from '../../core/theme/theme.store';
import { toast } from 'react-hot-toast';

export const AppearanceSettingsSection: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<ThemePreset>('amber');
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const saved = getSavedTheme();
    setSelectedPreset(saved.preset);
    setIsHighContrast(saved.isHighContrast);
  }, []);

  const handleSelectPreset = (presetId: ThemePreset) => {
    setSelectedPreset(presetId);
    const preset = THEME_PRESETS[presetId];
    const newHighContrast = presetId === 'high-contrast' ? true : isHighContrast;
    setIsHighContrast(newHighContrast);
    applyTheme(presetId, newHighContrast);
    toast.success(`Applied ${preset.name} theme`);
  };

  const handleToggleHighContrast = (enabled: boolean) => {
    setIsHighContrast(enabled);
    applyTheme(selectedPreset, enabled);
    toast.success(enabled ? 'Enabled High-Contrast Legacy Mode' : 'Disabled High-Contrast Mode');
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">
            Appearance & System Colors
          </h2>
        </div>
        <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-sunken)] px-2.5 py-1 rounded-full font-medium">
          Legacy Browser Support
        </span>
      </div>

      {/* Legacy Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-amber-900">
        <Monitor className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold mb-0.5">Optimized for Windows 7, Windows 8 & Older Monitors</p>
          <p className="text-amber-800">
            If buttons look faint, text is blurry, or colors appear translucent on your shop computer, select the <strong>High-Contrast Solid</strong> preset below to enforce 100% opaque, high-visibility colors.
          </p>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
          Select Color Theme
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
            const preset = THEME_PRESETS[key];
            const isSelected = selectedPreset === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`relative flex flex-col p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-amber-50/40 shadow-sm'
                    : 'border-[var(--color-border)] hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0" 
                      style={{ backgroundColor: preset.accent }} 
                    />
                    <span className="text-xs font-bold text-gray-900 line-clamp-1">{preset.name}</span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legacy High Contrast Switch */}
      <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Force Solid Colors & High Contrast Mode</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Removes translucent background blurs, deepens element borders, and sharpens text for maximum readability on legacy browsers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleToggleHighContrast(!isHighContrast)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isHighContrast ? 'bg-[var(--color-accent)]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isHighContrast ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
