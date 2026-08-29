// Dynamic 3-Color Palette Theme Engine & Theme Manager

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function adjustBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Apply custom 3-color palette live onto document.documentElement CSS variables
 */
export function applyCustomPalette(palette) {
  if (!palette || !palette.bg || !palette.primary || !palette.secondary) return;

  const root = document.documentElement;
  const { bg, primary, secondary } = palette;
  const isDark = getLuminance(bg) < 140;

  const bgSecondary = adjustBrightness(bg, isDark ? 16 : -7);
  const bgTertiary = adjustBrightness(bg, isDark ? 28 : -14);
  const bgElevated = adjustBrightness(bg, isDark ? 42 : -20);
  const bgGlass = isDark ? `${bgSecondary}d9` : `${bgSecondary}f2`;

  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#cbd5e1' : '#334155';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const textAccent = primary;

  root.style.setProperty('--bg-primary', bg);
  root.style.setProperty('--bg-secondary', bgSecondary);
  root.style.setProperty('--bg-tertiary', bgTertiary);
  root.style.setProperty('--bg-elevated', bgElevated);
  root.style.setProperty('--bg-glass', bgGlass);

  root.style.setProperty('--border-primary', `${primary}35`);
  root.style.setProperty('--border-secondary', `${primary}20`);
  root.style.setProperty('--border-accent', primary);
  root.style.setProperty('--border-glow', `${primary}60`);

  root.style.setProperty('--text-primary', textPrimary);
  root.style.setProperty('--text-secondary', textSecondary);
  root.style.setProperty('--text-muted', textMuted);
  root.style.setProperty('--text-accent', textAccent);

  root.style.setProperty('--accent-cyan', primary);
  root.style.setProperty('--accent-purple', secondary);
  root.style.setProperty('--accent-green', '#10b981');
  root.style.setProperty('--accent-orange', '#f59e0b');
  root.style.setProperty('--accent-red', '#ef4444');
  root.style.setProperty('--accent-pink', '#ec4899');
  root.style.setProperty('--accent-yellow', '#eab308');

  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
  );
  root.style.setProperty(
    '--gradient-secondary',
    `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`
  );
  root.style.setProperty(
    '--gradient-success',
    `linear-gradient(135deg, #10b981 0%, ${primary} 100%)`
  );
  root.style.setProperty(
    '--gradient-error',
    `linear-gradient(135deg, #ef4444 0%, ${secondary} 100%)`
  );
  root.style.setProperty(
    '--gradient-bg',
    `linear-gradient(180deg, ${bg} 0%, ${bgSecondary} 100%)`
  );

  root.style.setProperty(
    '--shadow-glow-cyan',
    `0 0 24px ${primary}40, 0 0 48px ${secondary}20`
  );
  root.style.setProperty(
    '--shadow-glow-purple',
    `0 0 24px ${secondary}40`
  );
}

/**
 * Clear custom CSS overrides when switching back to a preset theme
 */
export function clearCustomPaletteOverrides() {
  const root = document.documentElement;
  const props = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--bg-elevated',
    '--bg-glass',
    '--border-primary',
    '--border-secondary',
    '--border-accent',
    '--border-glow',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--text-accent',
    '--accent-cyan',
    '--accent-purple',
    '--accent-green',
    '--accent-orange',
    '--accent-red',
    '--accent-pink',
    '--accent-yellow',
    '--gradient-primary',
    '--gradient-secondary',
    '--gradient-success',
    '--gradient-error',
    '--gradient-bg',
    '--shadow-glow-cyan',
    '--shadow-glow-purple',
  ];
  props.forEach((prop) => root.style.removeProperty(prop));
}
