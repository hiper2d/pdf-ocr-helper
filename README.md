# AWS Textract OCR Demo

A comprehensive document processing application that demonstrates OCR capabilities using both AWS Textract and Mistral OCR, with intelligent Q&A functionality powered by Anthropic Claude.

## Features

### 🔍 **Dual OCR Processing**
- **AWS Textract**: Advanced structured data extraction (text, key-value pairs, forms, tables)
- **Mistral OCR**: Efficient file upload workflow with document ID management

### 🤖 **Intelligent Q&A**
- **Anthropic Claude**: Question answering over extracted text and structured data
- **Mistral Direct Q&A**: Document-based question answering using uploaded file IDs

### 📊 **Enhanced Data Extraction**
- **Structured Data**: Key-value pairs, form fields, and tables with confidence scores
- **Page-by-Page Processing**: Multi-page document support with merged results
- **Rich UI Display**: Tabbed interface for different data types

### 🔄 **Smart Workflows**
- **Method Restrictions**: Q&A methods automatically restricted based on OCR choice
- **File Management**: Efficient file upload with progress tracking
- **Copy Functionality**: One-click text copying to clipboard

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **OCR Services**: AWS Textract, Mistral OCR
- **AI/ML**: Anthropic Claude Sonnet 4, Mistral Large
- **Document Processing**: Python (PDF to image conversion)

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python 3.8+** (for PDF processing)
3. **API Keys**:
   - AWS credentials (Access Key ID, Secret Access Key)
   - Anthropic API key
   - Mistral API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aws-textract-demo
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Python environment for PDF processing**
   ```bash
   cd scripts
   chmod +x setup.sh
   ./setup.sh
   cd ..
   ```

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1

   # Anthropic API
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Mistral API
   MISTRAL_API_KEY=your_mistral_api_key
   ```

## Usage

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Document Processing Workflow

1. **Choose OCR Method**
   - **AWS Textract**: PDF only, 10MB limit, structured data extraction
   - **Mistral OCR**: PDF + Images, 50MB limit, efficient processing

2. **Upload Document**
   - Select your document based on the chosen OCR method
   - View processing progress and results

3. **Review Extracted Data**
   - **Raw Text**: Complete extracted text content
   - **Key-Value Pairs**: Structured field data with confidence scores
   - **Tables**: Tabular data with proper formatting
   - **Form Fields**: Form data extraction

4. **Ask Questions**
   - **Anthropic Q&A**: Available for all extractions, uses structured data
   - **Mistral Q&A**: Only available when using Mistral OCR, direct document processing

## API Endpoints

### OCR Processing
- `POST /api/extract-text-aws` - AWS Textract processing
- `POST /api/extract-text-mistral` - Mistral OCR processing

### Question Answering
- `POST /api/ask-question-anthropic` - Anthropic-powered Q&A
- `POST /api/ask-question-mistral` - Mistral direct document Q&A

## Architecture

```
├── src/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── extract-text-aws/
│   │   │   ├── extract-text-mistral/
│   │   │   ├── ask-question-anthropic/
│   │   │   └── ask-question-mistral/
│   │   ├── page.tsx             # Main UI component
│   │   └── layout.tsx
│   └── lib/                     # Core services
│       ├── textract.ts          # AWS Textract service
│       ├── mistral-ocr.ts       # Mistral OCR service
│       ├── anthropic.ts         # Anthropic Q&A service
│       └── constants.ts         # Model and config constants
├── scripts/
│   ├── pdf_to_images.py         # PDF conversion script
│   ├── requirements.txt         # Python dependencies
│   └── setup.sh                 # Environment setup
└── docs/
    └── mistral-ocr-api.md       # API documentation
```

## Configuration

### Model Constants
Located in `src/lib/constants.ts`:
- **Anthropic**: Claude Sonnet 4
- **Mistral**: OCR Latest, Large Latest
- **API Limits**: Configurable token and document limits

### AWS Textract Features
- Text extraction with confidence scores
- Key-value pair detection
- Form field recognition
- Table extraction with cell-level data
- Multi-page document support

### Mistral OCR Features
- File upload with signed URLs
- Efficient document ID management
- Direct document Q&A capabilities
- Support for multiple file formats

## Troubleshooting

### Common Issues

1. **PDF Processing Fails**
   - Ensure Python environment is properly set up
   - Check PDF format compatibility (try PDF 1.4-1.7)
   - Verify file size limits (10MB for Textract, 50MB for Mistral)

2. **API Key Errors**
   - Verify all API keys are correctly set in `.env.local`
   - Check AWS credentials have necessary permissions
   - Ensure API keys are not expired

3. **Python Script Issues**
   - Run `cd scripts && ./setup.sh` to reinstall Python dependencies
   - Check Python version compatibility (3.8+)

### File Size Limits
- **AWS Textract**: 10MB per document
- **Mistral OCR**: 50MB per document
- **Image Processing**: Individual pages must be under 10MB after conversion

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for demonstration purposes. Please review the terms of service for each API provider:
- [AWS Textract](https://aws.amazon.com/textract/)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [Mistral AI](https://mistral.ai/)

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review API provider documentation
3. Create an issue in the repository
