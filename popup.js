const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('status');
const uploadButton = document.getElementById('uploadButton');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const supportedFileTypes = ['jpg','jpeg','png','pdf', 'docx', 'pptx', 'xlsx'];
const downloadButton = document.getElementById('downloadLast');
const queryButton = document.getElementById('queryButton');
const serverResponse = document.getElementById('serverResponse');

let lastCleanedFile = null;
let fileType = "";

const SERVER_URL = 'http://localhost:5000';

// Server communication functionality
queryButton.addEventListener('click', async () => {
    serverResponse.textContent = 'Sending query to server...';

    // send a post to the local server
    try {
        const response = await fetch(`${SERVER_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'Hello from Chrome Extension!'
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        // get response from the server
        const data = await response.json();
        serverResponse.textContent = `Server says: "${data.message}"`;
        console.log('Full response:', data);
    } catch (error) {
        console.error('Error communicating with server:', error);
        serverResponse.textContent = `Error: ${error.message}. Make sure Python server is running on port 5000.`;
    }
});

//Process the file when the user uploads it and changes the outside HTML
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    //Update file name
    fileName.textContent = file.name;
    //Update file size
    fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    fileStatus.textContent = 'Ready to process.';
  }
});

uploadButton.addEventListener('click', async () => {
  //Get the first selected file
  const selectedFile = fileInput.files[0];

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
  else{
    fileType = currentFileType;
  }


  //Try to process the metadata and if it cant gives an error
  try {
    let cleanedFile;
      //Sets the new clean file if successful
      if(fileType == 'pdf')
      {
        cleanedFile = await removePdfMetadata(selectedFile);
      }
      else if(fileType =='jpg' || fileType =='jpeg' || fileType == 'png')
      {
        cleanedFile = await removeImageMetadata(selectedFile);
      }
      else if(fileType === 'docx' || fileType === 'pptx' || fileType === 'xlsx')
      {
        cleanedFile = await removeOfficeMetadata(selectedFile);
      }

      lastCleanedFile = cleanedFile;
      downloadButton.disabled = false;
      fileStatus.textContent = 'Done Processing! You can now download the file!'
  } catch (err) {
      console.error('Error cleaning file:', err);
      fileStatus.textContent = 'Error cleaning file.';
}});

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

    //read the file as a Data URL
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
            }
            else {
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


async function removePdfMetadata(file) {

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

  //Clear metadata fields
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');

  //return PDF
  const cleanedBytes = await pdfDoc.save();
  return new Blob([cleanedBytes], { type: 'application/pdf' });
}

async function removeOfficeMetadata(file)
{
  const arrayBuffer = await file.arrayBuffer();
  const zipFile = await JSZip.loadAsync(arrayBuffer);

  async function cleanXml(dir)
  {
    let xmlFile = zipFile.file(dir);
    if (!xmlFile) return;
    let xmlText = await xmlFile.async("text");

    let xmlObjects = xmljs.xml2js(xmlText, {compact:true});

    const metadataKeys = ["cp:coreProperties", "Properties", "property", "ds:datastoreItem", "ExtendedFileProperties", "ctp:customProperties"];
    const metadataKeysToDelete = [
      "dc:creator", "cp:lastModifiedBy", "dc:title", "dc:subject", "dc:description",
      "dcterms:created", "dcterms:modified", "cp:revision", "Company", "Manager",
      "Application", "AppVersion"
    ];

    function deleteMetadata(obj) {
      if (!obj || typeof obj !== "object") return;
      for (let key in obj) {
        if (metadataKeysToDelete.includes(key)) {
          delete obj[key];
        } else {
          deleteMetadata(obj[key]);
        }
      }
    }

    for (let i = 0; i < metadataKeys.length; i++) {
      if (xmlObjects[metadataKeys[i]]) {
        deleteMetadata(xmlObjects[metadataKeys[i]]);
      }
    }


    const cleanedZip = xmljs.js2xml(xmlObjects, {compact:true});
    zipFile.file(dir, cleanedZip);
  }
  await cleanXml("docProps/core.xml");
  await cleanXml("docProps/app.xml");
  await cleanXml("docProps/custom.xml");

  const fullyCleanedFile = await zipFile.generateAsync({type: "blob"});

  return fullyCleanedFile;

}