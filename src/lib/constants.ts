// Model constants for AI services
export const MODELS = {
  ANTHROPIC: {
    CLAUDE_SONNET_4: 'claude-sonnet-4-20250514',
  },
  MISTRAL: {
    OCR_LATEST: 'mistral-ocr-latest',
    LARGE_LATEST: 'mistral-large-latest',
  },
  GOOGLE: {
    GEMINI_PRO: 'gemini-2.5-pro',
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
  },
  GOOGLE: {
    LOCATION: 'us', // or 'eu' depending on your preference
    MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB for Google Document AI
    MAX_TOKENS: 8192,
  }
} as const;