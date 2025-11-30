/**
 * User Session Context
 *
 * Tracks user activity and preferences across sessions to provide:
 * - "Continue Where You Left Off" functionality
 * - Recent activity tracking
 * - Last visited product/system
 * - Assessment progress
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export interface RecentActivity {
  id: string;
  type: 'assessment' | 'product' | 'system' | 'report';
  title: string;
  subtitle?: string;
  path: string;
  timestamp: number;
  productId?: string;
  systemId?: string;
  controlCode?: string;
}

export interface UserSessionState {
  lastProductId: string | null;
  lastSystemId: string | null;
  lastControlCode: string | null;
  lastPath: string | null;
  recentActivities: RecentActivity[];
  assessmentProgress: {
    productId: string;
    systemId: string;
    lastControlCode: string;
    timestamp: number;
  } | null;
  preferences: {
    sidebarCollapsed: boolean;
    defaultView: 'matrix' | 'list';
    showOnboardingHints: boolean;
  };
}

interface UserSessionContextType extends UserSessionState {
  // Track activity
  trackActivity: (activity: Omit<RecentActivity, 'id' | 'timestamp'>) => void;
  trackAssessmentProgress: (productId: string, systemId: string, controlCode: string) => void;

  // Setters
  setLastProduct: (productId: string) => void;
  setLastSystem: (systemId: string) => void;
  setLastPath: (path: string) => void;
  updatePreference: <K extends keyof UserSessionState['preferences']>(
    key: K,
    value: UserSessionState['preferences'][K]
  ) => void;

  // Utilities
  clearRecentActivities: () => void;
  clearAssessmentProgress: () => void;
  getResumeAssessmentPath: () => string | null;
  hasRecentActivity: () => boolean;
}

const STORAGE_KEY = 'nist-mapper-session';
const MAX_RECENT_ACTIVITIES = 10;

const defaultState: UserSessionState = {
  lastProductId: null,
  lastSystemId: null,
  lastControlCode: null,
  lastPath: null,
  recentActivities: [],
  assessmentProgress: null,
  preferences: {
    sidebarCollapsed: false,
    defaultView: 'matrix',
    showOnboardingHints: true,
  },
};

// Load state from localStorage
const loadState = (): UserSessionState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultState, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load user session state:', error);
  }
  return defaultState;
};

// Save state to localStorage
const saveState = (state: UserSessionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save user session state:', error);
  }
};

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export const UserSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UserSessionState>(loadState);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Track activity
  const trackActivity = useCallback((activity: Omit<RecentActivity, 'id' | 'timestamp'>) => {
    setState((prev) => {
      const newActivity: RecentActivity = {
        ...activity,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      // Remove duplicates (same path)
      const filtered = prev.recentActivities.filter((a) => a.path !== activity.path);

      return {
        ...prev,
        recentActivities: [newActivity, ...filtered].slice(0, MAX_RECENT_ACTIVITIES),
        lastPath: activity.path,
        lastProductId: activity.productId || prev.lastProductId,
        lastSystemId: activity.systemId || prev.lastSystemId,
        lastControlCode: activity.controlCode || prev.lastControlCode,
      };
    });
  }, []);

  // Track assessment progress
  const trackAssessmentProgress = useCallback(
    (productId: string, systemId: string, controlCode: string) => {
      setState((prev) => ({
        ...prev,
        assessmentProgress: {
          productId,
          systemId,
          lastControlCode: controlCode,
          timestamp: Date.now(),
        },
        lastProductId: productId,
        lastSystemId: systemId,
        lastControlCode: controlCode,
      }));
    },
    []
  );

  // Setters
  const setLastProduct = useCallback((productId: string) => {
    setState((prev) => ({ ...prev, lastProductId: productId }));
  }, []);

  const setLastSystem = useCallback((systemId: string) => {
    setState((prev) => ({ ...prev, lastSystemId: systemId }));
  }, []);

  const setLastPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, lastPath: path }));
  }, []);

  const updatePreference = useCallback(
    <K extends keyof UserSessionState['preferences']>(
      key: K,
      value: UserSessionState['preferences'][K]
    ) => {
      setState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, [key]: value },
      }));
    },
    []
  );

  // Utilities
  const clearRecentActivities = useCallback(() => {
    setState((prev) => ({ ...prev, recentActivities: [] }));
  }, []);

  const clearAssessmentProgress = useCallback(() => {
    setState((prev) => ({ ...prev, assessmentProgress: null }));
  }, []);

  const getResumeAssessmentPath = useCallback((): string | null => {
    if (!state.assessmentProgress) return null;

    const { productId, lastControlCode } = state.assessmentProgress;
    return `/products/${productId}/assessments?filter=${lastControlCode}`;
  }, [state.assessmentProgress]);

  const hasRecentActivity = useCallback((): boolean => {
    return state.recentActivities.length > 0;
  }, [state.recentActivities]);

  const value: UserSessionContextType = {
    ...state,
    trackActivity,
    trackAssessmentProgress,
    setLastProduct,
    setLastSystem,
    setLastPath,
    updatePreference,
    clearRecentActivities,
    clearAssessmentProgress,
    getResumeAssessmentPath,
    hasRecentActivity,
  };

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
};

export const useUserSession = (): UserSessionContextType => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
};

export default UserSessionContext;
