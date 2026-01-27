package com.example.demo.service;

import com.example.demo.client.AIServiceClient;
import com.example.demo.model.BBox;
import com.example.demo.model.TitleBlockText;
import com.example.demo.model.UserFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.pdfbox.Loader;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {

    @Autowired
    private AIServiceClient aiServiceClient;

    public String performOcr(Path filePath, BBox bbox) throws IOException, AIServiceClient.AIServiceException {
        File file = filePath.toFile();
        BufferedImage image = null;

        if (file.getName().toLowerCase().endsWith(".pdf")) {
            // PDFBox 3.x uses Loader.loadPDF(file)
            try (PDDocument doc = Loader.loadPDF(file)) {
                PDFRenderer pdfRenderer = new PDFRenderer(doc);
                int pageIndex = (bbox.getPage() != null && bbox.getPage() > 0) ? bbox.getPage() - 1 : 0;
                float scale = 3.0f;
                image = pdfRenderer.renderImage(pageIndex, scale);

                int x = (int) (bbox.getX() * scale);
                int y = (int) (bbox.getY() * scale);
                int w = (int) (bbox.getWidth() * scale);
                int h = (int) (bbox.getHeight() * scale);

                x = Math.max(0, x);
                y = Math.max(0, y);
                w = Math.min(w, image.getWidth() - x);
                h = Math.min(h, image.getHeight() - y);

                if (w > 0 && h > 0) {
                    image = image.getSubimage(x, y, w, h);
                }
            }
        } else {
            image = ImageIO.read(file);
            int x = bbox.getX().intValue();
            int y = bbox.getY().intValue();
            int w = bbox.getWidth().intValue();
            int h = bbox.getHeight().intValue();

            x = Math.max(0, x);
            y = Math.max(0, y);
            w = Math.min(w, image.getWidth() - x);
            h = Math.min(h, image.getHeight() - y);

            if (w > 0 && h > 0) {
                image = image.getSubimage(x, y, w, h);
            }
        }

        if (image == null) {
            throw new IOException("Could not load image for OCR");
        }

        // Save cropped image to temporary file for Python OCR server
        Path tempImagePath = Files.createTempFile("ocr_crop_", ".png");
        try {
            File tempImageFile = tempImagePath.toFile();
            ImageIO.write(image, "png", tempImageFile);

            // Call Python OCR server
            AIServiceClient.OcrResult result = aiServiceClient.extractText(tempImageFile);

            // Return full text from OCR result
            return result.getFullText();
        } finally {
            // Clean up temporary file
            Files.deleteIfExists(tempImagePath);
        }
    }

    public TitleBlockText parseText(String text, UserFile userFile) {
        TitleBlockText result = new TitleBlockText();
        result.setUserFile(userFile);
        result.setExtractedText(text);

        result.setProjectName(findValue(text, "(공사명|Project Name)\\s*[:\\-]?\\s*(.*)"));
        result.setDrawingName(findValue(text, "(도면명|Drawing Name|Title)\\s*[:\\-]?\\s*(.*)"));
        result.setDrawingNumber(findValue(text, "(도면번호|Dwg No\\.?)\\s*[:\\-]?\\s*(.*)"));
        String scale = findValue(text, "(축척|Scale)\\s*[:\\-]?\\s*([\\d\\/:]+)");
        result.setScale(scale);

        return result;
    }

    private String findValue(String text, String regex) {
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(2).trim();
        }
        return null;
    }
}
