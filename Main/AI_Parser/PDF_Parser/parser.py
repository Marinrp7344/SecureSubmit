# Mason Andersen
# CS 4930
# SecureSubmit Fall 2025
# This program highlights instances of phonenumbers in a file

import pymupdf
import re
from presidio_analyzer import AnalyzerEngine

# read the pdf into a usable format with given packages
def main():
    doc = pymupdf.open('phoneNums.pdf')
    #doc2 = pymupdf.open('Addresses.pdf')
    # just print out the recognized entities (address, etc)

    # open input PDF
    # load desired page (0-based page number)
    page = doc[0]
    rects = getPhoneNumberRects(page)
    print(rects)
    highlightRects(page, rects, pymupdf.pdfcolor["red"])

    # save the document with these changes, apply annotations
    doc.save("output.pdf")

# gets rectangles (coordinates on pdf) containing a phone number by matching with regex
# returns the list of those rectangles
def getPhoneNumberRects(page):

    # regex that matches phone numbers
    patternMain = re.compile(r"^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}.$")
    patternSub1 = re.compile(r"\(\d{3}\)")
    patternSub2 = re.compile(r"\d{3}[\s.-]?\d{4}")
    # get text from the page then find matches with regex
    words = page.get_text("words")  # extract words on page
    print(words)
    matches = []
    #matches = [w for w in words if pattern.search(w[4])]
    previousword = words[0]
    for w in words:

        # catch cases 123-456-7890
        if patternMain.search(w[4]):
            matches.append(w)

        # catch cases (123) 456-7890, where two words are basically made in one phone number
        if (patternSub1.search(previousword[4]) and patternSub2.search(w[4])):
            matches.append(previousword)
            matches.append(w)

        previousword = w
    print(matches)
    # list for output
    rects = []
    for value in matches:
        # the way it is read this gives you the coordinates of the phone number matched in the regex above
        phoneNumberRect = value[0:4]
        rects.append(phoneNumberRect)
    return rects

# highlights identified rectangles with a given color as annotations
# param rects the rectangles list to highlight all
# param color the color in pymupdf.pdfcolor["whatever"]
# no return
def highlightRects(page, rects, color):
    for i, rect in enumerate(rects):
        annot = page.add_highlight_annot(rects)
        annot.set_colors(stroke=color)
        annot.update()

main()

