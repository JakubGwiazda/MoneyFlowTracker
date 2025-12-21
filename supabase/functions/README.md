# MoneyFlowTracker Edge Functions

Supabase Edge Functions for MoneyFlowTracker application.

## Structure

```
supabase/functions/
├── _shared/                      # Shared utilities (reusable code)
│   ├── auth.ts                   # Authentication verification
│   ├── cors.ts                   # CORS and HTTP response helpers
│   ├── openrouter.ts             # OpenRouter API client
│   └── types.ts                  # TypeScript types
│
├── expense-classification/       # Expense classification function
│   ├── index.ts                  # Main handler
│   ├── classification.ts         # Classification logic
│   └── deno.json                 # Deno configuration
│
├── receipt-ocr/                  # Receipt OCR function
│   ├── index.ts                  # Main handler
│   ├── ocr.ts                    # OCR logic
│   └── deno.json                 # Deno configuration
│
└── README.md                     # This file
```

## Functions

### 1. expense-classification

**Endpoint**: `/functions/v1/expense-classification`

**Purpose**: Classifies expenses using AI (OpenRouter)

**Methods**:

- `single` - Classify one expense
- `batch` - Classify multiple expenses at once

**Request (single)**:

```json
{
  "type": "single",
  "description": "Mleko 2%"
}
```

**Request (batch)**:

```json
{
  "type": "batch",
  "expenses": [
    { "description": "Mleko 2%", "amount": 3.99 },
    { "description": "Chleb", "amount": 2.5 }
  ]
}
```

**Model**: `openai/gpt-4o-mini`

---

### 2. receipt-ocr

**Endpoint**: `/functions/v1/receipt-ocr`

**Purpose**: Extracts items from receipt images using Vision AI

**Request**:

```json
{
  "image": "base64_encoded_jpeg_image"
}
```

**Response**:

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"items\": [{\"name\": \"Mleko 2%\", \"price\": 3.99}, ...]}"
      }
    }
  ]
}
```

**Model**: `anthropic/claude-3.5-sonnet`

---

## Shared Utilities

### auth.ts

- `verifyAuth(authHeader)` - Verifies Supabase JWT token
- Returns: `{ user, supabaseClient }`

### cors.ts

- `handleCors(req)` - Handles CORS preflight
- `errorResponse(error, status)` - Creates error response
- `successResponse(data)` - Creates success response

### openrouter.ts

- `callOpenRouter(request, apiKey, referer)` - Calls OpenRouter API
- `validateApiKey(apiKey)` - Validates API key exists

### types.ts

- TypeScript types for OpenRouter API
- Common types used across functions

---

## Deployment

### Deploy all functions:

```bash
supabase functions deploy
```

### Deploy specific function:

```bash
supabase functions deploy expense-classification
supabase functions deploy receipt-ocr
```

### Local development:

```bash
# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve expense-classification --env-file .env.local
supabase functions serve receipt-ocr --env-file .env.local
```

---

## Environment Variables

Required for both functions:

- `OPENROUTER_API_KEY` - OpenRouter API key
- `SUPABASE_URL` or `SUPA_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` or `SUPA_ANON_KEY` - Supabase anonymous key

---

## Architecture Benefits

### Separation of Concerns

- Each function has one clear responsibility
- OCR and classification are independently deployable
- Easier to understand and maintain

### Scalability

- Independent scaling per function
- OCR can have different timeout/memory limits
- Different rate limits per function

### Cost Management

- Track costs per function
- OCR is more expensive (vision models)
- Classification is cheaper (text models)

### Monitoring

- Separate logs for each function
- Easier debugging
- Independent metrics

---

## Migration from Old Structure

**Old endpoint**: `/functions/v1/openrouter_integration`

- Required `type` parameter: `single`, `batch`, or `ocr`

**New endpoints**:

- `/functions/v1/expense-classification` - for classification (single/batch)
- `/functions/v1/receipt-ocr` - for OCR

**Frontend changes**:

- Update `ReceiptOcrService` to use `/receipt-ocr`
- Update `ClassificationService` to use `/expense-classification`
- Remove `type` parameter from OCR requests

---

## Testing

### Test expense-classification:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/expense-classification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "single", "description": "Mleko 2%"}'
```

### Test receipt-ocr:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/receipt-ocr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "BASE64_IMAGE"}'
```
