import os
import json
from flask import Flask, request, render_template, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import io
from datetime import datetime
from difflib import SequenceMatcher

# Try importing optional dependencies
try:
    import PyPDF2
except ImportError:
    print("Warning: PyPDF2 not installed. Please install it using: pip install PyPDF2")
    PyPDF2 = None

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    # Download required NLTK data
    try:
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
    except Exception as e:
        print(f"Warning: Failed to download NLTK data: {str(e)}")
except ImportError:
    print("Warning: NLTK not installed. Please install it using: pip install nltk")
    nltk = None
    word_tokenize = None
    stopwords = None

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'pdf'}
UPLOAD_FOLDER = 'uploads'
DATA_FILE = 'files_data.json'

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# File storage functions
def load_files_data():
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        return {"files": [], "next_id": 1}
    except Exception as e:
        print(f"Error loading files data: {str(e)}")
        return {"files": [], "next_id": 1}

def save_files_data(data):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, default=str)
    except Exception as e:
        print(f"Error saving files data: {str(e)}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_valid_pdf(file):
    if PyPDF2 is None:
        raise ImportError("PyPDF2 is not installed. Please install it using: pip install PyPDF2")
    try:
        PyPDF2.PdfReader(file)
        return True
    except Exception:
        return False

def extract_text_from_pdf(file):
    if PyPDF2 is None:
        raise ImportError("PyPDF2 is not installed. Please install it using: pip install PyPDF2")
    try:
        text = ""
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text.strip()
    except Exception as e:
        raise ValueError(f"Error extracting text from PDF: {str(e)}")

def preprocess_text(text):
    if nltk is None or word_tokenize is None or stopwords is None:
        # If NLTK is not available, just do basic preprocessing
        return ' '.join(word.lower() for word in text.split() if word.isalnum())
    try:
        # Tokenize the text
        tokens = word_tokenize(text.lower())
        
        # Remove stopwords and punctuation
        stop_words = set(stopwords.words('english'))
        tokens = [token for token in tokens if token.isalnum() and token not in stop_words]
        
        return ' '.join(tokens)
    except Exception as e:
        # Fallback to basic preprocessing if NLTK fails
        return ' '.join(word.lower() for word in text.split() if word.isalnum())

def check_similarity(text1, text2):
    if not text1 or not text2:
        raise ValueError("One or both PDFs contain no extractable text")

    try:
        # Preprocess the texts
        processed_text1 = preprocess_text(text1)
        processed_text2 = preprocess_text(text2)

        # Use SequenceMatcher for similarity calculation
        similarity = SequenceMatcher(None, processed_text1, processed_text2).ratio()
        
        return float(similarity)
    except Exception as e:
        raise ValueError(f"Error computing similarity: {str(e)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only PDF files are allowed'}), 400
    
    try:
        # Validate PDF file
        if not is_valid_pdf(file):
            raise ValueError("File is not a valid PDF")
        
        # Extract text from PDF
        text = extract_text_from_pdf(file)
        
        # Store file data
        data = load_files_data()
        file_id = data["next_id"]
        data["next_id"] += 1
        
        secure_name = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{secure_name}")
        
        # Save the file
        file.seek(0)
        file.save(file_path)
        
        # Add file info to data
        data["files"].append({
            "id": file_id,
            "filename": secure_name,
            "path": file_path,
            "content": text,
            "upload_date": datetime.utcnow().isoformat()
        })
        
        save_files_data(data)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file_id': file_id,
            'filename': file.filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/files', methods=['GET'])
def list_files():
    try:
        data = load_files_data()
        return jsonify([{
            'id': file['id'],
            'filename': file['filename'],
            'upload_date': file['upload_date']
        } for file in data["files"]])
    except Exception as e:
        return jsonify({'error': f"Error: {str(e)}"}), 500

@app.route('/delete-file/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        data = load_files_data()
        
        # Find the file with the specified ID
        file_to_delete = None
        for file in data["files"]:
            if file["id"] == file_id:
                file_to_delete = file
                break
        
        if not file_to_delete:
            return jsonify({'error': 'File not found'}), 404
        
        # Delete the file from the filesystem if it exists
        file_path = file_to_delete.get('path')
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete file {file_path}: {str(e)}")
        
        # Remove the file from the data
        data["files"] = [file for file in data["files"] if file["id"] != file_id]
        
        # Save the updated data
        save_files_data(data)
        
        return jsonify({
            'message': f'File "{file_to_delete["filename"]}" deleted successfully',
            'file_id': file_id
        })
    except Exception as e:
        return jsonify({'error': f"Error: {str(e)}"}), 500

@app.route('/compare', methods=['POST'])
def compare_pdfs():
    if 'file1_id' not in request.form or 'file2_id' not in request.form:
        return jsonify({'error': 'Both file IDs are required'}), 400
    
    try:
        file1_id = int(request.form['file1_id'])
        file2_id = int(request.form['file2_id'])
        
        data = load_files_data()
        
        file1 = next((f for f in data["files"] if f["id"] == file1_id), None)
        file2 = next((f for f in data["files"] if f["id"] == file2_id), None)
        
        if not file1 or not file2:
            return jsonify({'error': 'One or both files not found in database'}), 404
        
        similarity_score = check_similarity(file1["content"], file2["content"])
        return jsonify({
            'similarity': similarity_score,
            'message': f'Similarity score: {similarity_score:.2%}',
            'file1': file1["filename"],
            'file2': file2["filename"]
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Error: {str(e)}"}), 500

@app.route('/check-all', methods=['GET'])
def check_all_files():
    try:
        data = load_files_data()
        files = data["files"]
        
        if len(files) == 0:
            return jsonify({
                'error': 'No files found in database',
                'message': 'Please upload files first using the upload form'
            }), 400
        elif len(files) == 1:
            return jsonify({
                'error': 'Insufficient files',
                'message': 'Please upload at least one more file to perform comparison'
            }), 400
        
        results = []
        for i in range(len(files)):
            for j in range(i + 1, len(files)):
                try:
                    file1 = files[i]
                    file2 = files[j]
                    similarity = check_similarity(file1["content"], file2["content"])
                    results.append({
                        'file1_id': file1["id"],
                        'file2_id': file2["id"],
                        'file1_name': file1["filename"],
                        'file2_name': file2["filename"],
                        'similarity': similarity,
                        'similarity_percentage': f"{similarity:.2%}"
                    })
                except Exception as e:
                    print(f"Error comparing {file1['filename']} and {file2['filename']}: {str(e)}")
        
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return jsonify({
            'message': f'Successfully compared {len(results)} file pairs',
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/compare-selected', methods=['POST'])
def compare_selected():
    try:
        data = request.get_json()
        if not data or 'file_ids' not in data:
            return jsonify({'error': 'No file IDs provided'}), 400
        
        file_ids = data['file_ids']
        if len(file_ids) < 2:
            return jsonify({'error': 'Please select at least 2 files to compare'}), 400
        
        files_data = load_files_data()
        files = files_data["files"]
        
        # Get selected files
        selected_files = []
        for file_id in file_ids:
            file = next((f for f in files if f["id"] == file_id), None)
            if not file:
                return jsonify({'error': f'File with ID {file_id} not found'}), 404
            selected_files.append(file)
        
        results = []
        # Compare each pair of selected files
        for i in range(len(selected_files)):
            for j in range(i + 1, len(selected_files)):
                try:
                    file1 = selected_files[i]
                    file2 = selected_files[j]
                    similarity = check_similarity(file1["content"], file2["content"])
                    results.append({
                        'file1_id': file1["id"],
                        'file2_id': file2["id"],
                        'file1_name': file1["filename"],
                        'file2_name': file2["filename"],
                        'similarity': similarity,
                        'similarity_percentage': f"{similarity:.2%}"
                    })
                except Exception as e:
                    print(f"Error comparing {file1['filename']} and {file2['filename']}: {str(e)}")
                    results.append({
                        'file1_id': file1["id"],
                        'file2_id': file2["id"],
                        'file1_name': file1["filename"],
                        'file2_name': file2["filename"],
                        'error': str(e)
                    })
        
        results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        
        return jsonify({
            'message': f'Successfully compared {len(results)} file pairs',
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/check_file/<int:file_id>')
def check_file(file_id):
    try:
        # Get the target file
        target_file = File.query.get_or_404(file_id)
        target_text = target_file.text_content

        # Get all other files
        other_files = File.query.filter(File.id != file_id).all()
        
        if not other_files:
            return jsonify({'error': 'No other files to compare with'})

        # Compare with each file
        comparisons = []
        total_similarity = 0
        
        for other_file in other_files:
            similarity = compare_texts(target_text, other_file.text_content)
            total_similarity += similarity
            
            # Get detailed comparison
            details = get_detailed_comparison(target_text, other_file.text_content)
            
            comparisons.append({
                'file_name': other_file.name,
                'similarity': round(similarity * 100, 2),
                'details': details
            })

        # Calculate average similarity
        avg_similarity = round((total_similarity / len(other_files)) * 100, 2)
        
        return jsonify({
            'similarity': avg_similarity,
            'comparisons': comparisons
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_detailed_comparison(text1, text2):
    """Get detailed comparison information between two texts."""
    matcher = SequenceMatcher(None, text1, text2)
    matches = matcher.get_matching_blocks()
    
    # Calculate statistics
    total_chars = len(text1) + len(text2)
    matched_chars = sum(match.size for match in matches)
    similarity = matched_chars / total_chars if total_chars > 0 else 0
    
    # Get longest matching block
    longest_match = max(matches, key=lambda x: x.size) if matches else None
    
    if longest_match:
        return f"Longest matching block: {longest_match.size} characters"
    return "No significant matches found"

if __name__ == '__main__':
    app.run(debug=True) 