# try out some presidio stuff
# Per https://microsoft.github.io/presidio/getting_started/getting_started_text/
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
import pymupdf

# seems very promising.
# This also works fully locally as we install spacy's en_core_web_lg model
# It's like 400mb or something.
# Should be secure enough and might be able to integrate presidio_analyzer with pdf highlight, redaction is good.

#text="My phone number is 212-555-5555"
doc = pymupdf.open('phoneNums.pdf')
page = doc[0]
text = page.get_text("words")
text2 = ""
for word in text:
    text2 = text2 + " " + word[4]
print(text2)

# Set up the engine, loads the NLP module (spaCy model by default)
# and other PII recognizers
analyzer = AnalyzerEngine()

# Call analyzer to get results
results = analyzer.analyze(text=text2,
                           entities=["PHONE_NUMBER"],
                           language='en')
print(results)

# Analyzer results are passed to the AnonymizerEngine for anonymization

anonymizer = AnonymizerEngine()

anonymized_text = anonymizer.anonymize(text=text2,analyzer_results=results)

print(anonymized_text)