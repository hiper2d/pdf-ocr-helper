import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
  pageNumber: number;
}

export interface FormField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
  pageNumber: number;
}

export interface TableData {
  rows: string[][];
  confidence: number;
  pageNumber: number;
}

export interface EnhancedTextractResult {
  text: string;
  keyValuePairs: KeyValuePair[];
  formFields: FormField[];
  tables: TableData[];
  totalPages: number;
}

export class TextractService {
  private client: TextractClient;

  constructor() {
    this.client = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async extractEnhancedDataFromPdf(pdfBuffer: Buffer): Promise<EnhancedTextractResult> {
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);
    
    try {
      // Only try direct PDF processing if file size is within limits (10MB)
      if (fileSizeMB <= 10) {
        try {
          return await this.analyzeDocumentDirectly(pdfBuffer);
        } catch (error: unknown) {
          // If it's an UnsupportedDocumentException, fall back to image conversion
          if (this.isUnsupportedDocumentException(error)) {
            // Fall through to image conversion
          } else {
            throw error;
          }
        }
      }
      
      // Convert PDF to images and process each page
      console.log(`File size ${fileSizeMB.toFixed(2)}MB - attempting image conversion...`);
      return await this.convertPdfAndExtractEnhanced(pdfBuffer);
      
    } catch (error: unknown) {
      console.error('Error in extractEnhancedDataFromPdf:', error);
      
      if (error instanceof Error && error.message.includes('No text could be extracted')) {
        throw error;
      }
      
      const analysis = this.analyzePdfFormat(pdfBuffer);
      throw new Error(`PDF format not supported by AWS Textract. ${analysis.issues.join('. ')}. Try converting to a simpler PDF format or use PNG/JPEG images instead.`);
    }
  }

  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);
    
    try {
      // Only try direct PDF processing if file size is within limits (10MB)
      if (fileSizeMB <= 10) {
        try {
          const detectCommand = new DetectDocumentTextCommand({
            Document: {
              Bytes: pdfBuffer
            }
          });

          const response = await this.client.send(detectCommand);

          if (!response.Blocks) {
            throw new Error('No text blocks found in document');
          }

          const extractedText = response.Blocks
              .filter(block => block.BlockType === 'LINE')
              .map(block => block.Text)
              .filter(text => text)
              .join('\n');

          return extractedText;
        } catch (error: unknown) {
          // If it's an UnsupportedDocumentException, fall back to image conversion
          if (this.isUnsupportedDocumentException(error)) {
            // Fall through to image conversion
          } else {
            throw error;
          }
        }
      }
      
      // Convert PDF to images and process each page
      console.log(`File size ${fileSizeMB.toFixed(2)}MB - attempting image conversion...`);
      return await this.convertPdfAndExtract(pdfBuffer);
      
    } catch (error: unknown) {
      console.error('Error in extractTextFromPdf:', error);
      
      if (error instanceof Error && error.message.includes('No text could be extracted')) {
        throw error;
      }
      
      const analysis = this.analyzePdfFormat(pdfBuffer);
      throw new Error(`PDF format not supported by AWS Textract. ${analysis.issues.join('. ')}. Try converting to a simpler PDF format or use PNG/JPEG images instead.`);
    }
  }

  private isUnsupportedDocumentException(error: unknown): boolean {
    const errorObj = error as { name?: string; __type?: string };
    return errorObj?.name === 'UnsupportedDocumentException' ||
        errorObj?.__type === 'UnsupportedDocumentException';
  }

  private analyzePdfFormat(pdfBuffer: Buffer): { version: string; pages: number; issues: string[] } {
    const issues: string[] = [];
    let version = 'Unknown';
    let pages = 0;

    try {
      const pdfString = pdfBuffer.toString('binary');

      // Extract PDF version
      const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
        if (parseFloat(version) > 1.7) {
          issues.push(`PDF version ${version} may not be fully supported (try PDF 1.4-1.7)`);
        }
      }

      // Count pages
      const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
      pages = pageMatches ? pageMatches.length : 0;
      if (pages > 1) {
        issues.push('Multi-page PDFs may have compatibility issues');
      }

      // Check for encryption
      if (pdfString.includes('/Encrypt')) {
        issues.push('PDF appears to be encrypted or password-protected');
      }

      // Check for XRef streams (PDF 1.5+)
      if (pdfString.includes('/XRefStm')) {
        issues.push('PDF uses cross-reference streams which may cause issues');
      }

      // Check for object streams
      if (pdfString.includes('/ObjStm')) {
        issues.push('PDF uses object streams which may cause compatibility issues');
      }

      // Check for JPEG2000 images
      if (pdfString.includes('/JPXDecode')) {
        issues.push('PDF contains JPEG2000 images which may not be supported');
      }

      // Check for form fields
      if (pdfString.includes('/AcroForm')) {
        issues.push('PDF contains form fields which may complicate text extraction');
      }

    } catch {
      issues.push('Could not analyze PDF structure');
    }

    return { version, pages, issues };
  }

  private async analyzeDocumentDirectly(pdfBuffer: Buffer): Promise<EnhancedTextractResult> {
    const analyzeCommand = new AnalyzeDocumentCommand({
      Document: {
        Bytes: pdfBuffer
      },
      FeatureTypes: ['FORMS', 'TABLES']
    });

    const response = await this.client.send(analyzeCommand);

    if (!response.Blocks) {
      throw new Error('No blocks found in document');
    }

    return this.processBlocks(response.Blocks, 1);
  }

  private async convertPdfAndExtractEnhanced(pdfBuffer: Buffer): Promise<EnhancedTextractResult> {
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
    const tempOutputDir = path.join(tempDir, `pdf_images_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    console.log(`Converting PDF to images using Python script: ${tempPdfPath}`);

    try {
      // Write PDF to temp file
      fs.writeFileSync(tempPdfPath, pdfBuffer);

      // Call Python script to convert PDF to images
      const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_images.py');
      const conversionResult = await this.runPythonScript(scriptPath, [tempPdfPath, tempOutputDir]);

      if (!conversionResult.success) {
        throw new Error(`PDF conversion failed: ${conversionResult.error}`);
      }

      console.log(`PDF conversion completed - generated ${conversionResult.pages} pages`);

      if (!conversionResult.image_paths || conversionResult.image_paths.length === 0) {
        throw new Error('No images generated from PDF conversion');
      }

      // Process each page and collect enhanced results
      const allResults: EnhancedTextractResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < conversionResult.image_paths.length; i++) {
        const imagePath = conversionResult.image_paths[i];
        
        console.log(`Processing page ${i + 1}/${conversionResult.image_paths.length}: ${path.basename(imagePath)}`);
        
        try {
          const imageBuffer = fs.readFileSync(imagePath);

          // Check image size (Textract has 10MB limit)
          const imageSizeMB = imageBuffer.length / (1024 * 1024);
          console.log(`  Image size: ${imageSizeMB.toFixed(2)}MB`);
          
          if (imageSizeMB > 10) {
            errors.push(`Page ${i + 1} skipped: image size (${imageSizeMB.toFixed(1)}MB) exceeds 10MB limit`);
            continue;
          }

          // Analyze document with enhanced features
          const analyzeCommand = new AnalyzeDocumentCommand({
            Document: {
              Bytes: imageBuffer
            },
            FeatureTypes: ['FORMS', 'TABLES']
          });

          const response = await this.client.send(analyzeCommand);

          if (!response.Blocks) {
            errors.push(`No blocks found in page ${i + 1}`);
            continue;
          }

          // Process blocks for this page
          const pageResult = this.processBlocks(response.Blocks, i + 1);
          allResults.push(pageResult);

          console.log(`  Extracted ${pageResult.text.trim().length} characters, ${pageResult.keyValuePairs.length} key-value pairs, ${pageResult.formFields.length} form fields, ${pageResult.tables.length} tables from page ${i + 1}`);

        } catch (pageError) {
          console.error(`  Error processing page ${i + 1}:`, pageError);
          errors.push(`Error processing page ${i + 1}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        }
      }

      if (allResults.length === 0) {
        const errorSummary = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
        throw new Error(`No data could be extracted from any page.${errorSummary}`);
      }

      return this.mergeResults(allResults);

    } finally {
      // Clean up temp files
      this.cleanupTempFiles(tempPdfPath, tempOutputDir);
    }
  }

  private async convertPdfAndExtract(pdfBuffer: Buffer): Promise<string> {
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
    const tempOutputDir = path.join(tempDir, `pdf_images_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    console.log(`Converting PDF to images using Python script: ${tempPdfPath}`);

    try {
      // Write PDF to temp file
      fs.writeFileSync(tempPdfPath, pdfBuffer);

      // Call Python script to convert PDF to images
      const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_images.py');
      const conversionResult = await this.runPythonScript(scriptPath, [tempPdfPath, tempOutputDir]);

      if (!conversionResult.success) {
        throw new Error(`PDF conversion failed: ${conversionResult.error}`);
      }

      console.log(`PDF conversion completed - generated ${conversionResult.pages} pages`);

      if (!conversionResult.image_paths || conversionResult.image_paths.length === 0) {
        throw new Error('No images generated from PDF conversion');
      }

      // Process each page and collect results
      const allPageTexts: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < conversionResult.image_paths.length; i++) {
        const imagePath = conversionResult.image_paths[i];
        
        console.log(`Processing page ${i + 1}/${conversionResult.image_paths.length}: ${path.basename(imagePath)}`);
        
        try {
          const imageBuffer = fs.readFileSync(imagePath);

          // Check image size (Textract has 10MB limit)
          const imageSizeMB = imageBuffer.length / (1024 * 1024);
          console.log(`  Image size: ${imageSizeMB.toFixed(2)}MB`);
          
          if (imageSizeMB > 10) {
            errors.push(`Page ${i + 1} skipped: image size (${imageSizeMB.toFixed(1)}MB) exceeds 10MB limit`);
            continue;
          }

          // Extract text from the converted image
          const detectCommand = new DetectDocumentTextCommand({
            Document: {
              Bytes: imageBuffer
            }
          });

          const response = await this.client.send(detectCommand);

          if (!response.Blocks) {
            errors.push(`No text blocks found in page ${i + 1}`);
            continue;
          }

          // Extract text from this page
          const pageText = response.Blocks
              .filter(block => block.BlockType === 'LINE')
              .map(block => block.Text)
              .filter(text => text)
              .join('\n');

          console.log(`  Extracted ${pageText.trim().length} characters from page ${i + 1}`);

          if (pageText.trim()) {
            allPageTexts.push(`=== Page ${i + 1} ===\n${pageText}`);
          }

        } catch (pageError) {
          console.error(`  Error processing page ${i + 1}:`, pageError);
          errors.push(`Error processing page ${i + 1}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        }
      }

      if (allPageTexts.length === 0) {
        const errorSummary = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
        throw new Error(`No text could be extracted from any page.${errorSummary}`);
      }

      return allPageTexts.join('\n\n');

    } finally {
      // Clean up temp files
      this.cleanupTempFiles(tempPdfPath, tempOutputDir);
    }
  }

  private async runPythonScript(scriptPath: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use Python from virtual environment if available
      const venvPython = path.join(process.cwd(), 'scripts', 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
      
      const pythonProcess = spawn(pythonCmd, [scriptPath, ...args]);
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python script output: ${output}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }



  private cleanupTempFiles(tempPdfPath: string, tempOutputDir: string): void {
    try {
      // Remove PDF file
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
      
      // Remove image files and directory
      if (fs.existsSync(tempOutputDir)) {
        const files = fs.readdirSync(tempOutputDir);
        files.forEach(file => {
          try {
            fs.unlinkSync(path.join(tempOutputDir, file));
          } catch {
            // Continue cleanup even if individual files fail
          }
        });
        
        try {
          fs.rmdirSync(tempOutputDir);
        } catch {
          // Directory might not be empty, ignore
        }
      }
    } catch {
      // Silently fail cleanup to avoid masking main errors
    }
  }

  private processBlocks(blocks: any[], pageNumber: number): EnhancedTextractResult {
    const text: string[] = [];
    const keyValuePairs: KeyValuePair[] = [];
    const formFields: FormField[] = [];
    const tables: TableData[] = [];

    // Create lookup maps for relationships
    const blockMap = new Map();
    blocks.forEach(block => blockMap.set(block.Id, block));

    // Extract text lines
    blocks.filter(block => block.BlockType === 'LINE').forEach(block => {
      if (block.Text) {
        text.push(block.Text);
      }
    });

    // Extract key-value pairs
    blocks.filter(block => block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')).forEach(keyBlock => {
      const keyText = this.getTextFromBlock(keyBlock, blockMap);
      let valueText = '';
      let confidence = keyBlock.Confidence || 0;

      // Find corresponding value block
      if (keyBlock.Relationships) {
        const valueRelation = keyBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
        if (valueRelation && valueRelation.Ids) {
          const valueBlockId = valueRelation.Ids[0];
          const valueBlock = blockMap.get(valueBlockId);
          if (valueBlock) {
            valueText = this.getTextFromBlock(valueBlock, blockMap);
            confidence = Math.min(confidence, valueBlock.Confidence || 0);
          }
        }
      }

      if (keyText) {
        keyValuePairs.push({
          key: keyText,
          value: valueText,
          confidence: confidence,
          pageNumber
        });
      }
    });

    // Extract form fields (similar to key-value pairs but with different structure)
    blocks.filter(block => block.BlockType === 'KEY_VALUE_SET').forEach(block => {
      if (block.EntityTypes?.includes('KEY')) {
        const fieldName = this.getTextFromBlock(block, blockMap);
        let fieldValue = '';
        let confidence = block.Confidence || 0;

        if (block.Relationships) {
          const valueRelation = block.Relationships.find((rel: any) => rel.Type === 'VALUE');
          if (valueRelation && valueRelation.Ids) {
            const valueBlockId = valueRelation.Ids[0];
            const valueBlock = blockMap.get(valueBlockId);
            if (valueBlock) {
              fieldValue = this.getTextFromBlock(valueBlock, blockMap);
              confidence = Math.min(confidence, valueBlock.Confidence || 0);
            }
          }
        }

        if (fieldName) {
          formFields.push({
            fieldName,
            fieldValue,
            confidence,
            pageNumber
          });
        }
      }
    });

    // Extract tables
    blocks.filter(block => block.BlockType === 'TABLE').forEach(tableBlock => {
      const tableData = this.extractTableData(tableBlock, blockMap);
      if (tableData.rows.length > 0) {
        tables.push({
          rows: tableData.rows,
          confidence: tableBlock.Confidence || 0,
          pageNumber
        });
      }
    });

    return {
      text: text.join('\n'),
      keyValuePairs,
      formFields,
      tables,
      totalPages: pageNumber
    };
  }

  private getTextFromBlock(block: any, blockMap: Map<string, any>): string {
    if (block.Text) {
      return block.Text;
    }

    if (block.Relationships) {
      const childRelation = block.Relationships.find((rel: any) => rel.Type === 'CHILD');
      if (childRelation && childRelation.Ids) {
        const childTexts: string[] = [];
        childRelation.Ids.forEach((childId: string) => {
          const childBlock = blockMap.get(childId);
          if (childBlock && childBlock.Text) {
            childTexts.push(childBlock.Text);
          }
        });
        return childTexts.join(' ');
      }
    }

    return '';
  }

  private extractTableData(tableBlock: any, blockMap: Map<string, any>): { rows: string[][] } {
    const rows: string[][] = [];
    const cellMap = new Map<string, { row: number, col: number, text: string }>();

    // Find all cells in the table
    if (tableBlock.Relationships) {
      const childRelation = tableBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
      if (childRelation && childRelation.Ids) {
        childRelation.Ids.forEach((cellId: string) => {
          const cellBlock = blockMap.get(cellId);
          if (cellBlock && cellBlock.BlockType === 'CELL') {
            const rowIndex = (cellBlock.RowIndex || 1) - 1;
            const colIndex = (cellBlock.ColumnIndex || 1) - 1;
            const cellText = this.getTextFromBlock(cellBlock, blockMap);
            
            cellMap.set(`${rowIndex}-${colIndex}`, {
              row: rowIndex,
              col: colIndex,
              text: cellText
            });
          }
        });
      }
    }

    // Convert cell map to 2D array
    const maxRow = Math.max(...Array.from(cellMap.values()).map(cell => cell.row)) + 1;
    const maxCol = Math.max(...Array.from(cellMap.values()).map(cell => cell.col)) + 1;

    for (let row = 0; row < maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 0; col < maxCol; col++) {
        const cell = cellMap.get(`${row}-${col}`);
        rowData.push(cell ? cell.text : '');
      }
      rows.push(rowData);
    }

    return { rows };
  }

  private mergeResults(results: EnhancedTextractResult[]): EnhancedTextractResult {
    const mergedText = results.map((result, index) => 
      `=== Page ${index + 1} ===\n${result.text}`
    ).join('\n\n');

    const allKeyValuePairs = results.flatMap(result => result.keyValuePairs);
    const allFormFields = results.flatMap(result => result.formFields);
    const allTables = results.flatMap(result => result.tables);
    const totalPages = results.length;

    return {
      text: mergedText,
      keyValuePairs: allKeyValuePairs,
      formFields: allFormFields,
      tables: allTables,
      totalPages
    };
  }
}