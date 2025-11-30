import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  useCapabilityCentres,
  useCreateCapabilityCentre,
  useUpdateCapabilityCentre,
  useDeleteCapabilityCentre,
} from '../hooks/useCapabilityCentres';
import { useFrameworks } from '../hooks';
import type { CapabilityCentre } from '../types/api.types';
import axios from 'axios';
import { format } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

interface PasswordStrength {
  score: number;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

// Colors for capability centres
const CC_COLORS = [
  '#1976d2', // Blue
  '#388e3c', // Green
  '#f57c00', // Orange
  '#7b1fa2', // Purple
  '#d32f2f', // Red
  '#0097a7', // Cyan
  '#5d4037', // Brown
  '#455a64', // Blue Grey
];

interface CCFormData {
  name: string;
  description: string;
  code: string;
  color: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferences state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [assessmentReminders, setAssessmentReminders] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [defaultProduct, setDefaultProduct] = useState('');
  const [defaultDateRange, setDefaultDateRange] = useState('30');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [preferencesSuccess, setPreferencesSuccess] = useState('');
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  // Organization state (Capability Centres & Frameworks)
  const { data: capabilityCentres = [], isLoading: ccLoading } = useCapabilityCentres();
  const { data: frameworks = [] } = useFrameworks();
  const createCC = useCreateCapabilityCentre();
  const updateCC = useUpdateCapabilityCentre();
  const deleteCC = useDeleteCapabilityCentre();

  const [ccDialogOpen, setCcDialogOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CapabilityCentre | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ccToDelete, setCcToDelete] = useState<CapabilityCentre | null>(null);
  const [ccFormData, setCcFormData] = useState<CCFormData>({
    name: '',
    description: '',
    code: '',
    color: CC_COLORS[0],
  });

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences);
      setEmailNotifications(prefs.emailNotifications ?? true);
      setAssessmentReminders(prefs.assessmentReminders ?? true);
      setComplianceAlerts(prefs.complianceAlerts ?? true);
      setDefaultProduct(prefs.defaultProduct || '');
      setDefaultDateRange(prefs.defaultDateRange || '30');
      setExportFormat(prefs.exportFormat || 'pdf');
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Clear messages when switching tabs
    setProfileSuccess('');
    setProfileError('');
    setPasswordSuccess('');
    setPasswordError('');
    setPreferencesSuccess('');
    setPreferencesError('');
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (password.length === 0) {
      return { score: 0, label: '', color: 'error' };
    }
    if (password.length < 8) {
      return { score: 25, label: 'Weak', color: 'error' };
    }

    let score = 25; // Base score for length >= 8

    // Check for uppercase
    if (/[A-Z]/.test(password)) score += 25;

    // Check for numbers
    if (/[0-9]/.test(password)) score += 25;

    // Check for special characters
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    if (score <= 25) return { score, label: 'Weak', color: 'error' };
    if (score <= 50) return { score, label: 'Fair', color: 'warning' };
    if (score <= 75) return { score, label: 'Good', color: 'info' };
    return { score, label: 'Strong', color: 'success' };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'error';
      case 'AUDITOR':
        return 'warning';
      case 'USER':
      default:
        return 'primary';
    }
  };

  // Profile handlers
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      await axios.put('/api/auth/profile', { name: profileName });
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (error: any) {
      setProfileError(
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Password handlers
  const handleChangePassword = async () => {
    setPasswordSuccess('');
    setPasswordError('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);

    try {
      await axios.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error: any) {
      setPasswordError(
        error.response?.data?.message || 'Failed to change password'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // Preferences handlers
  const handleSavePreferences = () => {
    setPreferencesLoading(true);
    setPreferencesSuccess('');
    setPreferencesError('');

    try {
      // Save dark mode
      localStorage.setItem('darkMode', JSON.stringify(darkMode));

      // Save other preferences
      const preferences = {
        emailNotifications,
        assessmentReminders,
        complianceAlerts,
        defaultProduct,
        defaultDateRange,
        exportFormat,
      };
      localStorage.setItem('userPreferences', JSON.stringify(preferences));

      setPreferencesSuccess('Preferences saved successfully!');
      setTimeout(() => setPreferencesSuccess(''), 3000);
    } catch (error) {
      setPreferencesError('Failed to save preferences');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleDarkModeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setDarkMode(newValue);
  };

  // Capability Centre handlers
  const handleOpenCCDialog = (cc?: CapabilityCentre) => {
    if (cc) {
      setEditingCC(cc);
      setCcFormData({
        name: cc.name,
        description: cc.description || '',
        code: cc.code || '',
        color: cc.color || CC_COLORS[0],
      });
    } else {
      setEditingCC(null);
      setCcFormData({
        name: '',
        description: '',
        code: '',
        color: CC_COLORS[0],
      });
    }
    setCcDialogOpen(true);
  };

  const handleCloseCCDialog = () => {
    setCcDialogOpen(false);
    setEditingCC(null);
  };

  const handleSaveCC = async () => {
    if (editingCC) {
      await updateCC.mutateAsync({
        id: editingCC.id,
        data: {
          name: ccFormData.name,
          description: ccFormData.description || undefined,
          code: ccFormData.code || undefined,
          color: ccFormData.color,
        },
      });
    } else {
      await createCC.mutateAsync({
        name: ccFormData.name,
        description: ccFormData.description || undefined,
        code: ccFormData.code || undefined,
        color: ccFormData.color,
      });
    }
    handleCloseCCDialog();
  };

  const handleDeleteCC = (cc: CapabilityCentre) => {
    setCcToDelete(cc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteCC = async () => {
    if (ccToDelete) {
      await deleteCC.mutateAsync(ccToDelete.id);
    }
    setDeleteDialogOpen(false);
    setCcToDelete(null);
  };

  // Get frameworks count for a capability centre
  const getFrameworksForCC = (ccId: string) => {
    return frameworks.filter((fw) => fw.capabilityCentreId === ccId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account and application preferences
        </Typography>
      </Box>

      <Paper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="settings tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label="Profile"
              {...a11yProps(0)}
            />
            <Tab
              icon={<SecurityIcon />}
              iconPosition="start"
              label="Security"
              {...a11yProps(1)}
            />
            <Tab
              icon={<SettingsIcon />}
              iconPosition="start"
              label="Preferences"
              {...a11yProps(2)}
            />
            <Tab
              icon={<BusinessIcon />}
              iconPosition="start"
              label="Organization"
              {...a11yProps(3)}
            />
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {profileSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {profileSuccess}
              </Alert>
            )}
            {profileError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {profileError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem',
                  mb: 2,
                }}
              >
                {user?.name ? getInitials(user.name) : '?'}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {user?.name || 'User'}
              </Typography>
              <Chip
                label={user?.role || 'USER'}
                color={getRoleColor(user?.role || 'USER')}
                size="small"
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  disabled={profileLoading}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  variant="outlined"
                  helperText="Email cannot be changed"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Role"
                  value={user?.role || 'USER'}
                  disabled
                  variant="outlined"
                  helperText="Role is assigned by administrators"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Member Since"
                  value={format(new Date(), 'MMMM d, yyyy')}
                  disabled
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={profileLoading ? null : <SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={profileLoading || profileName === user?.name}
                >
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {passwordSuccess}
              </Alert>
            )}
            {passwordError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {passwordError}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ensure your account is using a long, random password to stay secure.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                  variant="outlined"
                  helperText="Password must be at least 8 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {newPassword && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Password Strength:
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        color={`${passwordStrength.color}.main`}
                      >
                        {passwordStrength.label}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength.score}
                      color={passwordStrength.color}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                  variant="outlined"
                  error={
                    confirmPassword.length > 0 && newPassword !== confirmPassword
                  }
                  helperText={
                    confirmPassword.length > 0 && newPassword !== confirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={passwordLoading ? null : <SecurityIcon />}
                  onClick={handleChangePassword}
                  disabled={
                    passwordLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                >
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
              Active Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage your active sessions across devices.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Current Session
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(), 'MMMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Active"
                  color="success"
                  size="small"
                />
              </Box>
            </Paper>

            <Button
              variant="outlined"
              color="error"
              fullWidth
              disabled
            >
              Sign Out All Other Sessions (Coming Soon)
            </Button>
          </Box>
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {preferencesSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {preferencesSuccess}
              </Alert>
            )}
            {preferencesError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {preferencesError}
              </Alert>
            )}

            {/* Theme Section */}
            <Typography variant="h6" gutterBottom>
              Theme
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customize the appearance of the application.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                    disabled={preferencesLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Dark Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use dark theme throughout the application
                    </Typography>
                  </Box>
                }
              />
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* Notifications Section */}
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage how you receive notifications.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled={preferencesLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Email Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive notifications via email
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={assessmentReminders}
                    onChange={(e) => setAssessmentReminders(e.target.checked)}
                    disabled={preferencesLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Assessment Reminders</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Get reminded about pending assessments
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={complianceAlerts}
                    onChange={(e) => setComplianceAlerts(e.target.checked)}
                    disabled={preferencesLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Compliance Alerts</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive alerts for compliance issues
                    </Typography>
                  </Box>
                }
              />
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* Default Settings Section */}
            <Typography variant="h6" gutterBottom>
              Default Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set your default preferences for the application.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Default Product</InputLabel>
                  <Select
                    value={defaultProduct}
                    onChange={(e: SelectChangeEvent) => setDefaultProduct(e.target.value)}
                    label="Default Product"
                    disabled={preferencesLoading}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="product1">Product 1</MenuItem>
                    <MenuItem value="product2">Product 2</MenuItem>
                    <MenuItem value="product3">Product 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Default Date Range for Analytics</InputLabel>
                  <Select
                    value={defaultDateRange}
                    onChange={(e: SelectChangeEvent) => setDefaultDateRange(e.target.value)}
                    label="Default Date Range for Analytics"
                    disabled={preferencesLoading}
                  >
                    <MenuItem value="30">Last 30 Days</MenuItem>
                    <MenuItem value="90">Last 90 Days</MenuItem>
                    <MenuItem value="365">Last 365 Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Data Export Section */}
            <Typography variant="h6" gutterBottom>
              Data Export
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose your preferred export format.
            </Typography>

            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel>Preferred Export Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e: SelectChangeEvent) => setExportFormat(e.target.value)}
                label="Preferred Export Format"
                disabled={preferencesLoading}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel (XLSX)</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={preferencesLoading ? null : <SaveIcon />}
              onClick={handleSavePreferences}
              disabled={preferencesLoading}
            >
              {preferencesLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>
        </TabPanel>

        {/* Organization Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Capability Centres Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  Capability Centres
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Top-level organizational units that group frameworks
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCCDialog()}
              >
                Add Capability Centre
              </Button>
            </Box>

            {ccLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : capabilityCentres.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Capability Centres Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first capability centre to organize your compliance framework
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenCCDialog()}
                >
                  Create First Capability Centre
                </Button>
              </Paper>
            ) : (
              <Paper variant="outlined">
                <List disablePadding>
                  {capabilityCentres.map((cc, index) => {
                    const ccFrameworks = getFrameworksForCC(cc.id);
                    return (
                      <React.Fragment key={cc.id}>
                        {index > 0 && <Divider />}
                        <ListItem sx={{ py: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              backgroundColor: cc.color || '#1976d2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              mr: 2,
                            }}
                          >
                            <BusinessIcon />
                          </Box>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {cc.name}
                                </Typography>
                                {cc.code && (
                                  <Chip label={cc.code} size="small" variant="outlined" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                {cc.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {cc.description}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  {ccFrameworks.length} framework{ccFrameworks.length !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Edit">
                              <IconButton
                                edge="end"
                                onClick={() => handleOpenCCDialog(cc)}
                                sx={{ mr: 1 }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                edge="end"
                                onClick={() => handleDeleteCC(cc)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              </Paper>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Frameworks Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  Frameworks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Business domain portfolios that organize products
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={() => navigate('/frameworks')}
              >
                Manage Frameworks
              </Button>
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {frameworks.length} framework{frameworks.length !== 1 ? 's' : ''} configured.{' '}
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/frameworks')}
                >
                  Go to Frameworks page
                </Typography>{' '}
                to create, edit, or delete frameworks.
              </Typography>
            </Paper>

            <Divider sx={{ my: 4 }} />

            {/* Quick Reference */}
            <Typography variant="h6" gutterBottom>
              Quick Reference
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How to add entities in the application
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Add Products
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Go to <strong>Products</strong> page → Click <strong>"Create Product"</strong> button
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate('/products')}
                  >
                    Go to Products
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Add Systems
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open a <strong>Product</strong> → <strong>Systems</strong> tab → Click <strong>"Add System"</strong>
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate('/products')}
                  >
                    Go to Products
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Add Frameworks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Go to <strong>Frameworks</strong> page → Click <strong>"New Framework"</strong> button
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate('/frameworks')}
                  >
                    Go to Frameworks
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Capability Centre Dialog */}
      <Dialog open={ccDialogOpen} onClose={handleCloseCCDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCC ? 'Edit Capability Centre' : 'Create Capability Centre'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={ccFormData.name}
            onChange={(e) => setCcFormData({ ...ccFormData, name: e.target.value })}
            placeholder="e.g., Technology, Operations, Security"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Code"
            fullWidth
            value={ccFormData.code}
            onChange={(e) => setCcFormData({ ...ccFormData, code: e.target.value })}
            placeholder="e.g., TECH, OPS, SEC"
            helperText="Short identifier (optional)"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={ccFormData.description}
            onChange={(e) => setCcFormData({ ...ccFormData, description: e.target.value })}
            placeholder="Brief description of this capability centre"
            sx={{ mb: 3 }}
          />
          <Typography variant="subtitle2" gutterBottom>
            Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CC_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setCcFormData({ ...ccFormData, color })}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: ccFormData.color === color ? 3 : 0,
                  borderColor: 'white',
                  boxShadow: ccFormData.color === color ? `0 0 0 2px ${color}` : 'none',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCCDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveCC}
            disabled={!ccFormData.name.trim() || createCC.isPending || updateCC.isPending}
          >
            {createCC.isPending || updateCC.isPending ? (
              <CircularProgress size={20} />
            ) : editingCC ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Capability Centre?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{ccToDelete?.name}"?
          </Typography>
          {ccToDelete && getFrameworksForCC(ccToDelete.id).length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This capability centre has {getFrameworksForCC(ccToDelete.id).length} framework(s).
              Deleting it may affect associated data.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteCC}
            disabled={deleteCC.isPending}
          >
            {deleteCC.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
