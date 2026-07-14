export const Theme = {
  colors: {
    background: '#000000',               // Pure AMOLED Black
    cardBackground: 'rgba(18, 18, 18, 0.65)', // Glassy Dark Charcoal
    cardHighlight: 'rgba(255, 255, 255, 0.08)', // Transparent Highlight
    primary: '#FFFFFF',                 // Pure White
    secondary: '#A3A3A3',               // Sleek Light Gray
    accent: '#FFFFFF',                  // High-contrast white accents
    success: '#FFFFFF',
    danger: '#FFFFFF',
    warning: '#A3A3A3',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#666666',
    border: 'rgba(255, 255, 255, 0.12)',  // Glass border reflection
    borderActive: 'rgba(255, 255, 255, 0.45)', // Focused Active Border
    overlay: 'rgba(0, 0, 0, 0.85)',
    
    roles: {
      Casual: '#FFFFFF',
      Delivery: '#FFFFFF',
      Trucker: '#FFFFFF',
      Racer: '#FFFFFF',
    }
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,                      // Curvier small elements
    md: 16,                     // Smooth curves for buttons/fields
    lg: 24,                     // Curvy card panels
    xl: 32,                     // Very curvy container edges
    round: 9999,
  },
  shadows: {
    cyan: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    pink: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    dark: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }
  }
};
