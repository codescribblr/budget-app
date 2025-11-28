import AppHeader from '@/components/layout/AppHeader';
import { AIChatInterface } from '@/components/ai/AIChatInterface';

export default function AIAssistantPage() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="AI Assistant"
        subtitle="Get intelligent insights about your finances"
        showNavigation={false}
      />
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full max-w-4xl mx-auto">
          <AIChatInterface />
        </div>
      </div>
    </div>
  );
}

