#!/usr/bin/env python3
"""
PDF to Images Converter
Converts PDF pages to high-quality PNG images for OCR processing.
"""

import sys
import os
import json
import fitz  # PyMuPDF
from pathlib import Path

def pdf_to_images(pdf_path: str, output_dir: str) -> dict:
    """
    Convert PDF pages to images.
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save generated images
        
    Returns:
        Dict with success status and image paths
    """
    try:
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Open PDF
        doc = fitz.open(pdf_path)
        image_paths = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Convert to image with high DPI for better OCR results (2x scale like Python example)
            mat = fitz.Matrix(2, 2)  # 2x scale for better quality
            pix = page.get_pixmap(matrix=mat)
            
            # Save as PNG
            image_path = os.path.join(output_dir, f"page-{page_num + 1}.png")
            pix.save(image_path)
            image_paths.append(image_path)
            
        doc.close()
        
        return {
            "success": True,
            "pages": len(image_paths),
            "image_paths": image_paths
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    if len(sys.argv) != 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python pdf_to_images.py <pdf_path> <output_dir>"
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    # Validate PDF file exists
    if not os.path.exists(pdf_path):
        print(json.dumps({
            "success": False,
            "error": f"PDF file not found: {pdf_path}"
        }))
        sys.exit(1)
    
    # Convert PDF to images
    result = pdf_to_images(pdf_path, output_dir)
    print(json.dumps(result))

if __name__ == "__main__":
    main()