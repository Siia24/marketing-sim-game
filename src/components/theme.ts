import { Platform } from 'react-native';

/**
 * Сумерки: фиолетовый, глубокий синий, золото.
 * Все экраны берут цвета отсюда, чтобы луг и карточки не разъезжались.
 */
export const theme = {
  bg: '#100c22',
  card: '#1b1533',
  ink: '#f6f1e6',
  muted: '#cbbfe0',
  line: '#3c315c',
  gold: '#e4c36a',
  accent: '#e4c36a',
  onAccent: '#1c1406',
  accentSoft: '#2a2346',
  violet: '#7b5ea7',
  blue: '#1a2748',
  glow: 'rgba(228, 195, 106, 0.7)',
  scrim: 'rgba(16, 12, 34, 0.82)',
  warnBg: '#3a2a16',
  warnInk: '#f6d7ae',
  warnLine: '#8a6230',
  badBg: '#3a1828',
  badInk: '#f4c0d0',
  okBg: '#143026',
  okInk: '#c6efd4',
  okLine: '#2f6b4f',
  emptyStar: '#8d82ad',
  maxWidth: 720,
  radius: 18,
  fontTitle: Platform.OS === 'web' ? 'Georgia, "Iowan Old Style", Palatino, serif' : 'serif',
};
