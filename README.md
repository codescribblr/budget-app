# Budget App

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

A modern, open-source budget tracking application built with Next.js and Supabase. Take control of your finances with envelope budgeting, transaction tracking, and powerful analytics.

> **Note**: This is an active development project. Features are being added regularly. See [Issues](https://github.com/codescribblr/budget-app/issues) for planned features and known bugs.

## ✨ Why This App?

- **🔒 Privacy First**: Your data stays yours. Self-host or use the official hosted version.
- **💰 Envelope Budgeting**: Proven method for managing money and avoiding overspending
- **📊 Powerful Analytics**: Understand your spending patterns with detailed reports
- **🎯 Goal Tracking**: Set and track financial goals
- **📱 Mobile Friendly**: Works seamlessly on desktop and mobile devices
- **🆓 Free & Open Source**: AGPL-3.0 licensed, community-driven development

## 🚀 Features

### Core Budgeting
- **📊 Envelope Budgeting System**: Allocate money to categories (envelopes) and track spending
- **💳 Transaction Management**: Add, edit, and categorize transactions with split support
- **🏦 Account Tracking**: Monitor multiple bank accounts and credit cards
- **📝 Pending Checks**: Track outstanding checks that affect your balance
- **🎯 Goals**: Set and track savings goals with progress visualization
- **💰 Loans**: Track loans and include them in net worth calculations

### Money Management
- **🔄 Income Allocation**: Distribute paychecks across budget categories
  - Manual allocation with live preview
  - Proportional distribution based on budget ratios
  - Quick allocation using monthly amounts
- **↔️ Envelope Transfers**: Move money between categories as needed
- **💵 Income Buffer**: Build a buffer to break the paycheck-to-paycheck cycle

### Analytics & Insights
- **📈 Spending Reports**: Analyze spending by category with visual charts
- **🏪 Merchant Tracking**: Automatic merchant grouping and categorization
- **📊 Trends Analysis**: View spending trends over time
- **🔍 Advanced Search**: Find transactions quickly with powerful filters
- **📅 Date Range Filtering**: Analyze by week, month, quarter, year, or custom range

### Data Management
- **📥 CSV Import**: Import transactions from bank exports with smart mapping
- **🔄 Auto-Categorization**: Learns from your categorization patterns
- **💾 Backup & Restore**: Export and import your complete financial data
- **🔐 Data Privacy**: Your data is protected with Row Level Security (RLS)

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI primitives
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/) for data visualization
- **Deployment**: [Vercel](https://vercel.com/) with automated CI/CD
- **Development**: Turbopack for fast refresh

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or pnpm package manager
- A Supabase account (free tier available)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/codescribblr/budget-app.git
cd budget-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. **Run database migrations**

```bash
npm run migrate
```

This will set up all the necessary database tables and Row Level Security policies.

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) and create an account to get started!

### 📱 Access from Mobile
To access from your phone on the same network:
1. Find your computer's local IP address
2. On your phone, navigate to `http://[YOUR-IP]:3000`
3. Example: `http://192.168.1.100:3000`

## 📊 Screenshots

> Screenshots coming soon! The app includes:
> - Dashboard with financial overview
> - Transaction management with category splits
> - Budget allocation interface
> - Spending reports and analytics
> - Goal tracking
> - CSV import wizard

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Found a bug? [Open an issue](https://github.com/codescribblr/budget-app/issues/new?template=bug_report.md)
2. **Request Features**: Have an idea? [Submit a feature request](https://github.com/codescribblr/budget-app/issues/new?template=feature_request.md)
3. **Ask Questions**: Need help? [Start a discussion](https://github.com/codescribblr/budget-app/discussions)
4. **Submit PRs**: Want to contribute code? Check out our [Contributing Guide](CONTRIBUTING.md)

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🔒 Security

Found a security vulnerability? Please report it privately using [GitHub Security Advisories](https://github.com/codescribblr/budget-app/security/advisories/new). See [SECURITY.md](SECURITY.md) for more details.

## 💾 Data Management

### Backup & Restore
The app includes built-in backup and restore functionality:
- Export your complete financial data as JSON
- Import data from previous backups
- Transfer data between accounts

Access these features in **Settings → Backup & Restore**.

## 📖 How It Works

### Envelope Budgeting System
This application uses the proven envelope budgeting method:

1. **💰 Receive Income**: Add your paychecks or other income
2. **📊 Allocate to Envelopes**: Distribute money into virtual "envelopes" (budget categories)
3. **💳 Track Spending**: When you spend, money comes out of the appropriate envelope(s)
4. **📈 Monitor Balances**: See how much budget remains in each category

### Key Concepts

**Available to Save**
```
Available to Save = Total Account Balances - Total Allocated to Envelopes - Credit Card Balances - Pending Checks
```

**Transaction Flow**
1. Add a transaction with category splits
2. Envelope balances automatically decrease
3. Edit or delete transactions to adjust balances
4. View spending history and patterns

**Income Buffer**
- Build a buffer of 1-2 months of expenses
- Break the paycheck-to-paycheck cycle
- Use this month's income for next month's expenses

## 📜 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 📝 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### What This Means

- ✅ **You can**: Use, modify, and distribute this software freely
- ✅ **You can**: Run your own instance for personal or commercial use
- ✅ **You must**: Share your source code if you modify and distribute it
- ✅ **You must**: Share your source code if you run it as a public service
- ✅ **You must**: Keep the same AGPL-3.0 license for derivative works

The AGPL-3.0 license ensures that improvements to this software benefit the entire community. If you run a modified version as a web service, you must make your source code available to users.

For commercial licensing options or questions, please [open a discussion](https://github.com/codescribblr/budget-app/discussions).

See [LICENSE](LICENSE) for the full license text.

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open Source Firebase Alternative
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components

## 📞 Support

- 📚 **Documentation**: Check the [in-app help center](https://github.com/codescribblr/budget-app#getting-started)
- 💬 **Questions**: [GitHub Discussions](https://github.com/codescribblr/budget-app/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/codescribblr/budget-app/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/codescribblr/budget-app/issues)

---

**Made with ❤️ by [Jonathan Wadsworth](https://github.com/codescribblr)**

If you find this project helpful, please consider giving it a ⭐️ on GitHub!
