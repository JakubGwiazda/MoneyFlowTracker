/**
 * Shared TypeScript Types
 * Common types used across edge functions
 */

// OpenRouter API Types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: any;
  };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Classification Types
export interface Category {
  id: string;
  name: string;
}

export interface ExpenseToClassify {
  description: string;
  amount: number;
  date?: string;
}

// OCR Types
export interface ReceiptItem {
  name: string;
  price: number;
}
