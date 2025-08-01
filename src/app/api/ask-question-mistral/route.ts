import { NextRequest, NextResponse } from 'next/server';
import { MistralOCRService } from '@/lib/mistral-ocr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, fileId, signedUrl, filename } = body;

    if (!question) {
      return NextResponse.json({ 
        error: 'Question is required' 
      }, { status: 400 });
    }

    if (!fileId || !signedUrl || !filename) {
      return NextResponse.json({ 
        error: 'File information (fileId, signedUrl, filename) is required' 
      }, { status: 400 });
    }

    // Initialize Mistral OCR service
    const mistralService = new MistralOCRService();

    // Create file info object
    const fileInfo = {
      id: fileId,
      filename: filename,
      signedUrl: signedUrl
    };

    // Use Mistral's document Q&A capability with uploaded file
    const answer = await mistralService.askQuestionAboutUploadedFile(fileInfo, question);

    return NextResponse.json({
      answer,
      question,
      method: 'mistral-direct',
      filename: filename,
      fileId: fileId
    });

  } catch (error) {
    console.error('Mistral Q&A API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to answer question with Mistral' },
      { status: 500 }
    );
  }
}