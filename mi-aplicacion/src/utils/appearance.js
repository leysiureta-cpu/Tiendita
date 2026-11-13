export const PALETTES = [
  { id: 'red', name: 'Rojo original', primary: '#751f32', dark: '#5e1727', darkAccent: '#f08a9f', soft: '#f8dfe6', swatches: ['#751f32', '#b94f68', '#f8dfe6'] },
  { id: 'blue', name: 'Azul', primary: '#1d4ed8', dark: '#1e40af', darkAccent: '#82aaff', soft: '#dbeafe', swatches: ['#1d4ed8', '#60a5fa', '#dbeafe'] },
  { id: 'purple', name: 'Morado', primary: '#6d28d9', dark: '#5b21b6', darkAccent: '#b69cff', soft: '#ede9fe', swatches: ['#6d28d9', '#a78bfa', '#ede9fe'] },
  { id: 'green', name: 'Verde', primary: '#166534', dark: '#14532d', darkAccent: '#76d39a', soft: '#dcfce7', swatches: ['#166534', '#4ade80', '#dcfce7'] },
  { id: 'pink', name: 'Rosa', primary: '#be185d', dark: '#9d174d', darkAccent: '#ff8bc1', soft: '#fce7f3', swatches: ['#be185d', '#f472b6', '#fce7f3'] },
  { id: 'orange', name: 'Naranja', primary: '#c2410c', dark: '#9a3412', darkAccent: '#ffae75', soft: '#ffedd5', swatches: ['#c2410c', '#fb923c', '#ffedd5'] },
  { id: 'gray', name: 'Gris', primary: '#475569', dark: '#334155', darkAccent: '#c0cad8', soft: '#e2e8f0', swatches: ['#475569', '#94a3b8', '#e2e8f0'] },
  { id: 'turquoise', name: 'Turquesa', primary: '#0f766e', dark: '#115e59', darkAccent: '#5de0d1', soft: '#ccfbf1', swatches: ['#0f766e', '#2dd4bf', '#ccfbf1'] },
  { id: 'yellow', name: 'Amarillo', primary: '#854d0e', dark: '#713f12', darkAccent: '#f4cd5c', soft: '#fef3c7', swatches: ['#854d0e', '#facc15', '#fef3c7'] },
]

export function applyAppearance(preferences) {
  const root = document.documentElement
  const palette = PALETTES.find((item) => item.id === preferences?.palette) ?? PALETTES[0]
  const themeChoice = ['light', 'dark', 'system'].includes(preferences?.theme)
    ? preferences.theme
    : 'light'
  const isDark = themeChoice === 'dark' || (
    themeChoice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  root.dataset.theme = isDark ? 'dark' : 'light'
  root.dataset.themeChoice = themeChoice
  root.dataset.palette = palette.id
  root.style.setProperty('--color-primary', isDark ? palette.darkAccent : palette.primary)
  root.style.setProperty('--color-primary-dark', palette.dark)
  const softColor = isDark
    ? `color-mix(in srgb, ${palette.primary} 24%, #1b2028)`
    : palette.soft
  root.style.setProperty('--color-secondary', softColor)
  root.style.setProperty('--color-accent-soft', softColor)
}
