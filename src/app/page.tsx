'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  Target, 
  Shield, 
  Zap, 
  BarChart3,
  Crown,
  Check,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  Rocket,
  Brain,
  MessageSquare,
  Calendar,
  Layers,
  PiggyBank,
  LineChart,
  RefreshCw,
  Coins
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <Image 
              src="/icon.svg" 
              alt="Budget App" 
              width={40} 
              height={40}
              className="dark:hidden"
            />
            <Image 
              src="/icon-darkmode.svg" 
              alt="Budget App" 
              width={40} 
              height={40}
              className="hidden dark:block"
            />
            <span className="text-xl font-bold">Budget App</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Envelope Budgeting Made Simple
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Take Control of Your Money
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Simple, powerful envelope budgeting with AI-powered insights. 
            Track every dollar with confidence and get personalized financial advice.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup?plan=premium">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-4">Why Choose Budget App?</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Everything you need to master your finances
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Envelope Budgeting</CardTitle>
                <CardDescription>
                  Allocate every dollar to a category. Know exactly where your money goes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Smart Insights</CardTitle>
                <CardDescription>
                  Track spending trends and get actionable insights. Premium users get AI-powered analysis and personalized recommendations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Goal Tracking</CardTitle>
                <CardDescription>
                  Set savings goals and watch your progress. Stay motivated to reach your targets.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Quick transaction entry and instant updates. Spend less time budgeting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Powerful Reports</CardTitle>
                <CardDescription>
                  Visualize your spending with beautiful charts and detailed analytics.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your data is encrypted and secure. We never sell your information.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle>Multi-User Collaboration</CardTitle>
                <CardDescription>
                  Share budgets with family members or partners. Invite collaborators with custom permissions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle>PDF Statement Import</CardTitle>
                <CardDescription>
                  Import transactions directly from PDF bank statements. No manual data entry needed.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center mb-4">
                  <Rocket className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Budget Setup Wizard</CardTitle>
                <CardDescription>
                  Get started in minutes with our guided setup wizard. Create accounts and categories effortlessly.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Premium Feature Cards */}
            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Monthly Funding Tracking</CardTitle>
                <CardDescription>
                  Track how much you've funded to each category this month, separate from balances. Never refund already-paid bills.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Smart Allocation</CardTitle>
                <CardDescription>
                  Automatically allocate funds to categories based on priorities. Let the app handle your budget distribution intelligently.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
                  <PiggyBank className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Income Buffer</CardTitle>
                <CardDescription>
                  Smooth irregular income by storing large payments and releasing funds monthly. Perfect for freelancers and variable earners.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle>Retirement Planning & Net Worth</CardTitle>
                <CardDescription>
                  Project your financial future with comprehensive net worth forecasting. Plan for retirement with Social Security, RMDs, and distribution strategies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center mb-4">
                  <RefreshCw className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>Automatic Transaction Import</CardTitle>
                <CardDescription>
                  Connect your bank accounts via Teller IO for automatic transaction imports. No more manual data entry - transactions sync automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/50 relative">
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>
                  Get intelligent transaction categorization, personalized budget advice, and chat with an AI assistant that understands your finances.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Start free, upgrade when you need more
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription className="mt-2">
                  Perfect for getting started with budgeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Categories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>CSV & PDF Import</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Budget Setup Wizard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Multi-User Collaboration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Basic Reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Data Backup & Restore</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    Get Started Free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-4 py-1">
                  <Crown className="h-3 w-3 mr-1" />
                  POPULAR
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Premium
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$8.33</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription className="mt-2">
                  <span className="text-green-600 font-semibold">60-day free trial</span> · Billed annually as $100/year · All features unlocked
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold">Everything in Free, plus:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="flex items-center gap-1">
                      <Brain className="h-4 w-4 text-purple-500" />
                      AI Features
                    </span>
                  </li>
                  <li className="flex items-start gap-2 ml-6">
                    <span className="text-xs text-muted-foreground">• AI Chat Assistant</span>
                  </li>
                  <li className="flex items-start gap-2 ml-6">
                    <span className="text-xs text-muted-foreground">• AI Transaction Categorization</span>
                  </li>
                  <li className="flex items-start gap-2 ml-6">
                    <span className="text-xs text-muted-foreground">• AI Budget Insights & Reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Monthly Funding Tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Category Types & Priorities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Smart Allocation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Income Buffer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Goals & Debt Tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Loans Management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Retirement Planning & Net Worth Tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Automatic Transaction Import (powered by Teller IO)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Advanced Reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Priority Support</span>
                  </li>
                </ul>
                <Link href="/signup?plan=premium" className="block">
                  <Button
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                    size="lg"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Take Control?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who have transformed their financial lives
          </p>
          <Link href="/signup?plan=premium">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/icon.svg"
                  alt="Budget App"
                  width={32}
                  height={32}
                  className="dark:hidden"
                />
                <Image
                  src="/icon-darkmode.svg"
                  alt="Budget App"
                  width={32}
                  height={32}
                  className="hidden dark:block"
                />
                <span className="font-bold">Budget App</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Envelope budgeting made simple
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-muted-foreground hover:text-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Budget App. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}


