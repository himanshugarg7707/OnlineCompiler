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
  root.setAttribute('data-theme', 'custom');
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.backgroundColor = palette.bg;
  }

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

  root.style.setProperty(
    '--btn-run-bg',
    `linear-gradient(135deg, #10b981 0%, ${primary} 100%)`
  );
  root.style.setProperty('--btn-run-color', '#ffffff');
  root.style.setProperty('--btn-run-glow', `0 0 20px ${primary}50`);
  root.style.setProperty('--btn-run-hover-shadow', `0 0 28px ${primary}80, 0 0 12px ${secondary}60`);
  root.style.setProperty('--btn-run-border', `1px solid ${primary}80`);

  if (typeof window !== 'undefined' && window.monaco) {
    try {
      const cleanHex = (h) => (h ? String(h).replace('#', '') : '');
      window.monaco.editor.defineTheme('fullcode-custom', {
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: isDark ? '64748b' : '94a3b8', fontStyle: 'italic' },
          { token: 'keyword', foreground: cleanHex(primary) || '00d4ff', fontStyle: 'bold' },
          { token: 'string', foreground: isDark ? '34d399' : '16a34a' },
          { token: 'number', foreground: isDark ? 'fb923c' : 'ea580c' },
          { token: 'type', foreground: cleanHex(secondary) || '8b5cf6' },
          { token: 'function', foreground: cleanHex(primary) || '00d4ff' },
          { token: 'variable', foreground: isDark ? 'f8fafc' : '0f172a' },
          { token: 'operator', foreground: cleanHex(primary) || '00d4ff' },
        ],
        colors: {
          'editor.background': bg,
          'editor.foreground': isDark ? '#f8fafc' : '#0f172a',
          'editor.lineHighlightBackground': isDark ? '#ffffff0f' : '#00000008',
          'editor.selectionBackground': `${primary}35`,
          'editorCursor.foreground': primary || '#00d4ff',
          'editorLineNumber.foreground': isDark ? '#64748b' : '#94a3b8',
          'editorLineNumber.activeForeground': isDark ? '#f8fafc' : '#0f172a',
          'minimap.background': bg,
          'editorGutter.background': bg,
        },
      });
      window.monaco.editor.setTheme('fullcode-custom');
    } catch {
      // Ignore if monaco not initialized yet
    }
  }
}

/**
 * Clear custom CSS overrides when switching back to a preset theme
 */
export function clearCustomPaletteOverrides() {
  const root = document.documentElement;
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.removeProperty('background-color');
  }
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
    '--btn-run-bg',
    '--btn-run-color',
    '--btn-run-glow',
    '--btn-run-hover-shadow',
    '--btn-run-border',
  ];
  props.forEach((prop) => root.style.removeProperty(prop));
}
