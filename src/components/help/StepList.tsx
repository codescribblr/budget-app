import React from 'react';

interface Step {
  title: string;
  content: React.ReactNode;
}

interface StepListProps {
  steps: Step[];
}

export function StepList({ steps }: StepListProps) {
  return (
    <div className="space-y-6 my-6">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {index + 1}
            </div>
          </div>
          <div className="flex-1 pt-1">
            <h3 className="font-semibold mb-2">{step.title}</h3>
            <div className="text-sm text-muted-foreground">{step.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


