import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { ExpenseDto } from '../../types';
import { updateExpenseClassification } from './expenses.service';
import { environment } from '../../environments/environment';

/**
 * Service for AI-powered expense classification using OpenRouter.ai
 */

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ClassificationResult {
  category_id: string | null;
  confidence: number | null;
  reasoning?: string;
}

/**
 * Schedules asynchronous AI classification for an expense.
 * This function is fire-and-forget - it doesn't block the API response.
 * 
 * @param expense - The expense to classify
 * @param supabase - Supabase client instance
 */
export function scheduleClassification(
  expense: ExpenseDto,
  supabase: SupabaseClient<Database>
): void {
  // Run classification asynchronously without blocking
  classifyExpenseAsync(expense, supabase).catch((error) => {
    console.error('Classification failed for expense:', expense.id, error);
  });
}

/**
 * Performs AI classification of an expense using OpenRouter.ai
 * 
 * @param expense - The expense to classify
 * @param supabase - Supabase client instance
 */
async function classifyExpenseAsync(
  expense: ExpenseDto,
  supabase: SupabaseClient<Database>
): Promise<void> {
  
  try {
    // Get available categories for classification
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true);

    if (categoriesError || !categories || categories.length === 0) {
      console.error('Failed to fetch categories for classification:', categoriesError);
      await updateExpenseClassification(expense.id, null, null, expense.user_id, supabase);
      return;
    }

    // Prepare classification request
    const result = await performAIClassification(expense, categories);
    
    // Update expense with classification results
    await updateExpenseClassification(
      expense.id,
      result.category_id,
      result.confidence,
      expense.user_id,
      supabase
    );

  } catch (error) {
    console.error('Classification process failed:', error);
    
    // Mark classification as failed
    try {
      await updateExpenseClassification(expense.id, null, null, expense.user_id, supabase);
    } catch (updateError) {
      console.error('Failed to mark classification as failed:', updateError);
    }
  }
}

/**
 * Calls OpenRouter.ai API to classify the expense
 * 
 * @param expense - The expense to classify
 * @param categories - Available categories for classification
 * @returns Classification result with category ID and confidence
 */
async function performAIClassification(
  expense: ExpenseDto,
  categories: Array<{ id: string; name: string }>
): Promise<ClassificationResult> {
  
  const apiKey = environment.openRouterApiKey;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Prepare categories list for the AI prompt
  const categoriesList = categories
    .map(cat => `- ${cat.name} (ID: ${cat.id})`)
    .join('\n');

  // Create AI prompt for classification
  const prompt = `
You are an expense classification AI. Classify the following expense into one of the available categories.

Expense Details:
- Name: "${expense.name}"
- Amount: ${expense.amount}
- Date: ${expense.expense_date}

Available Categories:
${categoriesList}

Please respond with a JSON object containing:
- category_id: The most appropriate category ID from the list above, or null if no good match
- confidence: A number between 0 and 1 indicating your confidence in the classification
- reasoning: Brief explanation of your choice

Example response:
{
  "category_id": "uuid-here",
  "confidence": 0.85,
  "reasoning": "This appears to be a grocery expense based on the name"
}
`;

  // Make request to OpenRouter.ai
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://moneyflowtracker.app', // Optional: your app's URL
      'X-Title': 'MoneyFlow Tracker' // Optional: your app's name
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo', // Using a cost-effective model
      messages: [
        {
          role: 'system',
          content: 'You are a helpful expense classification assistant. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3 // Lower temperature for more consistent results
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenRouterResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenRouter API');
  }

  // Parse AI response
  const aiResponse = data.choices[0].message.content;
  
  try {
    const result: ClassificationResult = JSON.parse(aiResponse);
    
    // Validate the response
    if (result.category_id && !categories.find(cat => cat.id === result.category_id)) {
      console.warn('AI returned invalid category ID, setting to null');
      result.category_id = null;
      result.confidence = 0;
    }

    // Ensure confidence is within valid range
    if (result.confidence !== null) {
      result.confidence = Math.max(0, Math.min(1, result.confidence));
    }

    return result;
    
  } catch (parseError) {
    console.error('Failed to parse AI response:', aiResponse, parseError);
    return {
      category_id: null,
      confidence: null,
      reasoning: 'Failed to parse AI response'
    };
  }
}

/**
 * Manually triggers re-classification of an existing expense.
 * This is used when user requests re-classification via API.
 * 
 * @param expenseId - The expense ID to re-classify
 * @param supabase - Supabase client instance
 */
export async function reclassifyExpense(
  expenseId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  
  // Get the expense details
  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (error || !expense) {
    throw new Error('EXPENSE_NOT_FOUND');
  }

  // Reset classification status to pending
  await supabase
    .from('expenses')
    .update({
      classification_status: 'pending',
      predicted_category_id: null,
      prediction_confidence: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', expenseId);

  // Schedule new classification
  scheduleClassification(expense as ExpenseDto, supabase);
}
