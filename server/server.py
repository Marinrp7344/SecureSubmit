# Prototype created with Claude AI
# Then brought in the presidio analysis code and added actual functionality, retuned etc

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
from pypdf import PdfReader

from PresidioAnalysis import *

app = Flask(__name__)
# Enable CORS to allow Chrome extension to communicate
CORS(app)

# so this takes the file from the chrome extension
@app.route('/query', methods=['POST'])
def handle_query():

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    else:
        file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    file_type = request.form.get('fileType', '')
    print(f"Recieved file: {file.filename} (type: {file_type})")

    # do the actual analysis
    try:
        # Read the uploaded file into memory
        file_bytes = file.read()
        file_stream = io.BytesIO(file_bytes)

        # process
        file_out = fileProcess(file_stream)
        #debug_print(file_out)

        file_out.seek(0,2)
        file_size = file_out.tell()
        file_out.seek(0)


        return send_file(
            file_out,
            mimetype = 'application/pdf',
            as_attachment=True,
            download_name=f'highlighted_{file.filename}'
        )

    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

# random debug function for testing
def debug_print(file):
    reader = PdfReader(file)
    for page in reader.pages:
        text=page.extract_text()
        if text:
            print(text)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'running'})

if __name__ == '__main__':
    print("Starting local server on http://localhost:5000")
    print("Server is ready to receive requests from Chrome extension")
    app.run(host='localhost', port=5000, debug=True)