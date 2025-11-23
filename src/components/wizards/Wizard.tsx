'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WizardProgress } from './WizardProgress';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

interface WizardProps {
  steps: string[];
  children: React.ReactNode[];
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
  isProcessing?: boolean;
}

export function Wizard({ steps, children, onComplete, onCancel, isProcessing = false }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <WizardProgress steps={steps} currentStep={currentStep} />

      {/* Current step content */}
      <div className="min-h-[400px]">
        {React.Children.toArray(children)[currentStep - 1]}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

