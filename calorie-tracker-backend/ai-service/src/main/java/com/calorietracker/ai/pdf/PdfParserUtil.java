package com.calorietracker.ai.pdf;

import com.calorietracker.ai.exception.AiExtractionException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class PdfParserUtil {

    public String extractText(byte[] pdf) {
        if (pdf == null || pdf.length == 0) {
            throw AiExtractionException.badRequest("A PDF file is required");
        }

        try (PDDocument document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            if (text == null || text.isBlank()) {
                throw AiExtractionException.badRequest(
                        "The PDF contained no extractable text (image-only scans are not supported)");
            }
            return text;
        } catch (AiExtractionException ex) {
            throw ex;
        } catch (IOException ex) {
            throw AiExtractionException.badRequest("The PDF could not be read");
        }
    }
}
