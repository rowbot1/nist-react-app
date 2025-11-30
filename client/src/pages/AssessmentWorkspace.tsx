/**
 * AssessmentWorkspace Page
 *
 * Single-page assessment experience for analysts. Features:
 * - Three-panel layout (control tree | form | context)
 * - Keyboard navigation (j/k, 1-4, n, s)
 * - Auto-save with debounce
 * - Progress tracking
 * - NIST 800-53 mappings visible
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  SkipPrevious as PrevSystemIcon,
  SkipNext as NextSystemIcon,
  ExpandLess,
  ExpandMore,
  CheckCircle as CompliantIcon,
  Warning as PartialIcon,
  Cancel as NonCompliantIcon,
  RemoveCircleOutline as NAIcon,
  RadioButtonUnchecked as NotAssessedIcon,
  Keyboard as KeyboardIcon,
  Policy as PolicyIcon,
  Business as BusinessIcon,
  Folder as FrameworkIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useSystem, useSystems } from '../hooks/useSystems';
import {
  useAssessments,
  useUpdateAssessment,
  useCreateAssessment,
} from '../hooks/useAssessments';
import { useCSFHierarchy, useCSFMappings, CSF_FUNCTION_ORDER } from '../hooks/useCSF';
import { useNotification } from '../contexts/NotificationContext';
import type {
  ComplianceStatus,
  RiskLevel,
  CSFFunction,
  CSFCategory,
  CSFSubcategory,
  Assessment,
} from '../types/api.types';

// Status configuration
const COMPLIANCE_STATUSES: { value: ComplianceStatus; label: string; color: string; shortcut: string }[] = [
  { value: 'Implemented', label: 'Implemented', color: '#4caf50', shortcut: '1' },
  { value: 'Partially Implemented', label: 'Partial', color: '#ff9800', shortcut: '2' },
  { value: 'Not Implemented', label: 'Not Implemented', color: '#f44336', shortcut: '3' },
  { value: 'Not Applicable', label: 'N/A', color: '#757575', shortcut: '4' },
];

// Get status icon
const StatusIcon: React.FC<{ status: ComplianceStatus; size?: 'small' | 'medium' }> = ({
  status,
  size = 'small',
}) => {
  const fontSize = size === 'small' ? 16 : 20;
  const config = COMPLIANCE_STATUSES.find((s) => s.value === status);
  const color = config?.color || '#9e9e9e';

  switch (status) {
    case 'Implemented':
      return <CompliantIcon sx={{ color, fontSize }} />;
    case 'Partially Implemented':
      return <PartialIcon sx={{ color, fontSize }} />;
    case 'Not Implemented':
      return <NonCompliantIcon sx={{ color, fontSize }} />;
    case 'Not Applicable':
      return <NAIcon sx={{ color, fontSize }} />;
    default:
      return <NotAssessedIcon sx={{ color, fontSize }} />;
  }
};

// Progress indicator component
interface ProgressIndicatorProps {
  total: number;
  completed: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  total,
  completed,
  compliant,
  partial,
  nonCompliant,
}) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Progress: {completed}/{total} controls ({percent}%)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" label={compliant} color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
          <Chip size="small" label={partial} color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
          <Chip size="small" label={nonCompliant} color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

// Control tree component
interface ControlTreeProps {
  hierarchy: CSFFunction[];
  assessments: Map<string, Assessment>;
  selectedControlId: string | null;
  onSelectControl: (controlId: string) => void;
  baselineControlIds: Set<string>;
}

const ControlTree: React.FC<ControlTreeProps> = ({
  hierarchy,
  assessments,
  selectedControlId,
  onSelectControl,
  baselineControlIds,
}) => {
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Auto-expand function containing selected control
  useEffect(() => {
    if (selectedControlId) {
      const funcCode = selectedControlId.substring(0, 2);
      const catCode = selectedControlId.match(/^([A-Z]{2}\.[A-Z]{2})/)?.[1];
      if (funcCode) {
        setExpandedFunctions((prev) => ({ ...prev, [funcCode]: true }));
      }
      if (catCode) {
        setExpandedCategories((prev) => ({ ...prev, [catCode]: true }));
      }
    }
  }, [selectedControlId]);

  const toggleFunction = (code: string) => {
    setExpandedFunctions((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleCategory = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Get completion stats for a function
  const getFunctionStats = (func: CSFFunction) => {
    let total = 0;
    let completed = 0;
    let compliant = 0;

    func.categories.forEach((cat) => {
      cat.subcategories.forEach((sub) => {
        if (baselineControlIds.has(sub.id)) {
          total++;
          const assessment = assessments.get(sub.id);
          if (assessment && assessment.status !== 'Not Assessed') {
            completed++;
            if (assessment.status === 'Implemented') compliant++;
          }
        }
      });
    });

    return { total, completed, compliant };
  };

  // Get completion stats for a category
  const getCategoryStats = (cat: CSFCategory) => {
    let total = 0;
    let completed = 0;

    cat.subcategories.forEach((sub) => {
      if (baselineControlIds.has(sub.id)) {
        total++;
        const assessment = assessments.get(sub.id);
        if (assessment && assessment.status !== 'Not Assessed') {
          completed++;
        }
      }
    });

    return { total, completed };
  };

  // Sort functions by CSF order
  const sortedFunctions = useMemo(() => {
    return [...hierarchy].sort((a, b) => {
      const indexA = CSF_FUNCTION_ORDER.indexOf(a.code);
      const indexB = CSF_FUNCTION_ORDER.indexOf(b.code);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }, [hierarchy]);

  return (
    <List dense sx={{ py: 0 }}>
      {sortedFunctions.map((func) => {
        const funcStats = getFunctionStats(func);
        if (funcStats.total === 0) return null;

        return (
          <React.Fragment key={func.code}>
            <ListItemButton
              onClick={() => toggleFunction(func.code)}
              sx={{ py: 0.5, borderRadius: 1 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {func.code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({funcStats.completed}/{funcStats.total})
                    </Typography>
                  </Box>
                }
                secondary={func.name}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {expandedFunctions[func.code] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>

            <Collapse in={expandedFunctions[func.code]} timeout="auto" unmountOnExit>
              <List disablePadding>
                {func.categories.map((cat) => {
                  const catStats = getCategoryStats(cat);
                  if (catStats.total === 0) return null;

                  // Filter subcategories to only those in baseline
                  const baselineSubcats = cat.subcategories.filter((s) =>
                    baselineControlIds.has(s.id)
                  );

                  return (
                    <React.Fragment key={cat.code}>
                      <ListItemButton
                        onClick={(e) => toggleCategory(cat.code, e)}
                        sx={{ pl: 3, py: 0.25 }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" fontWeight={500}>
                                {cat.code}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({catStats.completed}/{catStats.total})
                              </Typography>
                            </Box>
                          }
                        />
                        {expandedCategories[cat.code] ? (
                          <ExpandLess fontSize="small" />
                        ) : (
                          <ExpandMore fontSize="small" />
                        )}
                      </ListItemButton>

                      <Collapse in={expandedCategories[cat.code]} timeout="auto" unmountOnExit>
                        <List disablePadding>
                          {baselineSubcats.map((sub) => {
                            const assessment = assessments.get(sub.id);
                            const status = assessment?.status || 'Not Assessed';
                            const isSelected = selectedControlId === sub.id;

                            return (
                              <ListItemButton
                                key={sub.id}
                                selected={isSelected}
                                onClick={() => onSelectControl(sub.id)}
                                sx={{
                                  pl: 5,
                                  py: 0.25,
                                  bgcolor: isSelected ? 'primary.light' : undefined,
                                  '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                  },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                  <StatusIcon status={status} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={sub.code}
                                  primaryTypographyProps={{
                                    variant: 'caption',
                                    fontWeight: isSelected ? 600 : 400,
                                  }}
                                />
                              </ListItemButton>
                            );
                          })}
                        </List>
                      </Collapse>
                    </React.Fragment>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        );
      })}
    </List>
  );
};

// Main AssessmentWorkspace component
const AssessmentWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { productId, systemId } = useParams<{ productId: string; systemId: string }>();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();

  // Local state
  const [selectedControlId, setSelectedControlId] = useState<string | null>(
    searchParams.get('control') || null
  );
  const [status, setStatus] = useState<ComplianceStatus>('Not Assessed');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Refs for debounced auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Data fetching
  const { data: product, isLoading: productLoading } = useProduct(productId || '');
  const { data: system, isLoading: systemLoading } = useSystem(systemId || '');
  const { data: siblingSystemsData = [], isLoading: siblingsLoading } = useSystems(productId, { enabled: !!productId });
  const { data: hierarchy, isLoading: hierarchyLoading } = useCSFHierarchy();
  const { data: assessments = [], isLoading: assessmentsLoading, refetch: refetchAssessments } = useAssessments(
    systemId ? { systemId } : undefined,
    { enabled: !!systemId }
  );

  // Sibling systems for navigation (sorted by name)
  const siblingSystemsList = useMemo(() => {
    return [...siblingSystemsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [siblingSystemsData]);

  const currentSystemIndex = useMemo(() => {
    return siblingSystemsList.findIndex(s => s.id === systemId);
  }, [siblingSystemsList, systemId]);

  const canGoPrevSystem = currentSystemIndex > 0;
  const canGoNextSystem = currentSystemIndex < siblingSystemsList.length - 1;

  const goToPrevSystem = useCallback(() => {
    if (canGoPrevSystem) {
      navigate(`/assess/${productId}/${siblingSystemsList[currentSystemIndex - 1].id}`);
    }
  }, [canGoPrevSystem, currentSystemIndex, siblingSystemsList, productId, navigate]);

  const goToNextSystem = useCallback(() => {
    if (canGoNextSystem) {
      navigate(`/assess/${productId}/${siblingSystemsList[currentSystemIndex + 1].id}`);
    }
  }, [canGoNextSystem, currentSystemIndex, siblingSystemsList, productId, navigate]);

  // Fetch 800-53 mappings for selected control
  const { data: mappingsData } = useCSFMappings(selectedControlId || '', {
    enabled: !!selectedControlId,
  });

  // Mutations
  const updateAssessment = useUpdateAssessment();
  const createAssessment = useCreateAssessment();

  // Build assessment map for quick lookup
  const assessmentMap = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach((a) => {
      map.set(a.subcategoryCode, a);
    });
    return map;
  }, [assessments]);

  // Get baseline control IDs from product
  const baselineControlIds = useMemo(() => {
    const ids = new Set<string>();
    if (product?.csfBaseline) {
      product.csfBaseline.forEach((b: any) => {
        ids.add(b.subcategoryId);
      });
    }
    return ids;
  }, [product]);

  // Build list of controls in order for navigation
  const controlList = useMemo(() => {
    if (!hierarchy) return [];

    const list: string[] = [];
    // Sort functions by CSF order
    const sortedFuncs = [...hierarchy].sort((a, b) => {
      const indexA = CSF_FUNCTION_ORDER.indexOf(a.code);
      const indexB = CSF_FUNCTION_ORDER.indexOf(b.code);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    sortedFuncs.forEach((func) => {
      func.categories.forEach((cat) => {
        cat.subcategories.forEach((sub) => {
          if (baselineControlIds.has(sub.id)) {
            list.push(sub.id);
          }
        });
      });
    });

    return list;
  }, [hierarchy, baselineControlIds]);

  // Get current control details
  const currentControl = useMemo(() => {
    if (!hierarchy || !selectedControlId) return null;

    for (const func of hierarchy) {
      for (const cat of func.categories) {
        const sub = cat.subcategories.find((s) => s.id === selectedControlId);
        if (sub) {
          return {
            subcategory: sub,
            category: cat,
            function: func,
          };
        }
      }
    }
    return null;
  }, [hierarchy, selectedControlId]);

  // Calculate progress stats
  const progressStats = useMemo(() => {
    let total = baselineControlIds.size;
    let completed = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;

    baselineControlIds.forEach((id) => {
      const assessment = assessmentMap.get(id);
      if (assessment && assessment.status !== 'Not Assessed') {
        completed++;
        if (assessment.status === 'Implemented') compliant++;
        else if (assessment.status === 'Partially Implemented') partial++;
        else if (assessment.status === 'Not Implemented') nonCompliant++;
      }
    });

    return { total, completed, compliant, partial, nonCompliant };
  }, [baselineControlIds, assessmentMap]);

  // Get current index in control list
  const currentIndex = useMemo(() => {
    if (!selectedControlId) return -1;
    return controlList.indexOf(selectedControlId);
  }, [controlList, selectedControlId]);

  // Load assessment data when control changes
  useEffect(() => {
    if (selectedControlId && assessmentMap.has(selectedControlId)) {
      const assessment = assessmentMap.get(selectedControlId)!;
      setStatus(assessment.status);
      setNotes(assessment.implementationNotes || '');
      setEvidence(assessment.evidence || '');
      setRemediationPlan(assessment.remediationPlan || '');
      setRiskLevel((assessment.riskLevel as RiskLevel) || '');
      setIsDirty(false);
    } else {
      // Reset to defaults for unassessed control
      setStatus('Not Assessed');
      setNotes('');
      setEvidence('');
      setRemediationPlan('');
      setRiskLevel('');
      setIsDirty(false);
    }
  }, [selectedControlId, assessmentMap]);

  // Auto-select first control if none selected
  useEffect(() => {
    if (!selectedControlId && controlList.length > 0) {
      setSelectedControlId(controlList[0]);
    }
  }, [selectedControlId, controlList]);

  // Mark as dirty when form changes
  const handleFormChange = useCallback(() => {
    setIsDirty(true);

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer (3 seconds)
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 3000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Save assessment
  const handleSave = useCallback(
    async (isAutoSave = false) => {
      if (!selectedControlId || !systemId || !productId) return;

      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      try {
        const existingAssessment = assessmentMap.get(selectedControlId);

        if (existingAssessment) {
          // Update existing
          await updateAssessment.mutateAsync({
            id: existingAssessment.id,
            updates: {
              status,
              implementationNotes: notes || undefined,
              evidence: evidence || undefined,
              remediationPlan: remediationPlan || undefined,
              riskLevel: riskLevel || undefined,
            },
          });
        } else {
          // Create new
          await createAssessment.mutateAsync({
            productId,
            systemId,
            controlId: selectedControlId,
            status,
            implementationNotes: notes || undefined,
            evidence: evidence || undefined,
            remediationPlan: remediationPlan || undefined,
            riskLevel: riskLevel || undefined,
          });
        }

        setIsDirty(false);
        if (!isAutoSave) {
          showNotification('Assessment saved', 'success');
        }
        refetchAssessments();
      } catch (error) {
        showNotification('Failed to save assessment', 'error');
      }
    },
    [
      selectedControlId,
      systemId,
      productId,
      status,
      notes,
      evidence,
      remediationPlan,
      riskLevel,
      assessmentMap,
      updateAssessment,
      createAssessment,
      showNotification,
      refetchAssessments,
    ]
  );

  // Navigate to previous control
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedControlId(controlList[currentIndex - 1]);
    }
  }, [currentIndex, controlList]);

  // Navigate to next control
  const goToNext = useCallback(() => {
    if (currentIndex < controlList.length - 1) {
      setSelectedControlId(controlList[currentIndex + 1]);
    }
  }, [currentIndex, controlList]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        // Only handle Ctrl+S for save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case '1':
          e.preventDefault();
          setStatus('Implemented');
          handleFormChange();
          break;
        case '2':
          e.preventDefault();
          setStatus('Partially Implemented');
          handleFormChange();
          break;
        case '3':
          e.preventDefault();
          setStatus('Not Implemented');
          handleFormChange();
          break;
        case '4':
          e.preventDefault();
          setStatus('Not Applicable');
          handleFormChange();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSave();
          }
          break;
        case '?':
          setShowKeyboardHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, handleSave, handleFormChange]);

  // Loading state
  if (productLoading || systemLoading || hierarchyLoading || assessmentsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (!product || !system) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load assessment workspace. Product or system not found.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  // No baseline configured
  if (baselineControlIds.size === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No CSF baseline configured for this product. Please configure a baseline before starting assessments.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(`/products/${productId}/baseline`)}
          sx={{ mt: 2 }}
        >
          Configure Baseline
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header with full hierarchy breadcrumbs */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        {/* Full hierarchy breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton size="small" onClick={() => navigate(`/org?scope=product&id=${productId}`)}>
            <BackIcon fontSize="small" />
          </IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: '0.875rem' }}>
            {product.framework?.capabilityCentre && (
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate(`/org?scope=cc&id=${product.framework!.capabilityCentre!.id}`)}
                sx={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: product.framework!.capabilityCentre!.color || 'primary.main'
                }}
              >
                <BusinessIcon sx={{ fontSize: 16 }} />
                {product.framework!.capabilityCentre!.name}
              </Link>
            )}
            {product.framework && (
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate(`/org?scope=framework&id=${product.framework!.id}`)}
                sx={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: product.framework!.color || 'secondary.main'
                }}
              >
                <FrameworkIcon sx={{ fontSize: 16 }} />
                {product.framework!.name}
              </Link>
            )}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/org?scope=product&id=${productId}`)}
              sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <ProductIcon sx={{ fontSize: 16 }} />
              {product.name}
            </Link>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
            >
              <SystemIcon sx={{ fontSize: 16 }} />
              {system.name}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* System navigation and actions row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ mr: 2 }}>Assessment Workspace</Typography>

            {/* System navigation */}
            {siblingSystemsList.length > 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', borderRadius: 1, px: 1, py: 0.5 }}>
                <Tooltip title={canGoPrevSystem ? `Previous: ${siblingSystemsList[currentSystemIndex - 1]?.name}` : 'No previous system'}>
                  <span>
                    <IconButton size="small" onClick={goToPrevSystem} disabled={!canGoPrevSystem}>
                      <PrevSystemIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, textAlign: 'center' }}>
                  System {currentSystemIndex + 1}/{siblingSystemsList.length}
                </Typography>
                <Tooltip title={canGoNextSystem ? `Next: ${siblingSystemsList[currentSystemIndex + 1]?.name}` : 'No next system'}>
                  <span>
                    <IconButton size="small" onClick={goToNextSystem} disabled={!canGoNextSystem}>
                      <NextSystemIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}

            {/* Environment chip */}
            <Chip
              label={system.environment}
              size="small"
              color={system.environment === 'PRODUCTION' ? 'error' : 'default'}
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Keyboard shortcuts (?)">
              <IconButton onClick={() => setShowKeyboardHelp((prev) => !prev)}>
                <KeyboardIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={updateAssessment.isPending || createAssessment.isPending ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={() => handleSave()}
              disabled={!isDirty || updateAssessment.isPending || createAssessment.isPending}
            >
              Save
            </Button>
          </Box>
        </Box>

        {/* Progress indicator */}
        <ProgressIndicator {...progressStats} />
      </Paper>

      {/* Keyboard help */}
      <Collapse in={showKeyboardHelp}>
        <Alert severity="info" onClose={() => setShowKeyboardHelp(false)} sx={{ borderRadius: 0 }}>
          <Typography variant="subtitle2" gutterBottom>
            Keyboard Shortcuts
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Typography variant="caption">
              <strong>j/↓</strong> Next control
            </Typography>
            <Typography variant="caption">
              <strong>k/↑</strong> Previous control
            </Typography>
            <Typography variant="caption">
              <strong>1</strong> Implemented
            </Typography>
            <Typography variant="caption">
              <strong>2</strong> Partial
            </Typography>
            <Typography variant="caption">
              <strong>3</strong> Not Implemented
            </Typography>
            <Typography variant="caption">
              <strong>4</strong> N/A
            </Typography>
            <Typography variant="caption">
              <strong>Ctrl+S</strong> Save
            </Typography>
          </Box>
        </Alert>
      </Collapse>

      {/* Main content - Three panel layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel - Control tree */}
        <Paper
          sx={{
            width: 280,
            flexShrink: 0,
            borderRadius: 0,
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">
              Controls ({progressStats.completed}/{progressStats.total})
            </Typography>
          </Box>
          {hierarchy && (
            <ControlTree
              hierarchy={hierarchy}
              assessments={assessmentMap}
              selectedControlId={selectedControlId}
              onSelectControl={setSelectedControlId}
              baselineControlIds={baselineControlIds}
            />
          )}
        </Paper>

        {/* Center panel - Assessment form */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {currentControl ? (
            <Box>
              {/* Control header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {currentControl.subcategory.code}
                </Typography>
                <Chip
                  size="small"
                  label={`${currentControl.function.name} (${currentControl.function.code})`}
                  sx={{ mr: 1 }}
                />
                <Chip size="small" label={currentControl.category.name} variant="outlined" />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {currentControl.subcategory.description}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Assessment form */}
              <Stack spacing={3}>
                {/* Status selection */}
                <FormControl fullWidth>
                  <InputLabel>Compliance Status</InputLabel>
                  <Select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as ComplianceStatus);
                      handleFormChange();
                    }}
                    label="Compliance Status"
                  >
                    {COMPLIANCE_STATUSES.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIcon status={s.value} size="medium" />
                          <Typography>{s.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                            ({s.shortcut})
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Risk level */}
                <FormControl fullWidth>
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={riskLevel}
                    onChange={(e) => {
                      setRiskLevel(e.target.value as RiskLevel | '');
                      handleFormChange();
                    }}
                    label="Risk Level"
                  >
                    <MenuItem value="">
                      <em>Not Set</em>
                    </MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Critical">Critical</MenuItem>
                  </Select>
                </FormControl>

                {/* Implementation notes */}
                <TextField
                  label="Implementation Notes"
                  multiline
                  rows={4}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    handleFormChange();
                  }}
                  placeholder="Describe the current implementation status, controls in place, or findings..."
                  fullWidth
                />

                {/* Evidence */}
                <TextField
                  label="Evidence"
                  multiline
                  rows={3}
                  value={evidence}
                  onChange={(e) => {
                    setEvidence(e.target.value);
                    handleFormChange();
                  }}
                  placeholder="List evidence items, documentation, or proof of implementation..."
                  fullWidth
                />

                {/* Remediation plan (show if not compliant) */}
                {(status === 'Not Implemented' || status === 'Partially Implemented') && (
                  <TextField
                    label="Remediation Plan"
                    multiline
                    rows={4}
                    value={remediationPlan}
                    onChange={(e) => {
                      setRemediationPlan(e.target.value);
                      handleFormChange();
                    }}
                    placeholder="Describe the plan to achieve compliance..."
                    fullWidth
                  />
                )}
              </Stack>

              {/* Navigation buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  startIcon={<PrevIcon />}
                  onClick={goToPrevious}
                  disabled={currentIndex <= 0}
                >
                  Previous
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {currentIndex + 1} of {controlList.length}
                </Typography>
                <Button
                  endIcon={<NextIcon />}
                  onClick={goToNext}
                  disabled={currentIndex >= controlList.length - 1}
                >
                  Next
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                Select a control from the list to begin assessment
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right panel - NIST 800-53 Mappings */}
        <Paper
          sx={{
            width: 300,
            flexShrink: 0,
            borderRadius: 0,
            borderLeft: 1,
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PolicyIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2">NIST 800-53 Mappings</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            {mappingsData && mappingsData.totalMappings > 0 ? (
              <>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {mappingsData.totalMappings} related controls
                </Typography>
                {mappingsData.familySummary.map((family) => (
                  <Box key={family.family || 'unknown'} sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight="bold">
                      {family.family || 'Other'} ({family.controlCount})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {family.controls.map((ctrl) => (
                        <Tooltip key={ctrl.id} title={`Priority: ${ctrl.priority || 'N/A'}`}>
                          <Chip
                            label={ctrl.nist80053Id}
                            size="small"
                            color={
                              ctrl.priority === 'P1'
                                ? 'error'
                                : ctrl.priority === 'P2'
                                ? 'warning'
                                : 'default'
                            }
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                ))}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {selectedControlId
                  ? 'No 800-53 mappings for this control'
                  : 'Select a control to view mappings'}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AssessmentWorkspace;
