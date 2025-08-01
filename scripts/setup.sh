#!/bin/bash
# Setup Python virtual environment for PDF processing scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

echo "Setting up Python virtual environment for PDF processing..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
pip install -r "$SCRIPT_DIR/requirements.txt"

echo "✅ Setup complete!"
echo ""
echo "To use the virtual environment in the future:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "To test the PDF converter:"
echo "  python3 $SCRIPT_DIR/pdf_to_images.py <pdf_file> <output_dir>"