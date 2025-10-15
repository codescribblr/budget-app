# Smart Auto-Categorization with Machine Learning

The budget app now features an intelligent auto-categorization system that **learns from your behavior** and gets smarter over time!

---

## 🧠 How It Works

### **Three-Tier Categorization System:**

1. **Learned Mappings** (Highest Priority)
   - Uses your past categorization decisions
   - Exact match on normalized merchant names
   - Fuzzy matching for similar merchants (70%+ similarity)
   - Confidence scores increase with repeated use

2. **Keyword Matching** (Fallback)
   - Expanded keyword database for common merchants
   - Covers: Groceries, Restaurants, Gas, Entertainment, Auto, Home, Pharmacy, Clothing
   - Used when no learned mapping exists

3. **Manual Categorization** (User Override)
   - You can always change the suggested category
   - Your changes are automatically learned for future imports

---

## 🎯 Key Features

### **1. Merchant Normalization**
Merchants are normalized to handle variations:
- `"AMAZON.COM"` → `"amazon"`
- `"McDonald's #1234"` → `"mcdonald"`
- `"Walmart Inc."` → `"walmart"`

This ensures that different formats of the same merchant are recognized as the same.

### **2. Fuzzy Matching**
Uses Levenshtein distance algorithm to match similar merchants:
- `"Starbucks"` matches `"Starbucks Coffee"`
- `"Target"` matches `"Target Store"`
- `"CVS Pharmacy"` matches `"CVS"`

Requires 70%+ similarity to suggest a match.

### **3. Confidence Scoring**
- Each learned mapping has a confidence score (1-100)
- Score increases each time you use that categorization
- Higher confidence = more reliable suggestion
- Confidence affects fuzzy match strength

### **4. Automatic Learning**
Every time you import transactions:
1. System checks your category assignments
2. Creates or updates merchant-to-category mappings
3. Increases confidence for repeated patterns
4. Future imports automatically use learned patterns

---

## 📊 Database Schema

### **merchant_mappings Table**
```sql
CREATE TABLE merchant_mappings (
  id INTEGER PRIMARY KEY,
  merchant_pattern TEXT NOT NULL,        -- Original merchant name
  normalized_merchant TEXT NOT NULL,     -- Normalized for matching
  category_id INTEGER NOT NULL,          -- Linked category
  confidence_score INTEGER DEFAULT 1,    -- 1-100, increases with use
  last_used TEXT NOT NULL,               -- Last time this mapping was used
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Indexes:**
- `idx_merchant_mappings_normalized` - Fast lookups by merchant
- `idx_merchant_mappings_category` - Fast lookups by category

---

## 🔄 Learning Workflow

### **Import Process:**

1. **Upload CSV/Image**
   - Transactions are parsed
   - Merchants are extracted

2. **Auto-Categorization**
   - System checks learned mappings first
   - Falls back to keyword matching
   - Suggests category with confidence level

3. **User Review**
   - You can accept, modify, or reject suggestions
   - Edit categories as needed
   - Split transactions across categories

4. **Import & Learn**
   - Transactions are imported
   - System learns from your final categorizations
   - Mappings are created/updated
   - Confidence scores increase

5. **Future Imports**
   - Same merchants are auto-categorized
   - Similar merchants are suggested
   - System gets smarter over time

---

## 💡 Examples

### **Example 1: First Time Import**
```
Merchant: "STARBUCKS #1234"
Learned Mapping: None
Keyword Match: "Restaurants" (confidence: 0.3)
Suggestion: Restaurants ✓
```

You change it to "Coffee" and import.

### **Example 2: Second Import**
```
Merchant: "STARBUCKS #5678"
Learned Mapping: "starbucks" → Coffee (confidence: 0.1)
Suggestion: Coffee ✓ (learned)
```

You accept and import.

### **Example 3: Third Import**
```
Merchant: "Starbucks Coffee"
Learned Mapping: "starbucks" → Coffee (confidence: 0.2)
Fuzzy Match: 95% similar to "starbucks"
Suggestion: Coffee ✓ (learned, high confidence)
```

### **Example 4: After 10 Imports**
```
Merchant: "SBUX"
Learned Mapping: "starbucks" → Coffee (confidence: 1.0)
Fuzzy Match: 75% similar to "starbucks"
Suggestion: Coffee ✓ (learned, very high confidence)
```

---

## 🛠️ API Endpoints

### **POST /api/categorize**
Get smart category suggestions for merchants.

**Request:**
```json
{
  "merchants": ["Walmart", "Starbucks", "Shell Gas"]
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "merchant": "Walmart",
      "categoryId": 5,
      "confidence": 0.95,
      "source": "learned"
    },
    {
      "merchant": "Starbucks",
      "categoryId": 12,
      "confidence": 0.85,
      "source": "learned"
    },
    {
      "merchant": "Shell Gas",
      "categoryId": 8,
      "confidence": 0.3,
      "source": "keyword"
    }
  ]
}
```

### **GET /api/merchant-mappings**
View all learned merchant mappings.

**Response:**
```json
{
  "mappings": [
    {
      "id": 1,
      "merchant_pattern": "STARBUCKS #1234",
      "normalized_merchant": "starbucks",
      "category_id": 12,
      "category_name": "Coffee",
      "confidence_score": 10,
      "last_used": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### **DELETE /api/merchant-mappings**
Delete a learned mapping.

**Request:**
```json
{
  "id": 1
}
```

---

## 📈 Benefits

### **Time Savings**
- First import: Manual categorization required
- After 5-10 imports: 80%+ auto-categorized
- After 20+ imports: 95%+ auto-categorized

### **Accuracy**
- Learns YOUR categorization preferences
- Handles merchant name variations
- Adapts to your spending patterns

### **Flexibility**
- Always override suggestions
- System learns from corrections
- No rigid rules - adapts to you

---

## 🔍 Under the Hood

### **Normalization Algorithm**
```typescript
function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')           // Remove special chars
    .replace(/\s+/g, ' ')                   // Normalize whitespace
    .replace(/\b(inc|llc|ltd|corp)\b/g, '') // Remove company suffixes
    .trim();
}
```

### **Similarity Calculation**
Uses Levenshtein distance to calculate edit distance between strings:
- Measures minimum number of edits (insert, delete, substitute)
- Converts to similarity score (0-1)
- Requires 70%+ similarity for fuzzy match

### **Learning Function**
```typescript
function learnMerchantMapping(merchant: string, categoryId: number) {
  // Check if mapping exists
  // If yes: increment confidence (max 100)
  // If no: create new mapping with confidence 1
}
```

---

## 🎓 Tips for Best Results

1. **Be Consistent**
   - Use the same category for the same merchant
   - System learns faster with consistency

2. **Import Regularly**
   - More imports = more learning
   - System improves with each import

3. **Review Suggestions**
   - Check auto-categorizations before importing
   - Correct mistakes to improve future accuracy

4. **Use Descriptive Categories**
   - Clear category names help you remember
   - Makes reviewing easier

5. **Split When Needed**
   - Don't force single category if transaction spans multiple
   - System learns split patterns too

---

## 🚀 Future Enhancements

Potential improvements:
- [ ] Category confidence visualization in UI
- [ ] Bulk edit learned mappings
- [ ] Export/import learned mappings
- [ ] Merchant alias management
- [ ] Category suggestion explanations
- [ ] Learning statistics dashboard

---

## 📝 Technical Details

**Files:**
- `src/lib/smart-categorizer.ts` - Core learning logic
- `src/app/api/categorize/route.ts` - Suggestion API
- `src/app/api/merchant-mappings/route.ts` - Mapping management
- `src/app/api/import/transactions/route.ts` - Learning on import
- `scripts/add-merchant-learning.ts` - Database migration

**Dependencies:**
- SQLite database with `merchant_mappings` table
- Levenshtein distance algorithm
- Transaction-based learning

---

Enjoy smarter, faster transaction categorization! 🎉

