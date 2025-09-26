import spacy
from spacypdfreader.spacypdfreader import pdf_reader

# set up a natural language processing model
nlp = spacy.load('en_core_web_sm')

# read the pdf into a usable format with given packages
doc = pdf_reader('Addresses.pdf', nlp)

# just print out the recognized entities (address, etc)
for ent in doc.ents:
    print(f"Entity: {ent.text}, Label: {ent.label_}")


