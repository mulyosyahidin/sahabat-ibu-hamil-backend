export const PRICING = {
  "gpt-4o-mini": {
    inputPerMTokUsd: 0.15,   // $/1M input tokens
    outputPerMTokUsd: 0.60,  // $/1M output tokens
    cachedPerMTokUsd: 0.075, // $/1M cached input
  }
} as const;

/**
 * AI Model Pricing Configuration for AiLogger
 * Prices are per 1M tokens in USD
 */
export const aiPricing = {
  // OpenAI GPT Models
  "gpt-4o-mini": {
    input: 0.15,
    output: 0.60
  },
  "gpt-4o": {
    input: 2.50,
    output: 10.00
  },
  "gpt-4-turbo": {
    input: 10.00,
    output: 30.00
  },
  "gpt-3.5-turbo": {
    input: 0.50,
    output: 1.50
  },
  
  // Anthropic Claude Models
  "claude-3-5-sonnet": {
    input: 3.00,
    output: 15.00
  },
  "claude-3-haiku": {
    input: 0.25,
    output: 1.25
  },
  
  // Google Gemini Models
  "gemini-pro": {
    input: 0.50,
    output: 1.50
  },
  "gemini-flash": {
    input: 0.075,
    output: 0.30
  }
} as const;
