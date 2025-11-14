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

        const data = await response.json();
        serverResponse.textContent = `Server says: "${data.message}"`;
        console.log('Full response:', data);
    } catch (error) {
        console.error('Error communicating with server:', error);
        serverResponse.textContent = `Error: ${error.message}. Make sure Python server is running on port 5000.`;
    }
});

// Original file processing code
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        fileStatus.textContent = 'Ready to process.';
    }
});

uploadButton.addEventListener('click', async () => {
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
        fileStatus.textContent = 'Please pick a file before processing.';
        return;
    }

    const currentFileType = selectedFile.name.split('.').pop().toLowerCase();
    if (!supportedFileTypes.includes(currentFileType)) {
        fileStatus.textContent = 'File type not supported';
        return;
    }
    else{
        fileType = currentFileType;
    }

    try {
        let cleanedFile;
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
        fileStatus.textContent = 'Done Processing! You can now download the file!';
    } catch (err) {
        console.error('Error cleaning file:', err);
        fileStatus.textContent = 'Error cleaning file.';
    }
});

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

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        }
                        else {
                            reject('Failed to create cleaned image.');
                        }
                    },
                    file.type,
                    1.0
                );
            };

            img.onerror = () => reject('Error loading image for cleanup.');
            img.src = reader.result;
        };

        reader.onerror = () => reject('Error reading file.');
        reader.readAsDataURL(file);
    });
}

async function removePdfMetadata(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');

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