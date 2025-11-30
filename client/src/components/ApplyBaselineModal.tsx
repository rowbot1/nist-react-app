import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useBaselineTemplates, useApplyBaselineTemplate } from '../hooks/useBaseline';

interface ApplyBaselineModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  systemCount: number;
}

const templateIcons: Record<string, React.ReactNode> = {
  'minimal-startup': <SpeedIcon sx={{ fontSize: 40 }} />,
  'standard-enterprise': <BusinessIcon sx={{ fontSize: 40 }} />,
  'comprehensive': <SecurityIcon sx={{ fontSize: 40 }} />,
};

const templateColors: Record<string, string> = {
  'minimal-startup': '#4caf50',
  'standard-enterprise': '#2196f3',
  'comprehensive': '#9c27b0',
};

const ApplyBaselineModal: React.FC<ApplyBaselineModalProps> = ({
  open,
  onClose,
  productId,
  productName,
  systemCount,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string } | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useBaselineTemplates();
  const applyMutation = useApplyBaselineTemplate();

  const handleApply = async () => {
    if (!selectedTemplate) return;

    try {
      const result = await applyMutation.mutateAsync({
        productId,
        templateId: selectedTemplate,
      });

      setSuccess({
        message: result.summary.message,
      });

      // Auto-close after showing success
      setTimeout(() => {
        setSuccess(null);
        setSelectedTemplate(null);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const handleClose = () => {
    if (!applyMutation.isPending) {
      setSelectedTemplate(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Apply CSF Baseline</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select a baseline template for <strong>{productName}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2">{success.message}</Typography>
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              This will apply the selected baseline to {productName} and create{' '}
              <strong>NOT_ASSESSED</strong> compliance records for all{' '}
              <strong>{systemCount} system{systemCount !== 1 ? 's' : ''}</strong> under this product.
            </Alert>

            {templatesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    variant="outlined"
                    sx={{
                      border: selectedTemplate === template.id
                        ? `2px solid ${templateColors[template.id] || '#1976d2'}`
                        : undefined,
                      bgcolor: selectedTemplate === template.id
                        ? `${templateColors[template.id]}10`
                        : undefined,
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedTemplate(template.id)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box
                            sx={{
                              color: templateColors[template.id] || '#1976d2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1,
                              borderRadius: 2,
                              bgcolor: `${templateColors[template.id] || '#1976d2'}15`,
                            }}
                          >
                            {templateIcons[template.id] || <SecurityIcon sx={{ fontSize: 40 }} />}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="h6">{template.name}</Typography>
                              {selectedTemplate === template.id && (
                                <CheckCircleIcon
                                  color="success"
                                  sx={{ fontSize: 20 }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {template.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={`${template.controlCount} controls`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {template.functions.map((func) => (
                                <Chip
                                  key={func}
                                  label={func}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

        {applyMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to apply baseline. Please try again.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={applyMutation.isPending}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!selectedTemplate || applyMutation.isPending}
            startIcon={applyMutation.isPending ? <CircularProgress size={20} /> : <SecurityIcon />}
          >
            {applyMutation.isPending ? 'Applying...' : 'Apply Baseline'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ApplyBaselineModal;
