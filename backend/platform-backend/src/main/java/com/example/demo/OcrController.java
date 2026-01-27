package com.example.demo;

import com.example.demo.client.AIServiceClient;
import com.example.demo.model.BBox;
import com.example.demo.model.TitleBlockText;
import com.example.demo.model.UserFile;
import com.example.demo.repository.TitleBlockTextRepository;
import com.example.demo.repository.UserFileRepository;
import com.example.demo.service.OcrService;
import com.example.demo.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {

    private final OcrService ocrService;
    private final UserFileRepository userFileRepository;
    private final TitleBlockTextRepository titleBlockTextRepository;
    private final JwtUtil jwtUtil;
    private final Path uploadRoot = Paths.get("uploads");

    @Autowired
    public OcrController(OcrService ocrService, UserFileRepository userFileRepository,
            TitleBlockTextRepository titleBlockTextRepository, JwtUtil jwtUtil) {
        this.ocrService = ocrService;
        this.userFileRepository = userFileRepository;
        this.titleBlockTextRepository = titleBlockTextRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/process/{fileId}")
    public ResponseEntity<?> processOcr(@PathVariable Long fileId, @RequestBody BBox bbox,
            @RequestHeader("Authorization") String token) {
        // Validation
        if (!jwtUtil.validateToken(token.substring(7))) {
            return ResponseEntity.status(401).body("Invalid Token");
        }

        Optional<UserFile> fileOpt = userFileRepository.findById(fileId);
        if (fileOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserFile userFile = fileOpt.get();
        Path filePath = Paths.get(userFile.getFilePath());

        try {
            // Perform OCR
            String extractedText = ocrService.performOcr(filePath, bbox);

            // Check for existing OCR result for this file
            Optional<TitleBlockText> existingOpt = titleBlockTextRepository
                    .findTopByUserFileIdOrderByProcessedAtDesc(fileId);

            TitleBlockText titleBlockText;
            if (existingOpt.isPresent()) {
                // Update existing record
                titleBlockText = existingOpt.get();
                titleBlockText.setExtractedText(extractedText);

                // Parse and update fields
                TitleBlockText parsed = ocrService.parseText(extractedText, userFile);
                titleBlockText.setProjectName(parsed.getProjectName());
                titleBlockText.setDrawingName(parsed.getDrawingName());
                titleBlockText.setDrawingNumber(parsed.getDrawingNumber());
                titleBlockText.setScale(parsed.getScale());
                titleBlockText.setProcessedAt(LocalDateTime.now());
            } else {
                // Create new record
                titleBlockText = ocrService.parseText(extractedText, userFile);
            }

            TitleBlockText saved = titleBlockTextRepository.save(titleBlockText);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("OCR processing failed: " + e.getMessage());
        }
    }

    @GetMapping("/results/{fileId}")
    public ResponseEntity<?> getOcrResults(@PathVariable Long fileId, @RequestHeader("Authorization") String token) {
        if (!jwtUtil.validateToken(token.substring(7))) {
            return ResponseEntity.status(401).body("Invalid Token");
        }

        java.util.List<TitleBlockText> results = titleBlockTextRepository.findByUserFileId(fileId);
        return ResponseEntity.ok(results);
    }
}
