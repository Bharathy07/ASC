# PDF Assignment Similarity Checker

This application allows you to compare two PDF assignments for similarity using the Gem API. It provides a web interface where you can upload two PDF files and get a similarity score.

## Features

- Upload and compare two PDF files
- Extract text content from PDFs
- Calculate similarity score using Gem API
- Clean and modern web interface
- Secure file handling

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Gem API key

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd pdf-similarity-checker
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory and add your Gem API key:
```
GEM_API_KEY=your_api_key_here
```

## Usage

1. Start the Flask application:
```bash
python app.py
```

2. Open your web browser and navigate to `http://localhost:5000`

3. Upload two PDF files using the web interface

4. Click "Compare PDFs" to get the similarity score

## Security Notes

- The application only accepts PDF files
- Uploaded files are temporarily stored and immediately deleted after processing
- File size is limited to 16MB
- API keys are stored in environment variables

## Error Handling

The application includes error handling for:
- Invalid file types
- Missing files
- API errors
- File processing errors

## Contributing

Feel free to submit issues and enhancement requests! 