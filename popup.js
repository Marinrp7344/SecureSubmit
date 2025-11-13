const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('status');
const uploadButton = document.getElementById('uploadButton');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const supportedFileTypes = ['jpg','jpeg','png']
const downloadButton = document.getElementById('downloadLast');
let lastCleanedFile = null;

//Process the file when the user uploads it and changes the outside HTML
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    fileName.textContent = file.name; //Update file name
    fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`; //Update file size
    fileStatus.textContent = 'Ready to process.';
  }
});

uploadButton.addEventListener('click', async () => {
    const selectedFile = fileInput.files[0]; // Get the first selected file

    if (!selectedFile) {
        fileStatus.textContent = 'Please pick a file before processing.';
        return;
    } 

    //takes out the file type in string form. EX: .jpg or .pdf
    const currentFileType = selectedFile.name.split('.').pop().toLowerCase();
    if (!supportedFileTypes.includes(currentFileType)) {
        //Notiffies that the file type is not supported
        fileStatus.textContent = 'File type not supported';
        return;
    }
    
    //read metadata with ExifReader
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        const tags = ExifReader.load(arrayBuffer);

        console.log('Metadata found:', tags);
        fileStatus.textContent = 'Metadata read. Check the console (Ctrl+Shift+I).';
    };
    reader.readAsArrayBuffer(selectedFile);
    
    //Try to process the metadata and if it cant gives an error
    try {
        //Sets the new clean file if successful
        const cleanedFile = await removeImageMetadata(selectedFile);
        lastCleanedFile = cleanedFile;
        downloadButton.disabled = false;
        fileStatus.textContent = 'Done Processing! You can now download the file!'
    } catch (err) {
        console.error('Error cleaning file:', err);
        fileStatus.textContent = 'Error cleaning file.';
    }

});

//Download button logic
downloadButton.addEventListener('click', () => {
    if(!lastCleanedFile) {
        return;
    }
    const url = URL.createObjectURL(lastCleanedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_' + fileName.textContent;
    a.click();
    URL.revokeObjectURL(url);

});

async function removeImageMetadata(file) {
    return new Promise((resolve, reject) => {
    const reader = new FileReader();

    //read the file as a Data URL (browser can display it)
    reader.onload = () => {
      const img = new Image();

      //when the image loads, draw it on a canvas
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        //export the canvas as a new image blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              //This new blob is the cleaned version
              resolve(blob);
            } else {
              reject('Failed to create cleaned image.');
            }
          },
          file.type, //preserve original type
          1.0 
        );
      };

      img.onerror = () => reject('Error loading image for cleanup.');
      img.src = reader.result; //Data URL source
    };

    reader.onerror = () => reject('Error reading file.');
    reader.readAsDataURL(file);
  });
}
