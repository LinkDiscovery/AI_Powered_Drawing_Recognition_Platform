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
@org.springframework.web.bind.annotation.CrossOrigin(origins = "*")
public class FileController {

    private final Path uploadRoot = Paths.get("uploads");

    private final com.example.demo.repository.UserFileRepository userFileRepository;
    private final com.example.demo.util.JwtUtil jwtUtil;
    private final com.example.demo.repository.UserRepository userRepository;

    public FileController(com.example.demo.repository.UserFileRepository userFileRepository,
            com.example.demo.util.JwtUtil jwtUtil,
            com.example.demo.repository.UserRepository userRepository) {
        this.userFileRepository = userFileRepository;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String token)
            throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("file is empty");
        }

        String contentType = file.getContentType();
        boolean ok = "application/pdf".equals(contentType) ||
                (contentType != null && contentType.startsWith("image/"));
        if (!ok) {
            return ResponseEntity.badRequest().body("Only PDF or image allowed");
        }

        Files.createDirectories(uploadRoot);

        String original = StringUtils
                .cleanPath(file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename());
        String savedName = UUID.randomUUID() + "_" + original;

        Path savedPath = uploadRoot.resolve(savedName);
        Files.copy(file.getInputStream(), savedPath);

        // ALWAYS create a record
        Long userId = null;
        if (token != null && token.startsWith("Bearer ")) {
            try {
                String jwt = token.substring(7);
                String email = jwtUtil.extractEmail(jwt);
                com.example.demo.model.User user = userRepository.findByEmail(email).orElse(null);
                if (user != null)
                    userId = user.getId();
            } catch (Exception e) {
                // Ignore token error for upload
            }
        }

        com.example.demo.model.UserFile userFile = new com.example.demo.model.UserFile(
                userId, original, savedPath.toString(), file.getSize());
        userFileRepository.save(userFile);

        return ResponseEntity.ok(
                java.util.Map.of(
                        "id", userFile.getId(),
                        "originalName", original,
                        "contentType", contentType,
                        "size", file.getSize(),
                        "savedPath", savedPath.toAbsolutePath().toString()));
    }

    @PostMapping("/api/files/{id}/assign")
    public ResponseEntity<?> assignFile(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                String email = jwtUtil.extractEmail(jwt);
                com.example.demo.model.User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                com.example.demo.model.UserFile file = userFileRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("File not found"));

                // Only allow assignment if currently unassigned? Or allow re-assignment?
                // Let's allow simple assignment.
                file.setUserId(user.getId());
                userFileRepository.save(file);
                return ResponseEntity.ok("Assigned");
            }
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/user/files")
    public ResponseEntity<?> getUserFiles(
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                String email = jwtUtil.extractEmail(jwt);
                com.example.demo.model.User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                java.util.List<com.example.demo.model.UserFile> files = userFileRepository
                        .findByUserIdOrderByUploadTimeDesc(user.getId());
                return ResponseEntity.ok(files);
            }
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
    }
}
