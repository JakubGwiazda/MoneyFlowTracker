// Request/Response dla OpenRouter API
export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface JsonSchemaProperty {
  type: string | string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchemaProperty | {
    type: string;
    properties: Record<string, JsonSchemaProperty>;
    required: string[];
    additionalProperties: boolean;
  };
  enum?: string[];
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export interface Choice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Domain models
export interface ClassificationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExpenseToClassify {
  description: string;
  amount: number;
  date?: string;
}

export interface ClassificationResult {
  categoryId: string | null;
  categoryName: string;
  confidence: number;
  isNewCategory: boolean;
  newCategoryName: string;
  reasoning: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Error types
export type ClassificationErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export class ClassificationError extends Error {
  constructor(
    message: string,
    public code: ClassificationErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}
