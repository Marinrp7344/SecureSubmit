SecureSubmit is a chrome extension that accepts file uploads, identifies personal information in files, and removes metadata.  
Personal information identification is handled by the Microsoft presidio library (https://microsoft.github.io/presidio/) running on a local python server, using NLP and regex to identify PII.  

To run the extension,  
1. clone the github repo locally and load the folder into chrome as an unpacked extension.  
2. Run server.py locally to allow for presidio PII identification  



