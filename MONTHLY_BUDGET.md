# Monthly Budget Amounts for Envelopes

Each budget category (envelope) now has a **Monthly Budget Amount** that you can set and edit. This amount is used by the "Use Monthly Amounts" button when allocating income to envelopes.

---

## 🎯 What is Monthly Budget Amount?

The **Monthly Budget Amount** is the target amount you want to allocate to each envelope every month. This represents your planned monthly spending or savings for that category.

### **Examples:**
- **Groceries**: $600/month
- **Utilities**: $250/month
- **Car Insurance**: $207.34/month
- **Entertainment**: $100/month
- **Emergency Fund**: $500/month

---

## ✏️ How to Set Monthly Budget Amounts

### **When Creating a New Category:**

1. Click **"Add Category"** button on the Dashboard
2. Enter the category name (e.g., "Groceries")
3. Enter the **Monthly Budget Amount** (e.g., 600.00)
4. Enter the starting balance (optional, default 0.00)
5. Click **"Add Category"**

### **When Editing an Existing Category:**

1. Find the category in the list
2. Click **"Edit"** button
3. Update the **Monthly Budget Amount** field
4. Click **"Save"**

---

## 🚀 How to Use Monthly Budget Amounts

### **Allocate to Envelopes Page:**

1. Go to **Money Movement** → **Allocate to Envelopes** tab
2. You'll see your available balance (Current Savings)
3. Click **"Use Monthly Amounts"** button
4. All allocation fields are automatically filled with each category's monthly budget amount
5. Review and adjust if needed
6. Click **"Allocate to Envelopes"**

### **Other Allocation Options:**

- **Distribute Proportionally**: Allocates your available balance proportionally based on monthly budget amounts
- **Split Evenly**: Divides available balance equally across all categories
- **Clear All**: Clears all allocation fields

---

## 📊 Viewing Monthly Budget Amounts

### **Dashboard - Budget Categories Card:**

The categories table shows:
- **Category Name**
- **Monthly** (your monthly budget amount)
- **Current Balance** (actual envelope balance)
- **Actions** (Edit/Delete buttons)

### **Totals Row:**
At the bottom of the categories table, you'll see:
- **Total Monthly Budget**: Sum of all monthly budget amounts
- **Total Current Balance**: Sum of all current envelope balances

---

## 💡 Use Cases

### **1. Regular Monthly Budgeting**

**Scenario**: You get paid monthly and want to allocate your income to envelopes.

**Steps:**
1. Set monthly budget amounts for all categories
2. When you get paid, go to Allocate to Envelopes
3. Click "Use Monthly Amounts"
4. Allocate to envelopes

**Result**: Each envelope gets its planned monthly amount!

---

### **2. Partial Income Allocation**

**Scenario**: You get paid bi-weekly and want to allocate proportionally.

**Steps:**
1. Set monthly budget amounts (full month targets)
2. When you get paid, go to Allocate to Envelopes
3. Click "Distribute Proportionally"
4. System allocates based on your available balance, proportional to monthly budgets

**Result**: Each envelope gets a proportional share based on its monthly budget!

---

### **3. Adjusting for Variable Income**

**Scenario**: Your income varies month to month.

**Steps:**
1. Set monthly budget amounts (ideal targets)
2. When you get paid, go to Allocate to Envelopes
3. Click "Use Monthly Amounts" to see full allocation
4. Manually adjust amounts based on actual income
5. Allocate to envelopes

**Result**: You can see your targets and adjust as needed!

---

### **4. Seasonal Budgets**

**Scenario**: Some expenses are higher in certain months.

**Steps:**
1. Edit category monthly budget amount for the current month
2. Example: Increase "Utilities" in winter, "Gifts" in December
3. Use "Use Monthly Amounts" to allocate
4. Next month, adjust back to normal

**Result**: Flexible budgeting that adapts to seasonal needs!

---

## 🔧 Technical Details

### **Database Storage:**

Monthly budget amounts are stored in the `categories` table:

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  monthly_amount REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

### **API Endpoints:**

**Create Category:**
```
POST /api/categories
Body: {
  name: "Groceries",
  monthly_amount: 600.00,
  current_balance: 0.00
}
```

**Update Category:**
```
PATCH /api/categories/{id}
Body: {
  name: "Groceries",
  monthly_amount: 650.00,
  current_balance: 420.08
}
```

### **UI Components:**

- **CategoryList.tsx**: Add/Edit dialogs with monthly budget field
- **AllocateIncome.tsx**: Uses `category.monthly_amount` for allocations
- **Dashboard.tsx**: Displays monthly budget amounts in table

---

## 📝 Best Practices

### **1. Start with Realistic Amounts**
- Review past spending to set realistic monthly budgets
- Don't set amounts too high or too low
- Adjust over time as you learn your spending patterns

### **2. Include All Regular Expenses**
- Monthly bills (utilities, insurance, subscriptions)
- Variable expenses (groceries, gas, entertainment)
- Savings goals (emergency fund, vacation, etc.)

### **3. Review and Adjust Regularly**
- Check monthly budget amounts quarterly
- Adjust for life changes (new job, moved, etc.)
- Update for inflation or changing costs

### **4. Use Zero-Based Budgeting**
- Set monthly budgets so total equals your monthly income
- Every dollar has a job
- Adjust if income changes

### **5. Track Actual vs. Budget**
- Compare current balances to monthly budgets
- Identify categories that are over/under budget
- Adjust spending or budgets accordingly

---

## 🎯 Example Budget Setup

Here's a sample monthly budget for a household:

| Category | Monthly Budget | Purpose |
|----------|----------------|---------|
| Groceries | $600 | Food and household items |
| Utilities | $250 | Electric, water, gas |
| Mortgage | $2,981 | Housing payment + insurance |
| Car Insurance | $207.34 | Auto insurance premium |
| Car Repairs | $342.92 | Maintenance fund |
| Gas | $200 | Fuel for vehicles |
| Internet | $75 | Home internet |
| Cell Phone | $115 | Mobile phone plan |
| Entertainment | $100 | Movies, dining out, hobbies |
| Gifts | $50 | Birthdays, holidays |
| Medical | $100 | Copays, prescriptions |
| Emergency Fund | $500 | Savings for emergencies |
| **TOTAL** | **$5,521.26** | **Monthly income target** |

---

## ✅ Summary

**Monthly Budget Amounts:**
- ✅ Set when creating new categories
- ✅ Edit anytime for existing categories
- ✅ Used by "Use Monthly Amounts" button
- ✅ Used for proportional distribution
- ✅ Displayed in dashboard table
- ✅ Stored in database (not hardcoded!)
- ✅ Flexible and adjustable

**Benefits:**
- 🎯 Quick allocation with one click
- 📊 Clear monthly spending targets
- 💰 Proportional distribution for partial income
- 🔄 Easy to adjust as needs change
- 📈 Track actual vs. budgeted amounts

---

## 🚀 Getting Started

1. **Review your current spending** (use Reports page)
2. **Set monthly budget amounts** for each category
3. **Test the allocation** using "Use Monthly Amounts"
4. **Adjust as needed** based on actual spending
5. **Repeat monthly** for consistent budgeting

---

Enjoy your flexible, non-hardcoded monthly budgeting! 🎉

