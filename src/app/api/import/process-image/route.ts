import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          message: 'Please add OPENAI_API_KEY to your .env.local file to use image import'
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/png';

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a financial transaction screenshot or statement. Extract all visible transactions and return them as a JSON array.

For each transaction, provide:
- date: Transaction date in YYYY-MM-DD format (if year not visible, use 2025)
- description: Full merchant/transaction description
- amount: Transaction amount as a positive number (no currency symbols, no negative signs)

Rules:
- Only extract actual transactions (ignore headers, totals, account balances)
- If amount is shown as debit/credit, use the debit amount (expenses)
- If date is partial (e.g., "Oct 15"), use 2025 as the year
- Clean up descriptions (remove extra spaces, location codes)
- Return empty array if no transactions found
- Do NOT include pending transactions or authorization holds

Return ONLY a valid JSON array with this exact structure:
[{"date": "2025-10-15", "description": "Merchant Name", "amount": 25.99}]

No other text, no markdown, just the JSON array.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from vision API');
    }

    // Parse the JSON response
    let transactions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      transactions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse vision API response:', content);
      throw new Error('Failed to parse transaction data from image');
    }

    if (!Array.isArray(transactions)) {
      throw new Error('Invalid response format from vision API');
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

