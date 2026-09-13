package com.calorietracker.ai.pdf;

import com.calorietracker.ai.exception.AiExtractionException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class PdfParserUtilTest {

    private final PdfParserUtil parser = new PdfParserUtil();

    @Test
    void extractsTextFromPdfBytes() throws IOException {
        String text = parser.extractText(pdfWithText("Oatmeal 1 bowl 320 kcal"));

        assertThat(text).contains("Oatmeal 1 bowl 320 kcal");
    }

    @Test
    void rejectsEmptyBytes() {
        assertThatThrownBy(() -> parser.extractText(new byte[0]))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("PDF file is required");
    }

    @Test
    void rejectsNonPdfBytes() {
        assertThatThrownBy(() -> parser.extractText("not-a-pdf".getBytes()))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("could not be read");
    }

    public static byte[] pdfWithText(String contents) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText(contents);
                stream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }
}
