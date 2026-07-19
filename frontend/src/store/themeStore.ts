import { create } from 'zustand';

export type ThemeId = 'aura_gold' | 'emerald' | 'cyber_cobalt' | 'amethyst' | 'crimson';
export type ThemeMode = 'dark' | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  accentColor: string;
  accentGlow: string;
  bgDark: string;
  bgLight: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'aura_gold',
    name: 'AURA Gold',
    description: 'Negro obsidian con destellos en oro real',
    accentColor: '#D4AF37',
    accentGlow: 'rgba(212, 175, 55, 0.4)',
    bgDark: '#0B0F19',
    bgLight: '#F8FAFC',
  },
  {
    id: 'emerald',
    name: 'Emerald Clinical',
    description: 'Verde clínica profundo y biodatos',
    accentColor: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    bgDark: '#061412',
    bgLight: '#F0FDF4',
  },
  {
    id: 'cyber_cobalt',
    name: 'Cyber Cobalt',
    description: 'Tecnología cian y cobalto de alto impacto',
    accentColor: '#00F0FF',
    accentGlow: 'rgba(0, 240, 255, 0.4)',
    bgDark: '#0B132B',
    bgLight: '#F0F9FF',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Dusk',
    description: 'Violeta oscuro y elegancia nocturna',
    accentColor: '#A855F7',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    bgDark: '#0F0A1C',
    bgLight: '#FAF5FF',
  },
  {
    id: 'crimson',
    name: 'Crimson Vital',
    description: 'Carbón con acentos rojo rubí de signos vitales',
    accentColor: '#F43F5E',
    accentGlow: 'rgba(244, 63, 94, 0.4)',
    bgDark: '#12080A',
    bgLight: '#FFF1F2',
  },
];

interface ThemeState {
  theme: ThemeId;
  mode: ThemeMode;
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const getInitialTheme = (): ThemeId => {
  const saved = localStorage.getItem('aura_theme_id');
  if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
    return saved as ThemeId;
  }
  // Migración automática de claves legacy a AURA Gold como predeterminado
  localStorage.setItem('aura_theme_id', 'aura_gold');
  return 'aura_gold';
};

const getInitialMode = (): ThemeMode => {
  const saved = localStorage.getItem('aura_theme_mode');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark';
};

const applyAttributes = (theme: ThemeId, mode: ThemeMode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }
};

const initialTheme = getInitialTheme();
const initialMode = getInitialMode();
applyAttributes(initialTheme, initialMode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  mode: initialMode,
  setTheme: (theme: ThemeId) => {
    localStorage.setItem('aura_theme_id', theme);
    const currentMode = get().mode;
    applyAttributes(theme, currentMode);
    set({ theme });
  },
  setMode: (mode: ThemeMode) => {
    localStorage.setItem('aura_theme_mode', mode);
    const currentTheme = get().theme;
    applyAttributes(currentTheme, mode);
    set({ mode });
  },
  toggleMode: () => {
    const newMode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    get().setMode(newMode);
  },
}));
