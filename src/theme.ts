export type Colors = {
  bg: string; paper: string; ink: string; mute: string;
  ruleFaint: string; red: string; redDim: string; amber: string; green: string;
  serif: string; sans: string; mono: string;
};

export const HC: Colors = {
  bg: '#f4f0e8',
  paper: '#faf7f0',
  ink: '#1a1510',
  mute: '#6b6458',
  ruleFaint: 'rgba(26,21,16,0.12)',
  red: '#c4221b',
  redDim: '#a81a14',
  amber: '#d89430',
  green: '#2d6a3f',
  serif: '"Instrument Serif", "EB Garamond", Georgia, serif',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

export const HCDark: Colors = {
  bg: '#141210',
  paper: '#1c1a16',
  ink: '#f1ecdf',
  mute: '#8a8373',
  ruleFaint: 'rgba(241,236,223,0.12)',
  red: '#e8514a',
  redDim: '#c43d36',
  amber: '#e3a447',
  green: '#6aae7f',
  serif: '"Instrument Serif", "EB Garamond", Georgia, serif',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

export const btn = {
  primary: {
    background: '#1a1510',
    color: '#faf7f0',
    border: 'none',
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '12px 22px',
  },
  outline: {
    background: 'transparent',
    color: '#1a1510',
    border: '1px solid #1a1510',
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '12px 22px',
  },
  danger: {
    background: '#c4221b',
    color: '#faf7f0',
    border: 'none',
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '12px 22px',
  },
  amber: {
    background: '#d89430',
    color: '#1a1510',
    border: 'none',
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '12px 22px',
  },
  ghost: {
    background: 'transparent',
    color: '#6b6458',
    border: 'none',
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '12px 22px',
  },
} as const;
