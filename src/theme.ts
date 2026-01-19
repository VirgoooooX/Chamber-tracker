import { alpha, createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#003da5',
      light: '#005cb9',
      dark: '#004a94',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5b6b7a',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    divider: alpha('#0f172a', 0.12),
    text: {
      primary: '#0f172a',
      secondary: alpha('#0f172a', 0.68),
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4f6f8',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          minHeight: 36,
          paddingInline: theme.spacing(1.5),
          gap: theme.spacing(0.75),
        }),
        containedPrimary: ({ theme }) => ({
          boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.22)}`,
          '&:hover': {
            boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, 0.28)}`,
          },
        }),
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
        margin: 'dense',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.background.paper,
          transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.32),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
        }),
        notchedOutline: ({ theme }) => ({
          borderColor: alpha(theme.palette.text.primary, 0.18),
        }),
        input: ({ theme }) => ({
          paddingTop: theme.spacing(1.125),
          paddingBottom: theme.spacing(1.125),
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: alpha(theme.palette.text.primary, 0.68),
        }),
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: ({ theme }) => ({
          marginLeft: theme.spacing(0.25),
          marginRight: theme.spacing(0.25),
        }),
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        select: ({ theme }) => ({
          display: 'flex',
          alignItems: 'center',
          paddingTop: theme.spacing(1.125),
          paddingBottom: theme.spacing(1.125),
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          boxShadow: `0 1px 2px ${alpha('#0f172a', 0.06)}`,
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.text.primary, 0.04),
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({
          fontWeight: 700,
          color: theme.palette.text.secondary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
        body: ({ theme }) => ({
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2, 2.5),
          fontWeight: 800,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2, 2.5),
        }),
        dividers: ({ theme }) => ({
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(1.5, 2.5, 2, 2.5),
          gap: theme.spacing(1),
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
    MuiChip: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
  },
});
