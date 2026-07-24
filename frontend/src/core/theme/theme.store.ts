export type ThemePreset = 'amber' | 'high-contrast' | 'emerald' | 'sapphire' | 'crimson';

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  description: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  bgBase: string;
  bgSurface: string;
  bgSunken: string;
  border: string;
  isHighContrast?: boolean;
}

export const THEME_PRESETS: Record<ThemePreset, ThemeConfig> = {
  amber: {
    id: 'amber',
    name: 'Default Warm Amber',
    description: 'Classic balanced warm tones',
    accent: '#D97706',
    accentHover: '#B45309',
    accentSubtle: '#FEF3C7',
    bgBase: '#F7F6F4',
    bgSurface: '#FFFFFF',
    bgSunken: '#EEECE8',
    border: '#E5E1DA',
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High-Contrast Solid (Windows 7/8)',
    description: '100% opaque solid high-visibility colors for legacy browsers & old screens',
    accent: '#D97706',
    accentHover: '#B45309',
    accentSubtle: '#FDE68A',
    bgBase: '#F3F4F6',
    bgSurface: '#FFFFFF',
    bgSunken: '#E5E7EB',
    border: '#9CA3AF',
    isHighContrast: true,
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    description: 'Deep crisp green theme',
    accent: '#059669',
    accentHover: '#047857',
    accentSubtle: '#D1FAE5',
    bgBase: '#F4F7F5',
    bgSurface: '#FFFFFF',
    bgSunken: '#E2EBE5',
    border: '#D1DCD5',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Royal Sapphire',
    description: 'Professional high-contrast blue theme',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentSubtle: '#DBEAFE',
    bgBase: '#F5F7FA',
    bgSurface: '#FFFFFF',
    bgSunken: '#E2E8F0',
    border: '#CBD5E1',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Ruby',
    description: 'Vibrant high-contrast red theme',
    accent: '#DC2626',
    accentHover: '#B91C1C',
    accentSubtle: '#FEE2E2',
    bgBase: '#FAF5F5',
    bgSurface: '#FFFFFF',
    bgSunken: '#F3E8E8',
    border: '#E5D5D5',
  },
};

const STORAGE_KEY_THEME = 'smartpos_theme_preset';
const STORAGE_KEY_HIGH_CONTRAST = 'smartpos_high_contrast';

export const applyTheme = (presetId: ThemePreset, forceHighContrast?: boolean) => {
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS.amber;
  const isHighContrast = forceHighContrast ?? (preset.isHighContrast || false);

  const root = document.documentElement;
  root.style.setProperty('--color-accent', preset.accent);
  root.style.setProperty('--color-accent-hover', preset.accentHover);
  root.style.setProperty('--color-accent-subtle', preset.accentSubtle);
  root.style.setProperty('--color-primary', preset.accent);
  root.style.setProperty('--color-primary-hover', preset.accentHover);
  root.style.setProperty('--color-bg-base', preset.bgBase);
  root.style.setProperty('--color-bg-surface', preset.bgSurface);
  root.style.setProperty('--color-bg-sunken', preset.bgSunken);
  root.style.setProperty('--color-border', isHighContrast ? '#9CA3AF' : preset.border);

  if (isHighContrast) {
    root.classList.add('theme-high-contrast');
  } else {
    root.classList.remove('theme-high-contrast');
  }

  localStorage.setItem(STORAGE_KEY_THEME, presetId);
  localStorage.setItem(STORAGE_KEY_HIGH_CONTRAST, isHighContrast ? 'true' : 'false');
};

export const initTheme = () => {
  const savedPreset = (localStorage.getItem(STORAGE_KEY_THEME) as ThemePreset) || 'amber';
  const savedHighContrast = localStorage.getItem(STORAGE_KEY_HIGH_CONTRAST) === 'true';
  applyTheme(savedPreset, savedHighContrast);
};

export const getSavedTheme = (): { preset: ThemePreset; isHighContrast: boolean } => {
  const preset = (localStorage.getItem(STORAGE_KEY_THEME) as ThemePreset) || 'amber';
  const isHighContrast = localStorage.getItem(STORAGE_KEY_HIGH_CONTRAST) === 'true' || preset === 'high-contrast';
  return { preset, isHighContrast };
};
