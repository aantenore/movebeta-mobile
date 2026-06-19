export const theme = {
  colors: {
    canvas: '#F7F5EF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF3F6',
    ink: '#161A1D',
    text: '#293238',
    muted: '#68747C',
    line: '#D9E0E3',
    brand: '#1D5F8A',
    brandDark: '#123D57',
    brandSoft: '#DCECF3',
    moss: '#547461',
    amber: '#C7812B',
    coral: '#C95C43',
    success: '#377C5B',
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 8,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type AppTheme = typeof theme;
