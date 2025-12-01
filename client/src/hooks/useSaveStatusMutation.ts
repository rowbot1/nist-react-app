import { useMutation } from '@tanstack/react-query';
import { useSaveStatus } from '../contexts/SaveStatusContext';
import { System, Assessment } from '../types';

type SaveableData = Partial<System> | Partial<Assessment>;

type MutationFn = (data: SaveableData) => Promise<any>;

export const useSaveStatusMutation = (mutationFn: MutationFn) => {
  const { setSaved } = useSaveStatus();

  return useMutation({
    mutationFn: (data: SaveableData) => {
      return mutationFn(data);
    },
    onSuccess: () => {
      setSaved();
    },
  });
};