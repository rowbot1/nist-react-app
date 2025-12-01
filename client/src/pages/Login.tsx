import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Paper,
  Collapse,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShieldIcon from '@mui/icons-material/Shield';

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: 'demo@posture.app',
      password: 'demo123',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      await login(data.email, data.password);
      navigate('/org');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'demo@posture.app');
    setValue('password', 'demo123');
    setShowDemo(false);
  };

  const features = [
    { icon: <SecurityIcon />, title: 'NIST CSF 2.0', desc: 'Complete framework coverage with 185 subcategories' },
    { icon: <AssessmentIcon />, title: 'Gap Analysis', desc: 'Identify compliance gaps and track remediation' },
    { icon: <VerifiedUserIcon />, title: 'Evidence Management', desc: 'Attach and manage compliance evidence' },
    { icon: <ShieldIcon />, title: 'Risk Scoring', desc: 'Quantified risk metrics and trending' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#F8FAFC',
      }}
    >
      {/* Left Panel - Product Info */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#0B1120',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="Posture"
            sx={{
              height: 48,
              width: 'auto',
              mb: 4,
              filter: 'brightness(0) invert(1)',
            }}
          />

          <Typography
            variant="h3"
            sx={{
              color: 'white',
              fontWeight: 700,
              mb: 2,
              fontSize: { md: '2rem', lg: '2.5rem' },
              lineHeight: 1.2,
            }}
          >
            Security Compliance,
            <br />
            <Box component="span" sx={{ color: '#06B6D4' }}>Simplified</Box>
          </Typography>

          <Typography
            sx={{
              color: 'rgba(255,255,255,0.7)',
              mb: 5,
              fontSize: '1.1rem',
              lineHeight: 1.6,
            }}
          >
            Track your organisation's security posture against NIST frameworks.
            Manage assessments, identify gaps, and demonstrate compliance.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {features.map((feature, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    color: '#06B6D4',
                    bgcolor: 'rgba(6, 182, 212, 0.1)',
                    p: 1,
                    borderRadius: 1,
                    display: 'flex',
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                    {feature.title}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    {feature.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography
          sx={{
            position: 'absolute',
            bottom: 24,
            left: 48,
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.75rem',
          }}
        >
          Built for cybersecurity professionals
        </Typography>
      </Box>

      {/* Right Panel - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          minWidth: { md: 480 },
          maxWidth: { md: 560 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, textAlign: 'center' }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="Posture"
              sx={{ height: 40, width: 'auto' }}
            />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0B1120' }}>
            Sign in to your account
          </Typography>
          <Typography sx={{ color: '#475569', mb: 3 }}>
            Enter your credentials to access the platform
          </Typography>

          {/* Demo credentials notice */}
          <Alert
            severity="info"
            sx={{
              mb: 3,
              bgcolor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              '& .MuiAlert-icon': {
                color: '#2563EB',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E40AF', mb: 0.5 }}>
              Demo credentials pre-filled
            </Typography>
            <Typography variant="body2" sx={{ color: '#1E40AF', fontSize: '0.875rem' }}>
              Click "Sign in" to explore with demo@posture.app
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="email"
              control={control}
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email Address"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{
                    mb: 2,
                    '& .MuiInputLabel-root': {
                      color: '#1E293B',
                      fontWeight: 500,
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#06B6D4',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#06B6D4' },
                      '&.Mui-focused fieldset': { borderColor: '#06B6D4' },
                      bgcolor: 'white',
                    },
                    '& .MuiInputBase-input': {
                      color: '#0B1120',
                      fontWeight: 500,
                      fontSize: '1rem',
                    },
                    '& .MuiInputBase-input::placeholder': { color: '#94A3B8', opacity: 1 },
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{
                    mb: 1,
                    '& .MuiInputLabel-root': {
                      color: '#1E293B',
                      fontWeight: 500,
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#06B6D4',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#06B6D4' },
                      '&.Mui-focused fieldset': { borderColor: '#06B6D4' },
                      bgcolor: 'white',
                    },
                    '& .MuiInputBase-input': {
                      color: '#0B1120',
                      fontWeight: 500,
                      fontSize: '1rem',
                    },
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Link
                href="#"
                variant="body2"
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: '#06B6D4' } }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                py: 1.5,
                bgcolor: '#0B1120',
                '&:hover': { bgcolor: '#1a2744' },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>

          {/* Demo access - subtle, collapsible */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E2E8F0' }}>
            <Button
              onClick={() => setShowDemo(!showDemo)}
              variant="text"
              size="small"
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontSize: '0.8rem',
                p: 0,
                '&:hover': { bgcolor: 'transparent', color: '#06B6D4' },
              }}
            >
              {showDemo ? 'Hide demo access' : 'Evaluating? Try demo access'}
            </Button>
            <Collapse in={showDemo}>
              <Paper
                variant="outlined"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                  Use the demo account to explore the platform with sample data.
                </Typography>
                <Button
                  onClick={fillDemoCredentials}
                  variant="outlined"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#CBD5E1',
                    color: '#475569',
                    '&:hover': { borderColor: '#06B6D4', color: '#06B6D4' },
                  }}
                >
                  Use demo account
                </Button>
              </Paper>
            </Collapse>
          </Box>

          <Typography
            sx={{
              mt: 4,
              textAlign: 'center',
              color: '#64748B',
              fontSize: '0.75rem',
            }}
          >
            © 2025 Posture. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
