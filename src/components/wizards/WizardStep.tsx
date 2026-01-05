import React from 'react';

interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function WizardStep({ title, description, children }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}


