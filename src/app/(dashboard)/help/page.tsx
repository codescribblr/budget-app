import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  MessageCircleQuestion,
  LifeBuoy,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpSearch } from '@/components/help/HelpSearch';

const sections = [
  {
    title: 'Getting Started',
    description: 'New to envelope budgeting? Start here to learn the basics.',
    icon: BookOpen,
    href: '/help/getting-started/welcome',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    title: 'Features',
    description: 'Detailed documentation for all features in the app.',
    icon: Layers,
    href: '/help/features/dashboard',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    title: 'Tutorials',
    description: 'Step-by-step guides to help you accomplish specific tasks.',
    icon: GraduationCap,
    href: '/help/tutorials/first-budget',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    title: 'Wizards',
    description: 'Interactive setup wizards to guide you through complex features.',
    icon: Sparkles,
    href: '/help/wizards/budget-setup',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  {
    title: 'FAQ',
    description: 'Answers to frequently asked questions.',
    icon: MessageCircleQuestion,
    href: '/help/faq/general',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    title: 'Support',
    description: 'Get help, report bugs, or request new features.',
    icon: LifeBuoy,
    href: '/help/support/contact',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
];

const popularArticles = [
  { title: 'Quick Start Guide', href: '/help/getting-started/quick-start' },
  { title: 'Understanding Core Concepts', href: '/help/getting-started/core-concepts' },
  { title: 'Setting Up Your First Budget', href: '/help/tutorials/first-budget' },
  { title: 'Importing Transactions', href: '/help/tutorials/importing' },
  { title: 'Managing Irregular Income', href: '/help/tutorials/irregular-income' },
  { title: 'What is Available to Save?', href: '/help/faq/envelope-budgeting' },
];

export default function HelpCenterPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Help Center</CardTitle>
          <CardDescription>
            Everything you need to know about managing your budget with envelope budgeting.
            Whether you're just getting started or looking to master advanced features, we've got you covered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HelpSearch />
        </CardContent>
      </Card>

      {/* Main Sections Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-primary font-medium">
                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Popular Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Articles</CardTitle>
          <CardDescription>
            Most frequently viewed help articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {popularArticles.map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="block p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{article.title}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/help/support/contact">
              <LifeBuoy className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/help/support/report-bug">
              Report a Bug
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/help/support/feature-request">
              Request a Feature
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

