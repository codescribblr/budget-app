'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Callout } from '@/components/help/Callout';
import type {
  OnboardingScreen,
  OnboardingUserAction,
  ProposedCategory,
  ProposedPlan,
} from '@/lib/ai/onboarding/types';

interface Props {
  screen: OnboardingScreen;
  busy?: boolean;
  onAction: (action: OnboardingUserAction) => void;
}

export function OnboardingScreenRenderer({ screen, busy, onAction }: Props) {
  const [freeText, setFreeText] = useState('');
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() =>
    initialFormValues(screen)
  );
  const [plan, setPlan] = useState<ProposedPlan | null>(
    screen.type === 'review_plan' ? structuredClone(screen.plan) : null
  );

  // Reset local state when screen identity changes
  const screenKey = useMemo(
    () => `${screen.type}:${screen.title}:${JSON.stringify('plan' in screen ? screen.plan : null)}`,
    [screen]
  );

  useEffect(() => {
    setFreeText('');
    setFormValues(initialFormValues(screen));
    setPlan(screen.type === 'review_plan' ? structuredClone(screen.plan) : null);
  }, [screenKey, screen]);

  const submitFreeText = () => {
    if (!freeText.trim() || busy) return;
    onAction({ type: 'free_text', text: freeText.trim() });
  };

  return (
    <div className="space-y-5" key={screenKey}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{screen.title}</h2>
        {screen.body ? (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{screen.body}</p>
        ) : null}
      </div>

      {screen.type === 'choice' && (
        <div className="grid gap-3">
          {screen.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              onClick={() =>
                onAction({
                  type: 'choice',
                  optionId: option.id,
                  payload: option.payload,
                })
              }
              className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <div className="font-medium">{option.label}</div>
              {option.description ? (
                <div className="mt-1 text-sm text-muted-foreground">{option.description}</div>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {screen.type === 'form' && (
        <div className="space-y-4">
          {screen.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={String(formValues[field.id] ?? '')}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  disabled={busy}
                />
              ) : field.type === 'multiselect' ? (
                <div className="grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto rounded-lg border p-3">
                  {(field.options || []).map((opt) => {
                    const selected = new Set(
                      Array.isArray(formValues[field.id])
                        ? (formValues[field.id] as string[])
                        : []
                    );
                    const checked = selected.has(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${
                          checked ? 'border-primary bg-primary/10' : 'bg-background'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={busy}
                          onCheckedChange={(value) => {
                            const next = new Set(selected);
                            if (value) next.add(opt.value);
                            else next.delete(opt.value);
                            setFormValues((prev) => ({
                              ...prev,
                              [field.id]: Array.from(next),
                            }));
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : field.type === 'select' ? (
                <select
                  id={field.id}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={String(formValues[field.id] ?? '')}
                  disabled={busy}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.id}
                  type={field.type === 'money' ? 'number' : 'text'}
                  step={field.type === 'money' ? '0.01' : undefined}
                  placeholder={field.placeholder}
                  value={String(formValues[field.id] ?? '')}
                  disabled={busy}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                />
              )}
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          ))}
          <Button
            disabled={busy}
            onClick={() => onAction({ type: 'submit_form', values: formValues })}
          >
            {screen.submitLabel || 'Continue'}
          </Button>
        </div>
      )}

      {screen.type === 'review_plan' && plan && (
        <div className="space-y-4">
          {plan.notes ? <Callout type="info" title="About this plan">{plan.notes}</Callout> : null}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Accounts</h3>
            {plan.accounts.map((account, idx) => (
              <div key={`${account.name}-${idx}`} className="grid grid-cols-2 gap-2">
                <Input
                  value={account.name}
                  disabled={busy}
                  onChange={(e) => {
                    const accounts = [...plan.accounts];
                    accounts[idx] = { ...accounts[idx], name: e.target.value };
                    setPlan({ ...plan, accounts });
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={account.balance}
                  disabled={busy}
                  onChange={(e) => {
                    const accounts = [...plan.accounts];
                    accounts[idx] = {
                      ...accounts[idx],
                      balance: parseFloat(e.target.value) || 0,
                    };
                    setPlan({ ...plan, accounts });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Categories (monthly amounts)</h3>
            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {plan.categories.map((category, idx) => (
                <CategoryRow
                  key={`${category.name}-${idx}`}
                  category={category}
                  disabled={busy}
                  onChange={(next) => {
                    const categories = [...plan.categories];
                    categories[idx] = next;
                    setPlan({ ...plan, categories });
                  }}
                />
              ))}
            </div>
          </div>

          {plan.monthlyIncome != null ? (
            <div className="space-y-2">
              <Label>Monthly income used for suggestions</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.monthlyIncome}
                disabled={busy}
                onChange={(e) =>
                  setPlan({ ...plan, monthlyIncome: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          ) : null}

          {plan.goals && plan.goals.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Suggested goals</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {plan.goals.map((g) => (
                  <li key={g.name}>
                    {g.name}: ${g.target_amount.toFixed(0)} target
                    {g.monthly_contribution
                      ? ` (~$${g.monthly_contribution.toFixed(0)}/mo)`
                      : ''}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Goals require Premium. If you&apos;re on Free, we&apos;ll still create accounts and
                categories and skip goals.
              </p>
            </div>
          ) : null}

          <Button
            disabled={busy}
            onClick={() => onAction({ type: 'confirm_plan', plan })}
            className="w-full sm:w-auto"
          >
            {screen.confirmLabel || 'Create my budget'}
          </Button>
        </div>
      )}

      {screen.type === 'next_steps' && (
        <div className="space-y-3">
          {screen.steps.map((step) => {
            const isPrimary = step.id === 'log-spending';
            const isSecondary = step.id === 'fund';
            const isCollapsed =
              step.id === 'import-later' || step.id === 'concepts' || step.id === 'habit-guide';
            return (
              <div
                key={step.id}
                className={
                  isPrimary
                    ? 'rounded-lg border-2 border-primary/40 bg-primary/5 p-4'
                    : isCollapsed
                      ? 'rounded-lg border border-dashed p-3'
                      : 'rounded-lg border p-4'
                }
              >
                <h3 className={isPrimary ? 'font-semibold' : 'font-medium'}>{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                {step.href ? (
                  <Button
                    asChild
                    variant={isPrimary ? 'default' : isSecondary ? 'outline' : 'ghost'}
                    size="sm"
                    className="mt-3"
                  >
                    <Link href={step.href}>{step.ctaLabel || 'Open'}</Link>
                  </Button>
                ) : null}
              </div>
            );
          })}
          <Button disabled={busy} onClick={() => onAction({ type: 'done' })}>
            {screen.doneLabel || 'Go to dashboard'}
          </Button>
        </div>
      )}

      {screen.type === 'done' && (
        <div className="space-y-3">
          {screen.summary ? (
            <p className="text-sm text-muted-foreground">{screen.summary}</p>
          ) : null}
          <Button disabled={busy} onClick={() => onAction({ type: 'done' })}>
            Go to dashboard
          </Button>
        </div>
      )}

      {screen.allowFreeText ? (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="onboarding-free-text">Tell us more (optional)</Label>
          <Textarea
            id="onboarding-free-text"
            placeholder={
              screen.freeTextPlaceholder ||
              'Describe your goals or situation in your own words…'
            }
            value={freeText}
            disabled={busy}
            onChange={(e) => setFreeText(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !freeText.trim()}
            onClick={submitFreeText}
          >
            Use this description
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CategoryRow({
  category,
  disabled,
  onChange,
}: {
  category: ProposedCategory;
  disabled?: boolean;
  onChange: (next: ProposedCategory) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_120px] gap-2">
      <Input
        value={category.name}
        disabled={disabled}
        onChange={(e) => onChange({ ...category, name: e.target.value })}
      />
      <Input
        type="number"
        step="0.01"
        value={category.monthly_amount}
        disabled={disabled}
        onChange={(e) =>
          onChange({ ...category, monthly_amount: parseFloat(e.target.value) || 0 })
        }
      />
    </div>
  );
}

function initialFormValues(screen: OnboardingScreen): Record<string, unknown> {
  if (screen.type !== 'form') return {};
  const values: Record<string, unknown> = {};
  for (const field of screen.fields) {
    if (field.defaultValue !== undefined) values[field.id] = field.defaultValue;
    else if (field.type === 'multiselect') values[field.id] = [];
    else values[field.id] = '';
  }
  return values;
}
