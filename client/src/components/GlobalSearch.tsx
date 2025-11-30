import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Business as ProductIcon,
  Computer as SystemIcon,
  Assessment as AssessmentIcon,
  Security as ControlIcon,
  KeyboardReturn as EnterIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useSystems } from '../hooks/useSystems';
import { useDebounce } from '../hooks/useDebounce';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'product' | 'system' | 'control' | 'assessment';
  title: string;
  subtitle?: string;
  path: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  product: <ProductIcon color="primary" />,
  system: <SystemIcon color="info" />,
  control: <ControlIcon color="success" />,
  assessment: <AssessmentIcon color="warning" />,
};

const typeLabels: Record<string, string> = {
  product: 'Product',
  system: 'System',
  control: 'Control',
  assessment: 'Assessment',
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: systems, isLoading: systemsLoading } = useSystems();

  const isLoading = productsLoading || systemsLoading;

  // Generate search results
  const results: SearchResult[] = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = debouncedQuery.toLowerCase();

    // Search products
    products?.forEach((product) => {
      if (
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: product.description || `${product.systemCount || 0} systems`,
          path: `/products/${product.id}`,
        });
      }
    });

    // Search systems
    systems?.forEach((system) => {
      if (
        system.name.toLowerCase().includes(lowerQuery) ||
        system.description?.toLowerCase().includes(lowerQuery) ||
        system.environment.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: system.id,
          type: 'system',
          title: system.name,
          subtitle: `${system.environment} - ${system.criticality}`,
          path: `/products/${system.productId}`,
        });
      }
    });

    return searchResults.slice(0, 10); // Limit to 10 results
  }, [debouncedQuery, products, systems]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(results[selectedIndex].path);
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [results, selectedIndex, navigate, onClose]
  );

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '15%',
          m: 0,
          borderRadius: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search products, systems, controls..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: isLoading ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : null,
            sx: {
              '& fieldset': { border: 'none' },
              fontSize: '1.1rem',
              py: 1,
            },
          }}
        />

        {query && (
          <>
            <Divider />
            {results.length > 0 ? (
              <List sx={{ py: 1, maxHeight: 400, overflow: 'auto' }}>
                {results.map((result, index) => (
                  <ListItem key={`${result.type}-${result.id}`} disablePadding>
                    <ListItemButton
                      selected={index === selectedIndex}
                      onClick={() => handleResultClick(result)}
                      sx={{
                        py: 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {typeIcons[result.type]}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">{result.title}</Typography>
                            <Chip
                              label={typeLabels[result.type]}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                        }
                        secondary={result.subtitle}
                        secondaryTypographyProps={{
                          noWrap: true,
                          sx: { maxWidth: '90%' },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No results found for "{query}"
                </Typography>
              </Box>
            )}

            <Divider />
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 1.5,
                bgcolor: 'grey.50',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  icon={<UpIcon sx={{ fontSize: 14 }} />}
                  label=""
                  size="small"
                  sx={{ height: 20, width: 24, '& .MuiChip-label': { px: 0 } }}
                />
                <Chip
                  icon={<DownIcon sx={{ fontSize: 14 }} />}
                  label=""
                  size="small"
                  sx={{ height: 20, width: 24, '& .MuiChip-label': { px: 0 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  Navigate
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  icon={<EnterIcon sx={{ fontSize: 14 }} />}
                  label=""
                  size="small"
                  sx={{ height: 20, width: 24, '& .MuiChip-label': { px: 0 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  Select
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="Esc"
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Close
                </Typography>
              </Box>
            </Box>
          </>
        )}

        {!query && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quick actions
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Products"
                icon={<ProductIcon />}
                onClick={() => {
                  navigate('/products');
                  onClose();
                }}
                clickable
              />
              <Chip
                label="Systems"
                icon={<SystemIcon />}
                onClick={() => {
                  navigate('/systems');
                  onClose();
                }}
                clickable
              />
              <Chip
                label="Analytics"
                onClick={() => {
                  navigate('/analytics');
                  onClose();
                }}
                clickable
              />
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
