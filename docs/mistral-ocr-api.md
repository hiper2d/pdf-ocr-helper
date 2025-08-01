# Mistral OCR API Documentation

## Overview

The Mistral Document AI API includes a Document OCR (Optical Character Recognition) processor powered by the `mistral-ocr-latest` model. This API enables extraction of text and structured content from PDF documents and images.

### Key Features
- Extracts text content while maintaining document structure and hierarchy
- Preserves formatting like headers, paragraphs, lists and tables
- Returns results in markdown format for easy parsing and rendering
- Handles complex layouts including multi-column text and mixed content
- Processes documents at scale with high accuracy
- Supports multiple document formats:
    - **image_url**: png, jpeg/jpg, avif and more
    - **document_url**: pdf, pptx, docx and more

The OCR processor returns the extracted text content, image bounding boxes, and metadata about the document structure.

## JavaScript/TypeScript Examples

### 1. OCR with PDF from URL

```javascript
import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({apiKey: apiKey});

const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
        type: "document_url",
        documentUrl: "https://arxiv.org/pdf/2201.04234"
    },
    includeImageBase64: true
});

console.log(ocrResponse);
```

### 2. OCR with Base64 Encoded PDF

```javascript
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';

async function encodePdf(pdfPath) {
    try {
        // Read the PDF file as a buffer
        const pdfBuffer = fs.readFileSync(pdfPath);
        // Convert the buffer to a Base64-encoded string
        const base64Pdf = pdfBuffer.toString('base64');
        return base64Pdf;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}

const pdfPath = "path_to_your_pdf.pdf";
const base64Pdf = await encodePdf(pdfPath);

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

try {
    const ocrResponse = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
            type: "document_url",
            documentUrl: "data:application/pdf;base64," + base64Pdf
        },
        includeImageBase64: true
    });
    console.log(ocrResponse);
} catch (error) {
    console.error("Error processing OCR:", error);
}
```

### 3. OCR with Uploaded PDF

#### Upload a File
```javascript
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({apiKey: apiKey});

const uploadedFile = fs.readFileSync('uploaded_file.pdf');
const uploadedPdf = await client.files.upload({
    file: {
        fileName: "uploaded_file.pdf",
        content: uploadedFile,
    },
    purpose: "ocr"
});
```

#### Retrieve File Information
```javascript
const retrievedFile = await client.files.retrieve({
    fileId: uploadedPdf.id
});

console.log(retrievedFile);
// Output example:
// {
//   id: '00edaf84-95b0-45db-8f83-f71138491f23',
//   object: 'file',
//   size_bytes: 3749788,
//   created_at: 1741023462,
//   filename: 'uploaded_file.pdf',
//   purpose: 'ocr',
//   sample_type: 'ocr_input',
//   source: 'upload',
//   deleted: false,
//   num_lines: null
// }
```

#### Get Signed URL
```javascript
const signedUrl = await client.files.getSignedUrl({
    fileId: uploadedPdf.id,
});
```

#### Process OCR on Uploaded File
```javascript
const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
        type: "document_url",
        documentUrl: signedUrl.url,
    },
    includeImageBase64: true
});
```

### 4. OCR with Image from URL

```javascript
import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({apiKey: apiKey});

const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
        type: "image_url",
        imageUrl: "https://raw.githubusercontent.com/mistralai/cookbook/refs/heads/main/mistral/ocr/receipt.png",
    },
    includeImageBase64: true
});
```

### 5. OCR with Base64 Encoded Image

```javascript
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';

async function encodeImage(imagePath) {
    try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(imagePath);
        // Convert the buffer to a Base64-encoded string
        const base64Image = imageBuffer.toString('base64');
        return base64Image;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}

const imagePath = "path_to_your_image.jpg";
const base64Image = await encodeImage(imagePath);

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

try {
    const ocrResponse = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
            type: "image_url",
            imageUrl: "data:image/jpeg;base64," + base64Image
        },
        includeImageBase64: true
    });
    console.log(ocrResponse);
} catch (error) {
    console.error("Error processing OCR:", error);
}
```

## Response Format

The OCR API returns a structured response with the following format:

```javascript
{
    "pages": [
        {
            "index": 1,
            "markdown": "# Document Title\n\nDocument content in markdown format...",
            "images": [
                {
                    "id": "img-0.jpeg",
                    "top_left_x": 292,
                    "top_left_y": 217,
                    "bottom_right_x": 1405,
                    "bottom_right_y": 649,
                    "image_base64": "..."
                }
            ],
            "dimensions": {
                "dpi": 200,
                "height": 2200,
                "width": 1700
            }
        }
    ]
}
```

### Response Fields:
- **pages**: Array of page objects
    - **index**: Page number (1-based)
    - **markdown**: Extracted text content in markdown format
    - **images**: Array of detected images with bounding box coordinates
        - **id**: Unique identifier for the image
        - **top_left_x/y**: Top-left corner coordinates
        - **bottom_right_x/y**: Bottom-right corner coordinates
        - **image_base64**: Base64 encoded image data (when `includeImageBase64: true`)
    - **dimensions**: Page dimensions
        - **dpi**: Dots per inch
        - **height**: Page height in pixels
        - **width**: Page width in pixels

## Parameters

### Required Parameters:
- **model**: `"mistral-ocr-latest"`
- **document**: Document specification object

### Document Types:
1. **document_url**: For PDFs, PPTX, DOCX files
   ```javascript
   document: {
       type: "document_url",
       documentUrl: "https://example.com/document.pdf"
   }
   ```

2. **image_url**: For image files
   ```javascript
   document: {
       type: "image_url",
       imageUrl: "https://example.com/image.png"
   }
   ```

### Optional Parameters:
- **includeImageBase64**: Boolean (default: false) - Whether to include base64 encoded images in the response

## Error Handling

```javascript
try {
    const ocrResponse = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
            type: "document_url",
            documentUrl: "https://example.com/document.pdf"
        },
        includeImageBase64: true
    });
    console.log(ocrResponse);
} catch (error) {
    console.error("Error processing OCR:", error);
    // Handle specific error cases
    if (error.status === 400) {
        console.error("Bad request - check your parameters");
    } else if (error.status === 401) {
        console.error("Unauthorized - check your API key");
    } else if (error.status === 413) {
        console.error("File too large - maximum 50MB allowed");
    }
}
```

## API Limitations

- Uploaded document files must not exceed **50 MB** in size
- Documents should be no longer than **1,000 pages**
- Supported file formats:
    - **Images**: PNG, JPEG/JPG, AVIF, and more
    - **Documents**: PDF, PPTX, DOCX, and more

## Environment Setup

Make sure to set your API key as an environment variable:

```bash
export MISTRAL_API_KEY="your_api_key_here"
```

Or in a `.env` file:
```
MISTRAL_API_KEY=your_api_key_here
```

## Complete Example

Here's a complete working example that demonstrates OCR processing with error handling:

```javascript
import { Mistral } from '@mistralai/mistralai';
import fs from 'fs';

class MistralOCR {
    constructor(apiKey) {
        this.client = new Mistral({ apiKey });
    }

    async processDocument(documentUrl, includeImages = true) {
        try {
            const response = await this.client.ocr.process({
                model: "mistral-ocr-latest",
                document: {
                    type: "document_url",
                    documentUrl: documentUrl
                },
                includeImageBase64: includeImages
            });

            return this.formatResponse(response);
        } catch (error) {
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    async processImageFile(imagePath) {
        try {
            const base64Image = this.encodeImage(imagePath);
            const mimeType = this.getMimeType(imagePath);
            
            const response = await this.client.ocr.process({
                model: "mistral-ocr-latest",
                document: {
                    type: "image_url",
                    imageUrl: `data:${mimeType};base64,${base64Image}`
                },
                includeImageBase64: true
            });

            return this.formatResponse(response);
        } catch (error) {
            throw new Error(`Image OCR processing failed: ${error.message}`);
        }
    }

    encodeImage(imagePath) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            return imageBuffer.toString('base64');
        } catch (error) {
            throw new Error(`Failed to encode image: ${error.message}`);
        }
    }

    getMimeType(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    formatResponse(response) {
        return {
            totalPages: response.pages.length,
            pages: response.pages.map(page => ({
                pageNumber: page.index,
                content: page.markdown,
                imageCount: page.images?.length || 0,
                dimensions: page.dimensions
            }))
        };
    }
}

// Usage example
async function main() {
    const apiKey = process.env.MISTRAL_API_KEY;
    const ocr = new MistralOCR(apiKey);

    try {
        // Process a PDF from URL
        const pdfResult = await ocr.processDocument(
            "https://arxiv.org/pdf/2201.04234"
        );
        console.log('PDF processed:', pdfResult);

        // Process a local image
        const imageResult = await ocr.processImageFile("./receipt.png");
        console.log('Image processed:', imageResult);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the example
main();
```

## OCR Annotations

### Overview
In addition to basic OCR functionality, Mistral Document AI API adds annotations functionality, which allows you to extract information in a structured JSON format that you provide. It offers two types of annotations:

- **bbox_annotation**: Provides annotation of the bounding boxes extracted by the OCR model (charts/figures etc) based on user requirements and provided bbox/image annotation format
- **document_annotation**: Returns annotation of the entire document based on the provided document annotation format

### Key Capabilities
- Labeling and annotating data
- Extraction and structuring of specific information from documents into predefined JSON format
- Automation of data extraction to reduce manual entry and errors
- Efficient handling of large document volumes for enterprise-level applications

### Common Use Cases
- Parsing forms, classification of documents, and processing images including text, charts, and signatures
- Conversion of charts to tables, extraction of fine print from figures, or definition of custom image types
- Capture of receipt data including merchant names and transaction amounts for expense management
- Extraction of key information like vendor details and amounts from invoices for automated accounting
- Extraction of key clauses and terms from contracts for easier review and management

### How It Works

**BBOX Annotations:**
- After regular OCR is finished, a Vision-capable LLM is called for all bboxes individually with the provided annotation format

**Document Annotation:**
- For PDF/images: Independent of OCR; all pages are converted to images and sent to a Vision-capable LLM along with the provided annotation format
- For PPTX/DOCX: OCR runs first and the output text markdown is sent to a Vision-capable LLM along with the provided annotation format

### BBOX Annotation Example

#### Define the Data Model
```javascript
import { z } from 'zod';

// BBOX Annotation response formats
const ImageSchema = z.object({
    image_type: z.string(),
    short_description: z.string(),
    summary: z.string(),
});

// With descriptions for better annotation
const ImageSchemaWithDescriptions = z.object({
    image_type: z.string().describe("The type of the image."),
    short_description: z.string().describe("A description in English describing the image."),
    summary: z.string().describe("Summarize the image."),
});
```

#### Make the Request
```javascript
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodSchema } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

async function processBBoxAnnotation() {
    try {
        const response = await client.ocr.process({
            model: "mistral-ocr-latest",
            document: {
                type: "document_url",
                documentUrl: "https://arxiv.org/pdf/2410.07073"
            },
            bboxAnnotationFormat: responseFormatFromZodSchema(ImageSchema),
            includeImageBase64: true,
        });
        console.log(response);
    } catch (error) {
        console.error("Error processing document:", error);
    }
}

processBBoxAnnotation();
```

#### Example Output
```javascript
// BBOX Annotation Output
{
    "image_type": "scatter plot",
    "short_description": "Comparison of different models based on performance and cost.",
    "summary": "The image consists of two scatter plots comparing various models on two different performance metrics against their cost or number of parameters. The left plot shows performance on the MM-MT-Bench, while the right plot shows performance on the LMSys-Vision ELO. Each point represents a different model, with the x-axis indicating the cost or number of parameters in billions (B) and the y-axis indicating the performance score. The shaded region in both plots highlights the best performance/cost ratio, with Pixtral 12B positioned within this region in both plots, suggesting it offers a strong balance of performance and cost efficiency."
}
```

### Document Annotation Example

#### Define the Data Model
```javascript
import { z } from 'zod';

// Document Annotation response format
const DocumentSchema = z.object({
    language: z.string(),
    chapter_titles: z.array(z.string()),
    urls: z.array(z.string()),
});
```

#### Make the Request
```javascript
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodSchema } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

async function processDocumentAnnotation() {
    try {
        const response = await client.ocr.process({
            model: "mistral-ocr-latest",
            pages: Array.from({ length: 8 }, (_, i) => i), // Process first 8 pages
            document: {
                type: "document_url",
                documentUrl: "https://arxiv.org/pdf/2410.07073"
            },
            documentAnnotationFormat: responseFormatFromZodSchema(DocumentSchema),
            includeImageBase64: true,
        });
        console.log(response);
    } catch (error) {
        console.error("Error processing document:", error);
    }
}

processDocumentAnnotation();
```

#### Example Output
```javascript
// Document Annotation Output
{
    "language": "English",
    "chapter_titles": [
        "Abstract",
        "1 Introduction",
        "2 Architectural details",
        "2.1 Multimodal Decoder",
        "2.2 Vision Encoder",
        "2.3 Complete architecture",
        "3 MM-MT-Bench: A benchmark for multi-modal instruction following",
        "4 Results",
        "4.1 Main Results",
        "4.2 Prompt selection",
        "4.3 Sensitivity to evaluation metrics",
        "4.4 Vision Encoder Ablations"
    ],
    "urls": [
        "https://mistral.ai/news/pixtal-12b/",
        "https://github.com/mistralai/mistral-inference/",
        "https://github.com/mistralai/mistral-evals/",
        "https://huggingface.co/datasets/mistralai/MM-MT-Bench"
    ]
}
```

### Combined BBOX and Document Annotation

```javascript
import { z } from 'zod';
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodSchema } from "@mistralai/mistralai";

// Define both schemas
const ImageSchema = z.object({
    image_type: z.string().describe("The type of the image."),
    short_description: z.string().describe("A description in English describing the image."),
    summary: z.string().describe("Summarize the image."),
});

const DocumentSchema = z.object({
    language: z.string(),
    chapter_titles: z.array(z.string()),
    urls: z.array(z.string()),
});

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

async function processCombinedAnnotations() {
    try {
        const response = await client.ocr.process({
            model: "mistral-ocr-latest",
            pages: Array.from({ length: 8 }, (_, i) => i),
            document: {
                type: "document_url",
                documentUrl: "https://arxiv.org/pdf/2410.07073"
            },
            bboxAnnotationFormat: responseFormatFromZodSchema(ImageSchema),
            documentAnnotationFormat: responseFormatFromZodSchema(DocumentSchema),
            includeImageBase64: true,
        });
        console.log(response);
    } catch (error) {
        console.error("Error processing document:", error);
    }
}

processCombinedAnnotations();
```

### Annotation Limitations
- **Document Annotations**: Files cannot have more than 8 pages
- **BBOX Annotations**: No page limit restrictions
- General OCR limits still apply: 50MB max file size, 1,000 pages max

## Document Q&A

### Overview
The Document Q&A capability combines OCR with large language model capabilities to enable natural language interaction with document content. This allows you to extract information and insights from documents by asking questions in natural language.

### Key Capabilities
- Question answering about specific document content
- Information extraction and summarization
- Document analysis and insights
- Multi-document queries and comparisons
- Context-aware responses that consider the full document

### Common Use Cases
- Analyzing research papers and technical documents
- Extracting information from business documents
- Processing legal documents and contracts
- Building document Q&A applications
- Automating document-based workflows

### Document Q&A Example

#### Basic Q&A with PDF URL
```javascript
import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

async function askDocumentQuestion() {
    try {
        const chatResponse = await client.chat.complete({
            model: "mistral-small-latest",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "What is the last sentence in the document?"
                        },
                        {
                            type: "document_url",
                            documentUrl: "https://arxiv.org/pdf/1805.04770"
                        }
                    ]
                }
            ]
        });

        console.log(chatResponse.choices[0].message.content);
    } catch (error) {
        console.error("Error processing document Q&A:", error);
    }
}

askDocumentQuestion();
```

#### Q&A with Uploaded Document
```javascript
import { Mistral } from "@mistralai/mistralai";
import fs from 'fs';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

async function askUploadedDocumentQuestion() {
    try {
        // Upload the document
        const uploadedFile = fs.readFileSync('your_document.pdf');
        const uploadedPdf = await client.files.upload({
            file: {
                fileName: "your_document.pdf",
                content: uploadedFile,
            },
            purpose: "ocr"
        });

        // Get signed URL
        const signedUrl = await client.files.getSignedUrl({
            fileId: uploadedPdf.id,
        });

        // Ask questions about the document
        const chatResponse = await client.chat.complete({
            model: "mistral-small-latest",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Summarize the main points of this document."
                        },
                        {
                            type: "document_url",
                            documentUrl: signedUrl.url
                        }
                    ]
                }
            ],
            documentImageLimit: 8,    // Optional: limit images processed
            documentPageLimit: 64     // Optional: limit pages processed
        });

        console.log(chatResponse.choices[0].message.content);
    } catch (error) {
        console.error("Error processing document Q&A:", error);
    }
}

askUploadedDocumentQuestion();
```

#### Advanced Q&A Examples
```javascript
import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

class DocumentQA {
    constructor(apiKey) {
        this.client = new Mistral({ apiKey });
    }

    async askQuestion(documentUrl, question, options = {}) {
        try {
            const chatResponse = await this.client.chat.complete({
                model: options.model || "mistral-small-latest",
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
                                documentUrl: documentUrl
                            }
                        ]
                    }
                ],
                documentImageLimit: options.imageLimit || 8,
                documentPageLimit: options.pageLimit || 64
            });

            return chatResponse.choices[0].message.content;
        } catch (error) {
            throw new Error(`Document Q&A failed: ${error.message}`);
        }
    }

    async multipleQuestions(documentUrl, questions) {
        const results = [];
        for (const question of questions) {
            try {
                const answer = await this.askQuestion(documentUrl, question);
                results.push({ question, answer });
            } catch (error) {
                results.push({ question, error: error.message });
            }
        }
        return results;
    }

    async analyzeDocument(documentUrl) {
        const analysisQuestions = [
            "What is the main topic of this document?",
            "What are the key findings or conclusions?",
            "Who are the authors or main contributors?",
            "What methodology was used if this is a research paper?",
            "What are the practical applications mentioned?"
        ];

        return await this.multipleQuestions(documentUrl, analysisQuestions);
    }
}

// Usage examples
async function main() {
    const docQA = new DocumentQA(process.env.MISTRAL_API_KEY);

    try {
        // Single question
        const answer = await docQA.askQuestion(
            "https://arxiv.org/pdf/1805.04770",
            "What is the main contribution of this paper?"
        );
        console.log("Answer:", answer);

        // Multiple questions
        const questions = [
            "What is the abstract of this paper?",
            "What are the main results?",
            "What future work is suggested?"
        ];
        
        const results = await docQA.multipleQuestions(
            "https://arxiv.org/pdf/1805.04770",
            questions
        );
        
        results.forEach(result => {
            console.log(`Q: ${result.question}`);
            console.log(`A: ${result.answer || result.error}\n`);
        });

        // Full document analysis
        const analysis = await docQA.analyzeDocument("https://arxiv.org/pdf/1805.04770");
        console.log("Document Analysis:", analysis);

    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
```

### Document Q&A Parameters
- **model**: Language model to use (e.g., "mistral-small-latest")
- **documentImageLimit**: Maximum number of images to process (default: 8)
- **documentPageLimit**: Maximum number of pages to process (default: 64)

### Document Q&A Limitations
- Uploaded document files must not exceed **50 MB** in size
- Documents should be no longer than **1,000 pages**
- Processing time depends on document complexity and question complexity

## FAQ

### General OCR Limitations
- Uploaded document files must not exceed **50 MB** in size
- Documents should be no longer than **1,000 pages**

### Annotation-Specific Limitations
- **Document Annotations**: Files cannot have more than **8 pages**
- **BBOX Annotations**: No specific page limit restrictions

### Document Q&A Limitations
- Same as general OCR limitations: **50 MB** max file size, **1,000 pages** max
- Processing time varies based on document and query complexity

This documentation provides comprehensive coverage of the Mistral OCR API with practical JavaScript examples that you can copy and use in your IDE for reference with code assistants.