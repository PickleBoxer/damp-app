/**
 * Shared types for wizard step components
 */

import type { CreateProjectInput } from '@shared/types/project';

export interface WizardStepProps {
  formData: Partial<CreateProjectInput>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<CreateProjectInput>>>;
  onAutoAdvance?: (step: string) => void;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
