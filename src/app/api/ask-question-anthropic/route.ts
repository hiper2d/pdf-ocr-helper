import { NextRequest, NextResponse } from 'next/server';
import { AnthropicService } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { question, extractedText, qaMethod, structuredData } = await request.json();

    if (!question) {
      return NextResponse.json({ 
        error: 'Question is required' 
      }, { status: 400 });
    }

    // For anthropic method, extracted text is required
    if ((!qaMethod || qaMethod === 'anthropic') && !extractedText) {
      return NextResponse.json({ 
        error: 'Extracted text is required for Anthropic Q&A method' 
      }, { status: 400 });
    }

    const anthropicService = new AnthropicService();
    const result = await anthropicService.answerQuestion({
      question,
      extractedText,
      structuredData
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to answer question' },
      { status: 500 }
    );
  }
}