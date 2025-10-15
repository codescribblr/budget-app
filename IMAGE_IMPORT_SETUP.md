# Image Import Setup Guide

The budget app now supports importing transactions from screenshots, photos, and images using AI vision technology!

## What You Can Import

- 📱 **Mobile banking app screenshots**
- 🖼️ **Bank statement screenshots**
- 📄 **PDF statement pages** (converted to images)
- 🧾 **Receipt photos**
- 💳 **Credit card transaction history screenshots**

## Setup Instructions

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-...`)

### 2. Configure Your Environment

1. In the `budget-app` folder, copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

### 3. Start Importing!

1. Go to the Import page
2. Click "Choose File"
3. Select a screenshot or image
4. The AI will extract all transactions automatically
5. Review, edit, and import!

## How It Works

The app uses OpenAI's GPT-4 Vision model to:
- Analyze the image
- Extract transaction data (date, description, amount)
- Return structured JSON data
- Auto-categorize based on merchant names
- Check for duplicates
- Feed into the same preview/edit workflow as CSV imports

## Cost

OpenAI charges per API request:
- GPT-4 Vision: ~$0.01-0.03 per image (depending on size)
- Most bank statement screenshots cost less than $0.02 to process

## Privacy

- Images are sent to OpenAI's API for processing
- No images are stored permanently
- Only extracted transaction data is saved to your local database
- Your API key is stored locally in `.env.local` (never committed to git)

## Troubleshooting

### "OpenAI API key not configured" error
- Make sure you created `.env.local` (not `.env.local.example`)
- Verify your API key is correct
- Restart the dev server after adding the key

### No transactions found
- Make sure the image is clear and readable
- Try cropping to show only the transaction list
- Ensure transactions are visible (not cut off)

### Incorrect amounts or dates
- Use the edit feature to correct any mistakes
- The AI is very accurate but not perfect
- You can always manually edit before importing

## Tips for Best Results

✅ **DO:**
- Use clear, high-resolution screenshots
- Crop to show just the transaction list
- Ensure text is readable
- Include dates and amounts

❌ **DON'T:**
- Upload blurry or low-quality images
- Include multiple pages in one image
- Upload images with sensitive info you don't want processed

## Example Use Cases

1. **Quick Entry**: Screenshot your mobile banking app → Upload → Import
2. **Bulk Import**: Screenshot multiple pages of transaction history
3. **Receipt Tracking**: Photo of receipt → Extract transaction → Categorize
4. **Statement Review**: PDF statement → Screenshot pages → Import all

Enjoy easier transaction entry! 🎉

