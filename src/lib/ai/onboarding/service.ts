import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from '@/lib/ai/constants';
import { createClient } from '@/lib/supabase/server';
import { fallbackTurn, initialOnboardingState } from './fallback';
import { buildOnboardingSystemPrompt, buildOnboardingUserPrompt } from './prompts';
import { applyOnboardingPlan, markOnboardingSkipped } from './tools';
import type {
  OnboardingScreen,
  OnboardingSessionState,
  OnboardingTurnRequest,
  OnboardingTurnResponse,
  OnboardingUserAction,
  ProposedPlan,
} from './types';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

function isScreen(value: unknown): value is OnboardingScreen {
  if (!value || typeof value !== 'object') return false;
  const t = (value as OnboardingScreen).type;
  return (
    t === 'choice' ||
    t === 'form' ||
    t === 'review_plan' ||
    t === 'next_steps' ||
    t === 'done'
  );
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model response');
  return JSON.parse(raw.slice(start, end + 1));
}

async function askGemini(
  state: OnboardingSessionState,
  action: OnboardingUserAction
): Promise<{ screen: OnboardingScreen; statePatch?: Partial<OnboardingSessionState> } | null> {
  if (!API_KEY) return null;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.pro });
    const prompt = `${buildOnboardingSystemPrompt()}\n\n${buildOnboardingUserPrompt(state, action)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson(text) as {
      screen?: unknown;
      statePatch?: Partial<OnboardingSessionState>;
    };
    if (!isScreen(parsed.screen)) return null;
    return { screen: parsed.screen, statePatch: parsed.statePatch };
  } catch (error) {
    console.warn('Onboarding Gemini turn failed, using fallback:', error);
    return null;
  }
}

async function loadOrCreateConversation(
  userId: string,
  accountId: number,
  conversationId?: string | null
): Promise<{ id: string; messages: any[]; state: OnboardingSessionState }> {
  const supabase = await createClient();

  if (conversationId) {
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, messages')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (data) {
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const stateMsg = [...messages].reverse().find((m) => m?.role === 'state' && m?.state);
      return {
        id: data.id,
        messages,
        state: { ...initialOnboardingState(), ...(stateMsg?.state || {}) },
      };
    }
  }

  // Resume active onboarding session if present
  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('id, messages')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('kind', 'onboarding')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const messages = Array.isArray(existing.messages) ? existing.messages : [];
    const stateMsg = [...messages].reverse().find((m) => m?.role === 'state' && m?.state);
    return {
      id: existing.id,
      messages,
      state: { ...initialOnboardingState(), ...(stateMsg?.state || {}) },
    };
  }

  const { data: created, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      account_id: accountId,
      title: 'Budget onboarding',
      kind: 'onboarding',
      messages: [],
    })
    .select('id, messages')
    .single();

  if (error || !created) {
    // kind column may be missing before migration — retry without kind
    const { data: createdFallback, error: err2 } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        account_id: accountId,
        title: '[onboarding] Budget onboarding',
        messages: [],
      })
      .select('id, messages')
      .single();
    if (err2 || !createdFallback) {
      throw new Error(error?.message || err2?.message || 'Failed to create onboarding conversation');
    }
    return { id: createdFallback.id, messages: [], state: initialOnboardingState() };
  }

  return { id: created.id, messages: [], state: initialOnboardingState() };
}

async function persistConversation(
  conversationId: string,
  messages: any[],
  state: OnboardingSessionState
): Promise<void> {
  const supabase = await createClient();
  const nextMessages = [
    ...messages,
    { role: 'state', state, timestamp: new Date().toISOString() },
  ].slice(-40);

  await supabase
    .from('ai_conversations')
    .update({ messages: nextMessages, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function handleOnboardingTurn(
  userId: string,
  accountId: number,
  request: OnboardingTurnRequest
): Promise<OnboardingTurnResponse> {
  const action = request.action;
  const conversation = await loadOrCreateConversation(userId, accountId, request.conversationId);
  let state: OnboardingSessionState = {
    ...conversation.state,
    ...(request.state || {}),
  };

  let applied: OnboardingTurnResponse['applied'];
  let usedFallback = false;

  if (action.type === 'skip') {
    await markOnboardingSkipped(accountId, userId);
    const result = fallbackTurn(state, action);
    await persistConversation(conversation.id, conversation.messages, result.state);
    return {
      conversationId: conversation.id,
      screen: result.screen,
      state: result.state,
      usedFallback: true,
    };
  }

  if (action.type === 'confirm_plan') {
    const plan: ProposedPlan = action.plan;
    const applyResult = await applyOnboardingPlan(userId, accountId, plan);
    applied = {
      accountsCreated: applyResult.accountsCreated,
      categoriesCreated: applyResult.categoriesCreated,
      goalsCreated: applyResult.goalsCreated,
      settingsUpdated: applyResult.settingsUpdated,
    };
    state = {
      ...state,
      plan,
      applied: true,
      goalsCreated: applyResult.goalsCreated > 0,
      stage: 'next_steps',
    };
  }

  // Prefer Gemini for discovery turns (skip/confirm handled above / via fallback apply path)
  let screen: OnboardingScreen | null = null;
  if (action.type !== 'confirm_plan') {
    const gemini = await askGemini(state, action);
    if (gemini) {
      screen = gemini.screen;
      if (gemini.statePatch) {
        state = { ...state, ...gemini.statePatch };
      }
    }
  }

  if (!screen) {
    usedFallback = true;
    const result = fallbackTurn(state, action);
    screen = result.screen;
    state = result.state;
  }

  // If Gemini returned review_plan without a plan after finances, ensure plan exists via fallback builder
  if (screen.type === 'review_plan' && !screen.plan?.categories?.length) {
    usedFallback = true;
    const result = fallbackTurn(state, { type: 'submit_form', values: { categories: state.selectedCategories || [] } });
    screen = result.screen;
    state = result.state;
  }

  const messages = [
    ...conversation.messages,
    { role: 'user', content: JSON.stringify(action), timestamp: new Date().toISOString() },
    { role: 'assistant', content: JSON.stringify(screen), timestamp: new Date().toISOString() },
  ];
  await persistConversation(conversation.id, messages, state);

  return {
    conversationId: conversation.id,
    screen,
    state,
    applied,
    usedFallback,
  };
}
