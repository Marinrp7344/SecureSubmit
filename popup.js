const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');

uploadButton.addEventListener('click', () => {
    const selectedFile = fileInput.files[0]; // Get the first selected file
    if (selectedFile) {
        uploadFile(selectedFile);
    } else {
        console.log('No file selected.');
    }
});