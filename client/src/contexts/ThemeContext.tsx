import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';

// CSF Function Colors - Security Operations palette
export const CSF_COLORS = {
  GV: '#a371f7', // Govern - Purple
  ID: '#58a6ff', // Identify - Blue
  PR: '#3fb950', // Protect - Green
  DE: '#d29922', // Detect - Gold
  RS: '#f85149', // Respond - Red
  RC: '#bc8cff', // Recover - Lavender
};

// Status colors for compliance states
export const STATUS_COLORS = {
  implemented: '#3fb950',
  partial: '#d29922',
  notImplemented: '#f85149',
  notAssessed: '#484f58',
  notApplicable: '#6e7681',
};

// Status gradients for enhanced visuals
export const STATUS_GRADIENTS = {
  implemented: 'linear-gradient(135deg, #3fb950 0%, #238636 100%)',
  partial: 'linear-gradient(135deg, #d29922 0%, #9e6a03 100%)',
  notImplemented: 'linear-gradient(135deg, #f85149 0%, #da3633 100%)',
  notAssessed: 'linear-gradient(135deg, #484f58 0%, #30363d 100%)',
};

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

const getStoredTheme = (): PaletteMode => {
  const stored = localStorage.getItem('themeMode');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  // Default to dark mode for security operations aesthetic
  return 'dark';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode - refined professional
                primary: {
                  main: '#0969da',
                  light: '#54aeff',
                  dark: '#0550ae',
                },
                secondary: {
                  main: '#8250df',
                  light: '#a475f9',
                  dark: '#6639ba',
                },
                success: {
                  main: '#1a7f37',
                  light: '#4ac26b',
                  dark: '#116329',
                },
                warning: {
                  main: '#9a6700',
                  light: '#d4a72c',
                  dark: '#7d4e00',
                },
                error: {
                  main: '#cf222e',
                  light: '#ff8182',
                  dark: '#a40e26',
                },
                info: {
                  main: '#0969da',
                  light: '#54aeff',
                  dark: '#0550ae',
                },
                background: {
                  default: '#f6f8fa',
                  paper: '#ffffff',
                },
                divider: 'rgba(31, 35, 40, 0.15)',
              }
            : {
                // Dark mode - Security Operations palette
                primary: {
                  main: '#58a6ff',
                  light: '#79c0ff',
                  dark: '#388bfd',
                },
                secondary: {
                  main: '#f0883e',
                  light: '#ffa657',
                  dark: '#d18616',
                },
                success: {
                  main: '#3fb950',
                  light: '#56d364',
                  dark: '#238636',
                },
                warning: {
                  main: '#d29922',
                  light: '#e3b341',
                  dark: '#9e6a03',
                },
                error: {
                  main: '#f85149',
                  light: '#ff7b72',
                  dark: '#da3633',
                },
                info: {
                  main: '#58a6ff',
                  light: '#79c0ff',
                  dark: '#388bfd',
                },
                background: {
                  default: '#0d1117',
                  paper: '#161b22',
                },
                text: {
                  primary: '#e6edf3',
                  secondary: '#8b949e',
                },
                divider: 'rgba(255, 255, 255, 0.08)',
              }),
        },
        typography: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          },
          h2: {
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          },
          h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '-0.005em',
            lineHeight: 1.4,
          },
          h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
          },
          h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.5,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
          },
          body1: {
            fontSize: '0.9375rem',
            lineHeight: 1.6,
          },
          body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
          },
          caption: {
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
            lineHeight: 1.4,
          },
          overline: {
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          },
          button: {
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
        },
        shape: {
          borderRadius: 8,
        },
        shadows: [
          'none',
          '0 1px 2px rgba(0, 0, 0, 0.12)',
          '0 2px 4px rgba(0, 0, 0, 0.12)',
          '0 4px 8px rgba(0, 0, 0, 0.12)',
          '0 6px 12px rgba(0, 0, 0, 0.12)',
          '0 8px 16px rgba(0, 0, 0, 0.12)',
          '0 12px 24px rgba(0, 0, 0, 0.12)',
          '0 16px 32px rgba(0, 0, 0, 0.12)',
          '0 20px 40px rgba(0, 0, 0, 0.12)',
          '0 24px 48px rgba(0, 0, 0, 0.12)',
          // Add subtle glow shadows for dark mode
          mode === 'dark' ? '0 0 20px rgba(88, 166, 255, 0.15)' : '0 0 20px rgba(0, 0, 0, 0.08)',
          mode === 'dark' ? '0 0 30px rgba(88, 166, 255, 0.2)' : '0 0 30px rgba(0, 0, 0, 0.1)',
          mode === 'dark' ? '0 0 40px rgba(88, 166, 255, 0.25)' : '0 0 40px rgba(0, 0, 0, 0.12)',
          '0 0 50px rgba(0, 0, 0, 0.15)',
          '0 0 60px rgba(0, 0, 0, 0.18)',
          '0 0 70px rgba(0, 0, 0, 0.2)',
          '0 0 80px rgba(0, 0, 0, 0.22)',
          '0 0 90px rgba(0, 0, 0, 0.24)',
          '0 0 100px rgba(0, 0, 0, 0.26)',
          '0 0 110px rgba(0, 0, 0, 0.28)',
          '0 0 120px rgba(0, 0, 0, 0.3)',
          '0 0 130px rgba(0, 0, 0, 0.32)',
          '0 0 140px rgba(0, 0, 0, 0.34)',
          '0 0 150px rgba(0, 0, 0, 0.36)',
          '0 0 160px rgba(0, 0, 0, 0.38)',
        ],
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarColor: mode === 'dark' ? '#484f58 #21262d' : '#c1c4c9 #f6f8fa',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: mode === 'dark' ? '#21262d' : '#f6f8fa',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: mode === 'dark' ? '#484f58' : '#c1c4c9',
                  borderRadius: '4px',
                  '&:hover': {
                    background: mode === 'dark' ? '#6e7681' : '#8b949e',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: 12,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              elevation1: {
                boxShadow: mode === 'dark'
                  ? '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
                  : '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
                borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: 'none',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
                backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
                borderRight: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 8,
                transition: 'all 0.2s ease-in-out',
              },
              contained: {
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: mode === 'dark'
                    ? '0 4px 12px rgba(88, 166, 255, 0.3)'
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)',
                },
              },
              outlined: {
                borderWidth: '1.5px',
                '&:hover': {
                  borderWidth: '1.5px',
                  transform: 'translateY(-1px)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontWeight: 500,
                fontSize: '0.75rem',
              },
              filled: {
                border: 'none',
              },
              outlined: {
                borderWidth: '1.5px',
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                border: '1px solid',
              },
              standardSuccess: {
                backgroundColor: mode === 'dark' ? 'rgba(63, 185, 80, 0.1)' : 'rgba(26, 127, 55, 0.08)',
                borderColor: mode === 'dark' ? 'rgba(63, 185, 80, 0.3)' : 'rgba(26, 127, 55, 0.2)',
              },
              standardWarning: {
                backgroundColor: mode === 'dark' ? 'rgba(210, 153, 34, 0.1)' : 'rgba(154, 103, 0, 0.08)',
                borderColor: mode === 'dark' ? 'rgba(210, 153, 34, 0.3)' : 'rgba(154, 103, 0, 0.2)',
              },
              standardError: {
                backgroundColor: mode === 'dark' ? 'rgba(248, 81, 73, 0.1)' : 'rgba(207, 34, 46, 0.08)',
                borderColor: mode === 'dark' ? 'rgba(248, 81, 73, 0.3)' : 'rgba(207, 34, 46, 0.2)',
              },
              standardInfo: {
                backgroundColor: mode === 'dark' ? 'rgba(88, 166, 255, 0.1)' : 'rgba(9, 105, 218, 0.08)',
                borderColor: mode === 'dark' ? 'rgba(88, 166, 255, 0.3)' : 'rgba(9, 105, 218, 0.2)',
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              root: {
                minHeight: 40,
              },
              indicator: {
                height: 2,
                borderRadius: 1,
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 40,
                padding: '8px 16px',
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                backgroundColor: mode === 'dark' ? '#21262d' : '#24292f',
                color: mode === 'dark' ? '#e6edf3' : '#ffffff',
                fontSize: '0.75rem',
                padding: '6px 12px',
                borderRadius: 6,
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              },
              arrow: {
                color: mode === 'dark' ? '#21262d' : '#24292f',
              },
            },
          },
          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: mode === 'dark' ? '#21262d' : '#f6f8fa',
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                borderRadius: 4,
                height: 6,
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiSkeleton: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
                borderRadius: 12,
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
                borderRadius: 8,
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: mode === 'dark'
                  ? '0 8px 24px rgba(0, 0, 0, 0.4)'
                  : '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                borderRadius: 8,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
      isDarkMode: mode === 'dark',
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
