// Model constants for AI services
export const MODELS = {
  ANTHROPIC: {
    CLAUDE_SONNET_4: 'claude-sonnet-4-20250514',
  },
  MISTRAL: {
    OCR_LATEST: 'mistral-ocr-latest',
    SMALL_LATEST: 'mistral-small-latest',
  }
} as const;

// API configuration constants
export const API_CONFIG = {
  ANTHROPIC: {
    MAX_TOKENS: 1000,
  },
  MISTRAL: {
    DOCUMENT_IMAGE_LIMIT: 100,
    DOCUMENT_PAGE_LIMIT: 500,
  }
} as const;