import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Business as ProductIcon,
  Computer as SystemIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateProduct } from '../hooks/useProducts';
import { useCreateSystem } from '../hooks/useSystems';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const STEPS = [
  { label: 'Welcome', description: 'Introduction to NIST Mapper' },
  { label: 'Create Product', description: 'Set up your first product' },
  { label: 'Add System', description: 'Define a system to assess' },
  { label: 'Next Steps', description: "What's next" },
];

const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'TEST'];
const CRITICALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DATA_CLASSIFICATIONS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [productData, setProductData] = useState<{
    name: string;
    description: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>({
    name: '',
    description: '',
    riskLevel: 'MEDIUM',
  });
  const [systemData, setSystemData] = useState({
    name: '',
    description: '',
    environment: 'PRODUCTION',
    criticality: 'MEDIUM',
    dataClassification: 'INTERNAL',
  });
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createProductMutation = useCreateProduct({
    onSuccess: (data) => {
      setCreatedProductId(data.id);
      setActiveStep(2);
    },
    onError: (err) => {
      setError(err.message || 'Failed to create product');
    },
  });

  const createSystemMutation = useCreateSystem({
    onSuccess: () => {
      setActiveStep(3);
    },
    onError: (err) => {
      setError(err.message || 'Failed to create system');
    },
  });

  // Check if user has completed onboarding before
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (hasCompletedOnboarding && open) {
      onClose();
    }
  }, [open, onClose]);

  const handleNext = () => {
    setError(null);
    if (activeStep === 1) {
      // Create product
      if (!productData.name.trim()) {
        setError('Product name is required');
        return;
      }
      createProductMutation.mutate(productData);
    } else if (activeStep === 2) {
      // Create system
      if (!systemData.name.trim()) {
        setError('System name is required');
        return;
      }
      if (!createdProductId) {
        setError('No product created');
        return;
      }
      createSystemMutation.mutate({
        ...systemData,
        productId: createdProductId,
      });
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete?.();
    onClose();
    if (createdProductId) {
      navigate(`/products/${createdProductId}`);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onClose();
  };

  const isLoading = createProductMutation.isPending || createSystemMutation.isPending;

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <SecurityIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Welcome to NIST Control Mapper
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your comprehensive solution for NIST 800-53 compliance management.
              Let's get you started with a quick setup.
            </Typography>

            <Grid container spacing={2} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <ProductIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Products
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organize your compliance by product or business unit
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <SystemIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Systems
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track individual systems and their environments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AssessmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Assessments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Evaluate compliance against NIST 800-53 controls
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }} icon={<TipIcon />}>
              This wizard will help you create your first product and system. You can always add more later.
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create Your First Product
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              A product represents a business application, service, or system group that needs compliance tracking.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Product Name"
                value={productData.name}
                onChange={(e) => setProductData((prev) => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                placeholder="e.g., Customer Portal, Internal HR System"
                autoFocus
              />

              <TextField
                label="Description"
                value={productData.description}
                onChange={(e) => setProductData((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                fullWidth
                placeholder="Describe the product and its business purpose..."
              />

              <FormControl fullWidth>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={productData.riskLevel}
                  label="Risk Level"
                  onChange={(e) => setProductData((prev) => ({ ...prev, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
                >
                  <MenuItem value="LOW">Low - Minimal business impact</MenuItem>
                  <MenuItem value="MEDIUM">Medium - Moderate business impact</MenuItem>
                  <MenuItem value="HIGH">High - Critical business impact</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }} icon={<TipIcon />}>
              <strong>Tip:</strong> Choose a risk level that reflects the business impact if this product were compromised.
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckIcon color="success" />
              <Typography variant="body1" color="success.main">
                Product "{productData.name}" created successfully!
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              Add a System
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Systems are the technical components that make up your product. Each system can have its own compliance assessments.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="System Name"
                value={systemData.name}
                onChange={(e) => setSystemData((prev) => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                placeholder="e.g., Production Web Server, Database Cluster"
                autoFocus
              />

              <TextField
                label="Description"
                value={systemData.description}
                onChange={(e) => setSystemData((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
                placeholder="Describe the system and its role..."
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select
                      value={systemData.environment}
                      label="Environment"
                      onChange={(e) => setSystemData((prev) => ({ ...prev, environment: e.target.value }))}
                    >
                      {ENVIRONMENTS.map((env) => (
                        <MenuItem key={env} value={env}>
                          {env.charAt(0) + env.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Criticality</InputLabel>
                    <Select
                      value={systemData.criticality}
                      label="Criticality"
                      onChange={(e) => setSystemData((prev) => ({ ...prev, criticality: e.target.value }))}
                    >
                      {CRITICALITY_LEVELS.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.charAt(0) + level.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Data Classification</InputLabel>
                    <Select
                      value={systemData.dataClassification}
                      label="Data Classification"
                      onChange={(e) => setSystemData((prev) => ({ ...prev, dataClassification: e.target.value }))}
                    >
                      {DATA_CLASSIFICATIONS.map((classification) => (
                        <MenuItem key={classification} value={classification}>
                          {classification.charAt(0) + classification.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              You're All Set!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your product and system have been created. Here's what you can do next:
            </Typography>

            <Grid container spacing={2} sx={{ mt: 2, textAlign: 'left' }}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => { handleComplete(); navigate(`/products/${createdProductId}/baseline`); }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <SecurityIcon color="primary" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Configure Baseline Controls
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Select which NIST 800-53 controls apply to your product
                        </Typography>
                      </Box>
                      <Chip label="Recommended" color="primary" size="small" sx={{ ml: 'auto' }} />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => { handleComplete(); navigate(`/products/${createdProductId}/assessments`); }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <AssessmentIcon color="warning" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Start an Assessment
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Begin evaluating your system against the baseline controls
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => { handleComplete(); navigate('/products'); }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ProductIcon color="info" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          View All Products
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Go to the products dashboard to manage all your products
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {activeStep === 0 && (
          <Button onClick={handleSkip} color="inherit">
            Skip Tutorial
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}
        {activeStep < 3 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isLoading}
          >
            {activeStep === 0 ? "Let's Get Started" : activeStep === 2 ? 'Create System' : 'Create Product'}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleComplete}>
            Go to Product
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;
