SecureSubmit is a chrome extension that accepts file uploads, identifies personal information in files, and removes metadata.  
Personal information identification is handled by the Microsoft presidio library (https://microsoft.github.io/presidio/) running on a local python server, using NLP and regex to identify PII.  

To run the extension,  
1. clone the github repo locally and load the folder into chrome as an unpacked extension.  
2. Run server.py locally to allow for presidio PII identification  

## User walkthrough ## 

Download the latest release from github  
- extract files into a folder  
- Go to chrome://extensions/  
- Ensure "Developer Mode" is On  
- go to "Load Unpacked" and select the extracted folder for SecureSubmit  
- Now the chrome extension is loaded  

Local Python Server  
- run `pip install -r requirements.txt`
- then run `python server.py`
- The server will run locally in the background and highlight PII in files
