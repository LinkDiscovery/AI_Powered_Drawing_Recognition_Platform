package com.example.demo;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class FileController {

    private final Path uploadRoot = Paths.get("uploads");

    @PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("file is empty");
        }

        // PDF 또는 이미지 정도만 허용(원하면 확장 가능)
        String contentType = file.getContentType();
        boolean ok = "application/pdf".equals(contentType) ||
                     (contentType != null && contentType.startsWith("image/"));
        if (!ok) {
            return ResponseEntity.badRequest().body("Only PDF or image allowed");
        }

        Files.createDirectories(uploadRoot);

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename());
        String savedName = UUID.randomUUID() + "_" + original;

        Path savedPath = uploadRoot.resolve(savedName);
        Files.copy(file.getInputStream(), savedPath);

        return ResponseEntity.ok(
            java.util.Map.of(
                "originalName", original,
                "contentType", contentType,
                "size", file.getSize(),
                "savedPath", savedPath.toAbsolutePath().toString()
            )
        );
    }
}

