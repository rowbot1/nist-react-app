/**
 * Save Status Context
 *
 * Provides global save status tracking for data persistence indicators.
 * Shows users when data is being saved, has been saved, or encountered errors.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusContextValue {
  saveState: SaveState;
  lastSaved: Date | null;
  errorMessage: string | null;
  startSaving: () => void;
  setSaved: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

const SaveStatusContext = createContext<SaveStatusContextValue | undefined>(undefined);

interface SaveStatusProviderProps {
  children: React.ReactNode;
}

export const SaveStatusProvider: React.FC<SaveStatusProviderProps> = ({ children }) => {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearResetTimeout = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  const startSaving = useCallback(() => {
    clearResetTimeout();
    setSaveState('saving');
    setErrorMessage(null);
  }, [clearResetTimeout]);

  const setSaved = useCallback(() => {
    clearResetTimeout();
    setSaveState('saved');
    setLastSaved(new Date());
    setErrorMessage(null);

    // Auto-reset to idle after 3 seconds
    resetTimeoutRef.current = setTimeout(() => {
      setSaveState('idle');
    }, 3000);
  }, [clearResetTimeout]);

  const setError = useCallback((message: string) => {
    clearResetTimeout();
    setSaveState('error');
    setErrorMessage(message);

    // Auto-reset to idle after 5 seconds
    resetTimeoutRef.current = setTimeout(() => {
      setSaveState('idle');
      setErrorMessage(null);
    }, 5000);
  }, [clearResetTimeout]);

  const reset = useCallback(() => {
    clearResetTimeout();
    setSaveState('idle');
    setErrorMessage(null);
  }, [clearResetTimeout]);

  const value: SaveStatusContextValue = {
    saveState,
    lastSaved,
    errorMessage,
    startSaving,
    setSaved,
    setError,
    reset,
  };

  return (
    <SaveStatusContext.Provider value={value}>
      {children}
    </SaveStatusContext.Provider>
  );
};

export const useSaveStatus = (): SaveStatusContextValue => {
  const context = useContext(SaveStatusContext);
  if (!context) {
    throw new Error('useSaveStatus must be used within a SaveStatusProvider');
  }
  return context;
};

export default SaveStatusContext;
