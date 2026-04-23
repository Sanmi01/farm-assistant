import { useState, useCallback } from "react";

export interface UseFormStepsOptions {
  totalSteps: number;
  validateStep?: (step: number) => boolean | Promise<boolean>;
}

export function useFormSteps({ totalSteps, validateStep }: UseFormStepsOptions) {
  const [currentStep, setCurrentStep] = useState(1);

  const goNext = useCallback(async () => {
    if (validateStep) {
      const ok = await validateStep(currentStep);
      if (!ok) return;
    }
    setCurrentStep((step) => Math.min(step + 1, totalSteps));
  }, [currentStep, totalSteps, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }, []);

  const goTo = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(1, Math.min(step, totalSteps)));
    },
    [totalSteps],
  );

  const isFirst = currentStep === 1;
  const isLast = currentStep === totalSteps;

  return {
    currentStep,
    totalSteps,
    goNext,
    goBack,
    goTo,
    isFirst,
    isLast,
  };
}