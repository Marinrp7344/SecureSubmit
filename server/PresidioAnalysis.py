# Took this from presidio docs and refactored to work better, as the code at
# https://microsoft.github.io/presidio/samples/python/example_pdf_annotation/ had some errors in it for our use case
# ChatGPT used to address the source of errors and get ideas for how to fix the code

# For Presidio
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
import io

# For extracting text and character positions
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar, LTTextLine

# For updating the PDF
from pikepdf import Pdf, Dictionary, Name

#FILENAME = "Main/AI_Parser/PDF_Parser/kagglePDF.pdf"
#OUTPUT_FILE = "sample_annotated.pdf"

analyzer = AnalyzerEngine()


##########################################################################
# STEP 1 — Extract text per page, align Presidio indices with LTChar data
##########################################################################
def readText(FILENAME):

    # setup, final return value as well
    analyzed_character_sets = []

    for page_index, page_layout in enumerate(extract_pages(FILENAME)):

        # get all the lTTextContainers, parse into usable data for highlighting later on
        for text_container in page_layout:
            if isinstance(text_container, LTTextContainer):

                # Extract plain text Presidio will analyze
                text_to_anonymize = text_container.get_text()

                # Analyze with Presidio analyzer engine
                analyzer_results = analyzer.analyze(
                    text=text_to_anonymize,
                    language='en'
                )

                # Build LTChar list in reading order
                ltchars = []
                for text_line in filter(lambda t: isinstance(t, LTTextLine), text_container):
                    for character in filter(lambda t: isinstance(t, LTChar), text_line):
                        ltchars.append(character)

                # FIX: Build aligned character map matching get_text() 1:1
                characters = []
                lt_i = 0

                for ch in text_to_anonymize:
                    if ch == "\n":
                        characters.append(None)      # newline exists in text but not as LTChar
                    else:
                        if lt_i < len(ltchars):
                            characters.append(ltchars[lt_i])
                            lt_i += 1
                        else:
                            characters.append(None)

                # Map Presidio spans → aligned characters
                for result in analyzer_results:
                    span_chars = [c for c in characters[result.start:result.end] if c]

                    analyzed_character_sets.append({
                        "characters": span_chars,
                        "result": result,
                        "page_index": page_index
                    })

    return analyzed_character_sets

# take two rectangles built from other character bounding boxes and combine into a single rectangle
def combine_rect(a, b):
    return (
        min(a[0], b[0]),
        min(a[1], b[1]),
        max(a[2], b[2]),
        max(a[3], b[3])
    )

# takes the character sets identified as PII by presidio and creates bounding boxes for highlights
def setBoundingBoxes(analyzed_character_sets):
    analyzed_bounding_boxes = []

    # so each character in the analyzed character set has some bounding box, we use this to highlight
    for item in analyzed_character_sets:
        chars = item["characters"]
        if not chars:
            continue

        # Start with the first character bbox
        bbox = chars[0].bbox

        # Combine all characters in the span
        for ch in chars:
            bbox = combine_rect(bbox, ch.bbox)

        analyzed_bounding_boxes.append({
            "boundingBox": bbox,
            "result": item["result"],
            "page_index": item["page_index"]
        })

    # go per page
    boxes_by_page = {}

    # take each bounding box, attach it to a page so we annotate correctly
    for item in analyzed_bounding_boxes:
        page = item["page_index"]
        boxes_by_page.setdefault(page, []).append(item)

    # return the bounding boxes n everything
    return boxes_by_page

###########################################
# STEP 4 — Write annotations into the PDF
###########################################
def writeAnnotations(boxes_by_page, FILENAME):
    pdf = Pdf.open(FILENAME)

    # go thru the pdf, annotate each page
    for page_index, page in enumerate(pdf.pages):
        page_annots = []
        page_boxes = boxes_by_page.get(page_index, [])

        for entry in page_boxes:

            bbox = entry["boundingBox"]
            result = entry["result"]

            # PDF highlight quadpoints (standard format)
            quadpoints = [
                bbox[0], bbox[3],
                bbox[2], bbox[3],
                bbox[0], bbox[1],
                bbox[2], bbox[1]
            ]

            annot = Dictionary(
                Type=Name.Annot,
                Subtype=Name.Highlight,
                QuadPoints=quadpoints,
                Rect=[bbox[0], bbox[1], bbox[2], bbox[3]],
                C=[1, 0, 0],     # red
                CA=0.5,          # opacity
                T=result.entity_type
            )

            page_annots.append(annot)

        # annotate each page when PII found
        if page_annots:
            page.Annots = pdf.make_indirect(page_annots)

    #pdf.save(FILENAME)


    #print("Saved:", OUTPUT_FILE)
    # convert pdf to a bytestream object for the chrome extension to understand it
    pdfBytes = io.BytesIO()
    pdf.save(pdfBytes)

    pdfBytes.seek(0)
    return pdfBytes

# Basically the main function
def fileProcess(FILENAME):
    PIIchars = readText(FILENAME)
    bbs = setBoundingBoxes(PIIchars)
    pdf = (writeAnnotations(bbs, FILENAME))
    return pdf


