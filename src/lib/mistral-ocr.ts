import { Mistral } from '@mistralai/mistralai';
import { MODELS, API_CONFIG } from './constants';

export interface MistralFileInfo {
  id: string;
  filename: string;
  signedUrl: string;
}

export interface MistralOCRResult {
  text: string;
  fileInfo: MistralFileInfo;
}

export class MistralOCRService {
  private client: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY || '';
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required for Mistral OCR');
    }
    this.client = new Mistral({ apiKey });
  }

  async uploadFile(fileBuffer: Buffer, filename: string): Promise<MistralFileInfo> {
    try {
      console.log(`Uploading file to Mistral: ${filename}, Size: ${Math.round(fileBuffer.length / 1024)}KB`);

      // Validate file size (50MB limit for Mistral)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds the 50MB limit for Mistral`);
      }

      // Upload file to Mistral
      const uploadedFile = await this.client.files.upload({
        file: {
          fileName: filename,
          content: fileBuffer,
        },
        purpose: "ocr"
      });

      console.log(`File uploaded successfully. File ID: ${uploadedFile.id}`);

      // Get signed URL for the uploaded file
      const signedUrl = await this.client.files.getSignedUrl({
        fileId: uploadedFile.id,
      });

      return {
        id: uploadedFile.id,
        filename: filename,
        signedUrl: signedUrl.url
      };

    } catch (error) {
      console.error('Error uploading file to Mistral:', error);
      throw new Error(`Failed to upload file to Mistral: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractTextFromUploadedFile(fileInfo: MistralFileInfo): Promise<string> {
    try {
      console.log(`Processing OCR for uploaded file: ${fileInfo.filename} (ID: ${fileInfo.id})`);

      // Use Mistral SDK OCR API with the signed URL
      const ocrResponse = await this.client.ocr.process({
        model: MODELS.MISTRAL.OCR_LATEST,
        document: {
          type: "document_url",
          documentUrl: fileInfo.signedUrl
        },
        includeImageBase64: false
      });
      
      if (!ocrResponse.pages || ocrResponse.pages.length === 0) {
        throw new Error('No text extraction results returned from Mistral OCR');
      }

      // Combine markdown content from all pages
      const extractedText = ocrResponse.pages
        .map(page => page.markdown || '')
        .join('\n\n')
        .trim();
      
      if (!extractedText) {
        throw new Error('No text found in document');
      }

      console.log(`Mistral OCR extracted ${extractedText.length} characters of text from ${ocrResponse.pages.length} pages`);
      return extractedText;

    } catch (error) {
      console.error('Error extracting text with Mistral OCR:', error);
      throw new Error(`Failed to extract text with Mistral OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processDocument(fileBuffer: Buffer, filename: string): Promise<MistralOCRResult> {
    try {
      // Upload file and extract text
      const fileInfo = await this.uploadFile(fileBuffer, filename);
      const text = await this.extractTextFromUploadedFile(fileInfo);

      return {
        text,
        fileInfo
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async askQuestionAboutUploadedFile(fileInfo: MistralFileInfo, question: string): Promise<string> {
    try {
      console.log(`Processing document Q&A with Mistral for uploaded file: ${fileInfo.filename} (ID: ${fileInfo.id}), Question: ${question.substring(0, 100)}...`);

      // Use Mistral's document Q&A capability with the signed URL
      const chatResponse = await this.client.chat.complete({
        model: MODELS.MISTRAL.SMALL_LATEST,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: question
              },
              {
                type: "document_url",
                documentUrl: fileInfo.signedUrl
              }
            ]
          }
        ],
        // Use larger limits for document processing
        documentImageLimit: API_CONFIG.MISTRAL.DOCUMENT_IMAGE_LIMIT,
        documentPageLimit: API_CONFIG.MISTRAL.DOCUMENT_PAGE_LIMIT
      } as any);

      // Handle both string and ContentChunk[] response types
      const messageContent = chatResponse.choices[0].message.content;
      const answer = typeof messageContent === 'string' 
        ? messageContent 
        : Array.isArray(messageContent) 
          ? messageContent.map(chunk => {
              // Handle different chunk types
              if ('text' in chunk) return chunk.text;
              if ('content' in chunk) return chunk.content;
              return '';
            }).join('') 
          : 'Unable to generate answer';
      console.log(`Mistral Q&A completed, answer length: ${answer.length} characters`);
      
      return answer;

    } catch (error) {
      console.error('Error with Mistral document Q&A:', error);
      throw new Error(`Failed to process document Q&A with Mistral: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Legacy methods for backward compatibility (will be deprecated)
  async extractTextFromPdf(pdfBuffer: Buffer, filename: string): Promise<string> {
    const result = await this.processDocument(pdfBuffer, filename);
    return result.text;
  }

  async extractTextFromImage(imageBuffer: Buffer, filename: string): Promise<string> {
    const result = await this.processDocument(imageBuffer, filename);
    return result.text;
  }

  async askQuestionAboutDocument(documentBuffer: Buffer, filename: string, question: string): Promise<string> {
    const fileInfo = await this.uploadFile(documentBuffer, filename);
    return await this.askQuestionAboutUploadedFile(fileInfo, question);
  }
}