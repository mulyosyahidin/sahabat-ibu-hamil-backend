/**
 * OpenAI Configuration
 * 
 * This file contains configuration settings for OpenAI API integration.
 * Environment variables are used to configure the model and project settings.
 */

export interface OpenAIConfig {
  model: string;
  projectName: string;
  apiKey: string;
  enabled: boolean;
}

/**
 * Get OpenAI configuration from environment variables
 */
export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    projectName: process.env.OPENAI_PROJECT_NAME || '',
    apiKey,
    enabled: process.env.OPENAI_ENABLE === 'true'
  };
}

/**
 * Default OpenAI configuration
 */
export const openaiConfig = getOpenAIConfig();

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS = {
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O: 'gpt-4o',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
} as const;

export type OpenAIModel = typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS];