import { NextRequest, NextResponse } from 'next/server';
import { TextractService } from '@/lib/textract';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Check file size limit (10MB for synchronous Textract operations)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the 10MB limit for PDF processing` 
      }, { status: 400 });
    }

    console.log(`Processing PDF: ${file.name}, Size: ${Math.round(file.size / 1024)}KB`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate PDF header
    const pdfHeader = buffer.subarray(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      return NextResponse.json({ 
        error: 'Invalid PDF format - file does not have valid PDF header' 
      }, { status: 400 });
    }

    const textractService = new TextractService();
    const enhancedResult = await textractService.extractEnhancedDataFromPdf(buffer);

    return NextResponse.json({ 
      text: enhancedResult.text,
      keyValuePairs: enhancedResult.keyValuePairs,
      formFields: enhancedResult.formFields,
      tables: enhancedResult.tables,
      totalPages: enhancedResult.totalPages,
      filename: file.name,
      size: file.size,
      processor: 'AWS Textract (Enhanced)'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF' },
      { status: 500 }
    );
  }
}