import Anthropic from '@anthropic-ai/sdk';
import { MODELS, API_CONFIG } from './constants';

export interface StructuredData {
  keyValuePairs?: Array<{
    key: string;
    value: string;
    confidence: number;
    pageNumber: number;
  }>;
  formFields?: Array<{
    fieldName: string;
    fieldValue: string;
    confidence: number;
    pageNumber: number;
  }>;
  tables?: Array<{
    rows: string[][];
    confidence: number;
    pageNumber: number;
  }>;
  totalPages?: number;
}

export interface QuestionAnswerRequest {
  question: string;
  extractedText: string;
  structuredData?: StructuredData | null;
}

export interface QuestionAnswerResponse {
  answer: string;
  question: string;
  method: string;
}

export class AnthropicService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  async answerQuestion({
    question,
    extractedText,
    structuredData
  }: QuestionAnswerRequest): Promise<QuestionAnswerResponse> {
    if (!question?.trim()) {
      throw new Error('Question is required');
    }

    if (!extractedText?.trim()) {
      throw new Error('Extracted text is required for Anthropic Q&A method');
    }

    const prompt = this.buildPrompt(question, extractedText, structuredData);

    try {
      const message = await this.client.messages.create({
        model: MODELS.ANTHROPIC.CLAUDE_SONNET_4,
        max_tokens: API_CONFIG.ANTHROPIC.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const answer = message.content[0].type === 'text' 
        ? message.content[0].text 
        : 'Unable to generate answer';

      return {
        answer,
        question,
        method: 'anthropic'
      };
    } catch (error) {
      console.error('Anthropic API Error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to get answer from Anthropic: ${error.message}`
          : 'Failed to get answer from Anthropic'
      );
    }
  }

  private buildPrompt(
    question: string, 
    extractedText: string, 
    structuredData?: StructuredData | null
  ): string {
    let prompt = `Based on the following extracted data from a PDF document, please answer the question.

Document Text:
${extractedText}`;

    // Add structured data if available (from AWS Textract)
    if (structuredData) {
      if (structuredData.keyValuePairs && structuredData.keyValuePairs.length > 0) {
        prompt += `\n\nKey-Value Pairs:`;
        structuredData.keyValuePairs.forEach((pair) => {
          prompt += `\n- ${pair.key}: ${pair.value} (Page ${pair.pageNumber})`;
        });
      }

      if (structuredData.tables && structuredData.tables.length > 0) {
        prompt += `\n\nTables:`;
        structuredData.tables.forEach((table, index) => {
          prompt += `\n\nTable ${index + 1} (Page ${table.pageNumber}):`;
          table.rows.forEach((row, rowIndex) => {
            prompt += `\n${rowIndex === 0 ? 'Headers: ' : 'Row: '}${row.join(' | ')}`;
          });
        });
      }

      if (structuredData.formFields && structuredData.formFields.length > 0) {
        prompt += `\n\nForm Fields:`;
        structuredData.formFields.forEach((field) => {
          prompt += `\n- ${field.fieldName}: ${field.fieldValue} (Page ${field.pageNumber})`;
        });
      }
    }

    prompt += `\n\nQuestion: ${question}

Please provide a clear and concise answer based only on the information in the document. If the answer cannot be found in the document, please say so.`;

    return prompt;
  }
}