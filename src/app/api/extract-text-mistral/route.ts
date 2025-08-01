import { NextRequest, NextResponse } from 'next/server';
import { MistralOCRService } from '@/lib/mistral-ocr';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type - Mistral OCR supports both PDF and images
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File must be a PDF or image (JPEG, PNG, GIF, WebP)' 
      }, { status: 400 });
    }

    // Check file size limit (50MB for Mistral OCR)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the 50MB limit for Mistral OCR processing` 
      }, { status: 400 });
    }

    console.log(`Processing file with Mistral OCR: ${file.name}, Type: ${file.type}, Size: ${Math.round(file.size / 1024)}KB`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mistralOCRService = new MistralOCRService();
    
    // Use the new processDocument method that returns both text and file info
    const result = await mistralOCRService.processDocument(buffer, file.name);

    return NextResponse.json({ 
      text: result.text,
      filename: file.name,
      size: file.size,
      processor: 'Mistral OCR',
      fileId: result.fileInfo.id,
      fileInfo: result.fileInfo
    });
  } catch (error) {
    console.error('Mistral OCR API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file with Mistral OCR' },
      { status: 500 }
    );
  }
}