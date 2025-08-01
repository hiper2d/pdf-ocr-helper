# PDF Processing Scripts

This directory contains Python scripts for PDF processing that are used by the Node.js application.

## Setup

1. **Run the setup script to create a virtual environment and install dependencies:**
   ```bash
   cd scripts
   ./setup.sh
   ```

2. **Manual setup (alternative):**
   ```bash
   cd scripts
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Scripts

### pdf_to_images.py

Converts PDF pages to high-quality PNG images using PyMuPDF.

**Usage:**
```bash
python3 pdf_to_images.py <pdf_file> <output_directory>
```

**Example:**
```bash
python3 pdf_to_images.py ../test.pdf ./output_images
```

**Output:**
Returns JSON with conversion results:
```json
{
  "success": true,
  "pages": 3,
  "image_paths": [
    "/path/to/output_images/page-1.png",
    "/path/to/output_images/page-2.png",
    "/path/to/output_images/page-3.png"
  ]
}
```

## Dependencies

- **PyMuPDF (fitz)**: For PDF processing and image conversion
  - Provides high-quality PDF to image conversion
  - Supports various image formats
  - Same library used in the working Python example

## Integration

The Node.js application automatically:
1. Detects if the virtual environment exists
2. Uses `scripts/venv/bin/python` if available
3. Falls back to system `python3` if venv is not set up
4. Calls the Python scripts via child process
5. Parses JSON output for results

This approach avoids Node.js binary dependency issues while leveraging reliable Python PDF libraries.