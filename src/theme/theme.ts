import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#D32F2F', // Festive Crimson Red
      light: '#FFEBEE',
      dark: '#B71C1C',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D97706', // Royal Golden Amber
      light: '#FEF3C7',
      dark: '#B45309',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#1E40AF', // Royal Cobalt Blue
      light: '#EFF6FF',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669', // Garland Green
      light: '#ECFDF5',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#1F1714',
      secondary: '#6B5E50',
    },
    background: {
      default: '#FEFDF9',
      paper: '#FFFFFF',
    },
    divider: '#F2E5C9',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '28px',
      fontWeight: 800,
      color: '#B71C1C',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '22px',
      fontWeight: 700,
      color: '#B71C1C',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#1F1714',
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontSize: '14.5px',
      fontWeight: 600,
      color: '#1F1714',
    },
    body1: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#1F1714',
    },
    body2: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#786C58',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: '8px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#7C2D12',
          backgroundColor: '#FFFBEB',
          borderBottom: '2px solid #FDE68A',
        },
        body: {
          fontSize: '13.5px',
          fontWeight: 500,
          color: '#29221D',
          borderBottom: '1px solid #F7EEDB',
        },
      },
    },
  },
});
