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

    @org.springframework.web.bind.annotation.GetMapping("/api/files/{id}/download")
    public ResponseEntity<?> downloadFile(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            String jwt = token.substring(7);
            String email = jwtUtil.extractEmail(jwt);
            com.example.demo.model.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            com.example.demo.model.UserFile file = userFileRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (!user.getId().equals(file.getUserId())) {
                return ResponseEntity.status(403).body("Forbidden");
            }

            Path path = Paths.get(file.getFilePath());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = Files.probeContentType(path);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=\"" + java.net.URLEncoder
                                        .encode(file.getFileName(), java.nio.charset.StandardCharsets.UTF_8)
                                        .replaceAll("\\+", "%20") + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }

        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/api/files/{id}")
    public ResponseEntity<?> deleteFile(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            String jwt = token.substring(7);
            String email = jwtUtil.extractEmail(jwt);
            com.example.demo.model.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            com.example.demo.model.UserFile file = userFileRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (!user.getId().equals(file.getUserId())) {
                return ResponseEntity.status(403).body("Forbidden");
            }

            // Delete from DB
            userFileRepository.delete(file);

            // Delete from Filesystem (Optional, but good practice)
            try {
                Path path = Paths.get(file.getFilePath());
                Files.deleteIfExists(path);
            } catch (IOException e) {
                // Log error but prioritize DB consistency
                System.err.println("Failed to delete file from disk: " + e.getMessage());
            }

            return ResponseEntity.ok("Deleted");

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

                System.out.println("DEBUG: User " + email + " requesting files. Found: " + files.size());

                return ResponseEntity.ok(files);
            }
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (Exception e) {
            e.printStackTrace(); // Log error trace
            return ResponseEntity.status(401).body("Unauthorized");
        }
    }

    @PostMapping("/api/files/{id}/coordinates")
    public ResponseEntity<?> updateCoordinates(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Double> coords,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            String jwt = token.substring(7);
            String email = jwtUtil.extractEmail(jwt);
            com.example.demo.model.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            com.example.demo.model.UserFile file = userFileRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (!user.getId().equals(file.getUserId())) {
                return ResponseEntity.status(403).body("Forbidden");
            }

            if (coords.containsKey("x"))
                file.setTitleX(coords.get("x"));
            if (coords.containsKey("y"))
                file.setTitleY(coords.get("y"));
            if (coords.containsKey("width"))
                file.setTitleWidth(coords.get("width"));
            if (coords.containsKey("height"))
                file.setTitleHeight(coords.get("height"));

            userFileRepository.save(file);

            return ResponseEntity.ok("Coordinates updated");

        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }
}
