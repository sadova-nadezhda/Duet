// Тёмная тема с фиолетовым акцентом (вместо оранжевого в референсе)
export const colors = {
  bg: '#110C18',
  bgGlow1: 'rgba(124, 58, 237, 0.28)',
  bgGlow2: 'rgba(192, 38, 211, 0.16)',
  surface: '#1C1524',
  surfaceRaised: '#251C30',
  surfaceSoft: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#F5F1FA',
  textMuted: '#A79DB5',
  textFaint: '#6F6580',

  accent: '#8B5CF6', // основной фиолетовый
  accentDeep: '#6D28D9',
  accentLight: '#C4B5FD', // текст на тёмном фоне
  accentSoft: 'rgba(139, 92, 246, 0.18)',
  accentBorder: 'rgba(167, 139, 250, 0.55)',

  danger: '#F87171',
  success: '#34D399',
  star: '#FBBF24',
};

export const gradients = {
  accent: ['#A78BFA', '#7C3AED'] as const,
  fab: ['#9F67FF', '#6D28D9'] as const,
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = (n: number) => n * 4;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};
