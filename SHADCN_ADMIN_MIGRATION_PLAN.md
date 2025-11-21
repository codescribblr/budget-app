# Shadcn Admin Template Migration Plan

## Overview

This document outlines the plan to migrate the budget application to use the Shadcn Admin template layout. The migration will introduce a modern sidebar navigation, command palette, and improved theme support with system preference detection.

## Difficulty Assessment: **MODERATE** ⚠️

### Why Moderate Difficulty?

**Advantages:**
- ✅ Already using Next.js 15, React 19, shadcn/ui, and Tailwind CSS
- ✅ Dark mode CSS variables already defined
- ✅ `next-themes` package already installed
- ✅ Using App Router (compatible with template)
- ✅ Components already follow shadcn/ui patterns

**Challenges:**
- ⚠️ Need to replace header-based navigation with sidebar layout
- ⚠️ Need to add command palette component
- ⚠️ Need to set up ThemeProvider properly
- ⚠️ Need to update all pages to use new layout wrapper
- ⚠️ Need to migrate navigation logic from AppHeader to sidebar

**Estimated Time:** 4-6 hours for initial implementation + testing

---

## Migration Steps

### Phase 1: Setup & Branch Creation

#### 1.1 Create Feature Branch
```bash
git checkout -b feature/shadcn-admin-layout
```

#### 1.2 Install Additional Dependencies (if needed)
The template may require additional shadcn/ui components:
- `cmdk` (for command palette)
- `@radix-ui/react-avatar` (if not already installed)
- `@radix-ui/react-popover` (if not already installed)

Check what's needed after reviewing template structure.

---

### Phase 2: Theme Provider Setup

#### 2.1 Create Theme Provider Component
- Create `src/components/providers/theme-provider.tsx`
- Wrap application with ThemeProvider
- Configure to use system preference as default
- Add theme persistence

#### 2.2 Update Root Layout
- Add ThemeProvider to `src/app/layout.tsx`
- Ensure proper SSR handling for theme
- Add `suppressHydrationWarning` to `<html>` tag

#### 2.3 Create Theme Toggle Component
- Create `src/components/layout/theme-toggle.tsx`
- Support light/dark/system options
- Add to sidebar header

---

### Phase 3: Sidebar Layout Implementation

#### 3.1 Create Sidebar Component
- Create `src/components/layout/sidebar.tsx`
- Implement collapsible sidebar
- Add navigation items matching current routes:
  - Dashboard (/)
  - Transactions (/transactions)
  - Import (/import)
  - Money Movement (/money-movement)
  - Reports (/reports)
  - Reports → Trends (/reports/trends)
  - Income (/income)
  - Merchants (/merchants)
  - Category Rules (/category-rules)
  - Settings (/settings)
- Add user profile section with sign out
- Implement mobile responsive behavior

#### 3.2 Create Layout Wrapper Component
- Create `src/components/layout/app-layout.tsx`
- Combine sidebar + main content area
- Handle sidebar state (open/closed)
- Responsive breakpoints

#### 3.3 Update Root Layout
- Wrap authenticated pages with AppLayout
- Keep auth pages (login/signup) without sidebar
- Use middleware or layout groups to conditionally apply layout

---

### Phase 4: Command Palette Implementation

#### 4.1 Install cmdk Package
```bash
npx shadcn@latest add command
```

#### 4.2 Create Command Palette Component
- Create `src/components/layout/command-palette.tsx`
- Implement Cmd+K (Mac) / Ctrl+K (Windows) shortcut
- Add search functionality for:
  - Navigation (all routes)
  - Quick actions (if applicable)
- Style to match shadcn admin template

#### 4.3 Integrate Command Palette
- Add to AppLayout
- Ensure keyboard shortcut works globally
- Test accessibility

---

### Phase 5: Page Migration

#### 5.1 Update Page Components
For each page, remove `AppHeader` usage and rely on sidebar:
- `src/app/page.tsx` (Dashboard)
- `src/app/transactions/page.tsx`
- `src/app/import/page.tsx`
- `src/app/money-movement/page.tsx`
- `src/app/reports/page.tsx`
- `src/app/reports/trends/page.tsx`
- `src/app/income/page.tsx`
- `src/app/merchants/page.tsx`
- `src/app/category-rules/page.tsx`
- `src/app/settings/page.tsx`

#### 5.2 Create Page Header Component (Optional)
- Create `src/components/layout/page-header.tsx`
- For pages that need titles/subtitles/actions
- Keep it minimal, sidebar handles navigation

#### 5.3 Update Component Imports
- Remove `AppHeader` imports from all pages
- Update any navigation logic to use Next.js `Link` or `useRouter`

---

### Phase 6: Styling & Polish

#### 6.1 Update Global Styles
- Ensure sidebar CSS variables are properly defined
- Verify dark mode colors work correctly
- Test theme switching transitions

#### 6.2 Responsive Design
- Test mobile sidebar behavior
- Ensure sidebar collapses properly on small screens
- Test command palette on mobile

#### 6.3 Accessibility
- Ensure keyboard navigation works
- Test screen reader compatibility
- Verify ARIA labels are correct

---

### Phase 7: Testing & Refinement

#### 7.1 Functional Testing
- [ ] All navigation links work
- [ ] Theme switching works (light/dark/system)
- [ ] Command palette opens/closes correctly
- [ ] Sidebar collapses/expands properly
- [ ] Mobile menu works
- [ ] Sign out functionality works
- [ ] All pages render correctly

#### 7.2 Visual Testing
- [ ] Light theme looks correct
- [ ] Dark theme looks correct
- [ ] System preference detection works
- [ ] Transitions are smooth
- [ ] No layout shifts

#### 7.3 Cross-browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## File Structure After Migration

```
src/
├── app/
│   ├── layout.tsx (updated with ThemeProvider)
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   └── (dashboard)/
│       ├── layout.tsx (new - wraps with AppLayout)
│       ├── page.tsx
│       ├── transactions/
│       ├── import/
│       └── ...
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx (new)
│   │   ├── sidebar.tsx (new)
│   │   ├── command-palette.tsx (new)
│   │   ├── page-header.tsx (new, optional)
│   │   ├── theme-toggle.tsx (new)
│   │   └── AppHeader.tsx (deprecated, can be removed)
│   └── providers/
│       └── theme-provider.tsx (new)
```

---

## Key Components to Create/Modify

### New Components
1. **ThemeProvider** (`src/components/providers/theme-provider.tsx`)
   - Wrap app with next-themes ThemeProvider
   - Configure system preference as default

2. **Sidebar** (`src/components/layout/sidebar.tsx`)
   - Main navigation component
   - Collapsible, responsive
   - User profile section

3. **AppLayout** (`src/components/layout/app-layout.tsx`)
   - Combines sidebar + main content
   - Handles layout state

4. **CommandPalette** (`src/components/layout/command-palette.tsx`)
   - Global search/navigation
   - Cmd+K shortcut

5. **ThemeToggle** (`src/components/layout/theme-toggle.tsx`)
   - Theme switcher dropdown
   - Light/Dark/System options

### Modified Components
1. **Root Layout** (`src/app/layout.tsx`)
   - Add ThemeProvider wrapper
   - Add suppressHydrationWarning

2. **All Page Components**
   - Remove AppHeader usage
   - Rely on sidebar for navigation

---

## Theme Configuration

### System Preference Detection
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange={false}
>
  {children}
</ThemeProvider>
```

### CSS Variables
Already defined in `globals.css` - verify they work with sidebar:
- `--sidebar-*` variables are already defined
- Ensure proper contrast in both themes

---

## Navigation Mapping

Current routes → Sidebar navigation items:

| Route | Label | Icon (suggested) |
|-------|-------|------------------|
| `/` | Dashboard | LayoutDashboard |
| `/transactions` | Transactions | Receipt |
| `/import` | Import | Upload |
| `/money-movement` | Money Movement | ArrowLeftRight |
| `/reports` | Reports | FileText |
| `/reports/trends` | Trends | TrendingUp (sub-item) |
| `/income` | Income | DollarSign |
| `/merchants` | Merchants | Store |
| `/category-rules` | Category Rules | FolderTree |
| `/settings` | Settings | Settings |

---

## Rollback Plan

If issues arise:
1. Keep feature branch separate
2. Don't merge until fully tested
3. Can revert by checking out main branch
4. AppHeader component preserved until migration complete

---

## Success Criteria

✅ Sidebar navigation replaces header navigation  
✅ Command palette works (Cmd+K)  
✅ Theme switching works with system preference  
✅ All pages render correctly  
✅ Mobile responsive  
✅ No regressions in functionality  
✅ Tests pass locally  

---

## Next Steps After Migration

1. Gather user feedback
2. Consider adding breadcrumbs
3. Add keyboard shortcuts documentation
4. Consider adding sidebar favorites/pinned items
5. Add analytics for navigation patterns

---

## Resources

- [Shadcn Admin Template](https://www.shadcn.io/template/satnaing-shadcn-admin)
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [cmdk Documentation](https://cmdk.paco.me/)
- [shadcn/ui Sidebar Component](https://ui.shadcn.com/docs/components/sidebar)

---

## Notes

- The template uses Vite, but we're using Next.js - we'll adapt the components
- Focus on layout structure, not copying all template pages
- Keep existing functionality intact
- Prioritize accessibility and responsive design

