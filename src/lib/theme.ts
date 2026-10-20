import { StyleSheet, useColorScheme } from 'react-native';

/**
 * Строгий минимализм: чистые белый/чёрный, один акцент — ультрамарин.
 * Акцент только для состояния и действия (активная вкладка, кнопка, отметка), не для декора.
 */
const light = {
  bg: '#FFFFFF',
  surface: '#F3F3F3', // блоки, превью картинок
  surfaceRaised: '#EAEAEA',
  surfaceSoft: '#F7F7F7', // нажатие строки
  border: '#E5E5E5', // разделители
  borderStrong: '#CFCFCF', // рамки полей и чипов

  text: '#000000',
  textMuted: '#6E6E6E',
  textFaint: '#A6A6A6',
  inverse: '#FFFFFF', // текст на заливке цветом text

  accent: '#2433FF',
  accentLight: '#2433FF', // акцентный текст на фоне
  accentSoft: 'rgba(36, 51, 255, 0.08)',
  accentBorder: 'rgba(36, 51, 255, 0.4)',
  onAccent: '#FFFFFF',

  danger: '#E0301E',
  success: '#1F9D55',
  star: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#000000',
  surface: '#141414',
  surfaceRaised: '#1E1E1E',
  surfaceSoft: '#0E0E0E',
  border: '#232323',
  borderStrong: '#3A3A3A',

  text: '#FFFFFF',
  textMuted: '#9C9C9C',
  textFaint: '#5E5E5E',
  inverse: '#000000',

  accent: '#5B67FF', // на чёрном чистый ультрамарин слишком тёмный
  accentLight: '#8D96FF',
  accentSoft: 'rgba(91, 103, 255, 0.16)',
  accentBorder: 'rgba(141, 150, 255, 0.5)',
  onAccent: '#FFFFFF',

  danger: '#FF5A47',
  success: '#3DD68C',
  star: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
};

export const palettes = { light, dark };

/** Цвета текущей системной темы; компонент перерисуется при её смене */
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** StyleSheet, зависящий от темы: `const useStyles = makeStyles((c) => ({...}))`, в компоненте `const s = useStyles()` */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Palette) => T) {
  const cache = new Map<Palette, T>();
  return function useStyles(): T {
    const c = useColors();
    let s = cache.get(c);
    if (!s) cache.set(c, (s = StyleSheet.create(factory(c))));
    return s;
  };
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const space = (n: number) => n * 4;

export const fonts = {
  light: 'Geologica_300Light',
  regular: 'Geologica_400Regular',
  medium: 'Geologica_500Medium',
  semibold: 'Geologica_600SemiBold',
};
