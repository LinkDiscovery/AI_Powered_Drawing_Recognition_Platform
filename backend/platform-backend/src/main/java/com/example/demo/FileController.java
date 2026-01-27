package com.example.demo;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.io.File;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.example.demo.model.BBox;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

@RestController
@org.springframework.web.bind.annotation.CrossOrigin(origins = "*")
public class FileController {

    private final Path uploadRoot = Paths.get("uploads");

    private final com.example.demo.repository.UserFileRepository userFileRepository;
    private final com.example.demo.util.JwtUtil jwtUtil;
    private final com.example.demo.repository.UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                                        .encode(file.getName(), java.nio.charset.StandardCharsets.UTF_8)
                                        .replaceAll("\\+", "%20") + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }

        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/files/{id}")
    public ResponseEntity<?> getSingleFile(@org.springframework.web.bind.annotation.PathVariable Long id,
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

            return ResponseEntity.ok(file);
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

    @org.springframework.web.bind.annotation.PutMapping("/api/files/{id}/trash")
    public ResponseEntity<?> trashFile(@org.springframework.web.bind.annotation.PathVariable Long id,
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

            file.setTrashed(true);
            file.setTrashedAt(java.time.LocalDateTime.now());
            userFileRepository.save(file);

            return ResponseEntity.ok("Moved to trash");
        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.PutMapping("/api/files/{id}/restore")
    public ResponseEntity<?> restoreFile(@org.springframework.web.bind.annotation.PathVariable Long id,
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

            file.setTrashed(false);
            file.setTrashedAt(null);
            userFileRepository.save(file);

            return ResponseEntity.ok("Restored");
        } catch (Exception e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/user/files")
    public ResponseEntity<?> getUserFiles(
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false, defaultValue = "false") boolean trashed,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                String email = jwtUtil.extractEmail(jwt);
                com.example.demo.model.User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                List<com.example.demo.model.UserFile> files;

                if (trashed) {
                    files = userFileRepository.findByUserIdAndIsTrashedTrueOrderByUploadTimeDesc(user.getId());
                } else if (folderId != null) {
                    files = userFileRepository
                            .findByUserIdAndFolderIdAndIsTrashedFalseOrderByUploadTimeDesc(user.getId(), folderId);
                } else {
                    // Default to Recent (All non-trashed)
                    files = userFileRepository.findByUserIdAndIsTrashedFalseOrderByUploadTimeDesc(user.getId());
                }

                return ResponseEntity.ok(files);
            }
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (Exception e) {
            e.printStackTrace(); // Log error trace
            return ResponseEntity.status(401).body("Unauthorized: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/user/drive/files")
    public ResponseEntity<?> getDriveRootFiles(
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                String email = jwtUtil.extractEmail(jwt);
                com.example.demo.model.User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                // Fetch files where folderId is NULL and isTrashed is false
                List<com.example.demo.model.UserFile> files = userFileRepository
                        .findByUserIdAndFolderIdIsNullAndIsTrashedFalseOrderByUploadTimeDesc(user.getId());

                return ResponseEntity.ok(files);
            }
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body("Unauthorized: " + e.getMessage());
        }
    }

    @PostMapping("/api/files/{id}/coordinates")
    public ResponseEntity<?> updateCoordinates(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Object> coords,
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

            // 1. Get Coordinates & Rotation from Request
            String jsonStr = null;
            if (coords.containsKey("coordinates")) {
                Object coordObj = coords.get("coordinates");
                jsonStr = (coordObj instanceof String) ? (String) coordObj : coordObj.toString();
            }

            int rotation = 0;
            if (coords.containsKey("rotation")) {
                Object rotObj = coords.get("rotation");
                if (rotObj instanceof Number) {
                    rotation = ((Number) rotObj).intValue();
                }
            }

            // Normalize rotation
            rotation = (rotation % 360 + 360) % 360;

            String mimeType = Files.probeContentType(Paths.get(file.getFilePath()));
            boolean isImage = mimeType != null && mimeType.startsWith("image/");

            // 2. Handle Rotation (Physical vs Metadata)

            if (isImage && rotation != 0) {
                // Determine physical paths
                Path filePath = Paths.get(file.getFilePath());
                File imageFile = filePath.toFile();

                // Read Source Image
                java.awt.image.BufferedImage src = javax.imageio.ImageIO.read(imageFile);
                if (src == null)
                    throw new RuntimeException("Could not read image file");

                // Calculate New Dimensions & Transform
                int w = src.getWidth();
                int h = src.getHeight();
                int newW = w;
                int newH = h;

                // If 90 or 270, dimensions swap
                if (rotation == 90 || rotation == 270) {
                    newW = h;
                    newH = w;
                }

                java.awt.image.BufferedImage dest = new java.awt.image.BufferedImage(newW, newH, src.getType());
                java.awt.Graphics2D g2d = dest.createGraphics();

                // Rotate around center
                g2d.translate((newW - w) / 2, (newH - h) / 2); // Center adjustment if needed, but for 90/270 swap it's
                                                               // tricky
                // Simpler approach: Rotate based on quadrant
                // Reset transform
                g2d.setTransform(new java.awt.geom.AffineTransform());

                if (rotation == 90) {
                    g2d.translate(newW, 0);
                    g2d.rotate(Math.toRadians(90));
                } else if (rotation == 180) {
                    g2d.translate(newW, newH);
                    g2d.rotate(Math.toRadians(180));
                } else if (rotation == 270) {
                    g2d.translate(0, newH);
                    g2d.rotate(Math.toRadians(270));
                }

                g2d.drawImage(src, 0, 0, null);
                g2d.dispose();

                // Overwrite File
                String ext = "png";
                if (mimeType != null) {
                    ext = mimeType.substring(mimeType.lastIndexOf("/") + 1);
                }
                javax.imageio.ImageIO.write(dest, ext, imageFile);

                // Update File Metadata (Reset rotation since physical is now correct)
                file.setRotation(0);

                // Update BBoxes to match new Orientation
                // We need to transform the incoming 0-deg coords -> Rotated coords
                if (jsonStr != null) {
                    List<Map<String, Object>> list = objectMapper.readValue(jsonStr,
                            new TypeReference<List<Map<String, Object>>>() {
                            });
                    List<Map<String, Object>> newList = new ArrayList<>();

                    for (Map<String, Object> item : list) {
                        Map<String, Number> rect = (Map<String, Number>) item.get("rect");
                        double bx = rect.get("x").doubleValue();
                        double by = rect.get("y").doubleValue();
                        double bw = rect.get("width").doubleValue();
                        double bh = rect.get("height").doubleValue();

                        double nx = bx, ny = by, nw = bw, nh = bh;

                        // Transformation Logic (Same as Frontend 'toView=true')
                        // 0 -> Rot
                        if (rotation == 90) {
                            // (x, y) -> (h - y - height, x)
                            // newW = h, newH = w
                            nx = h - by - bh;
                            ny = bx;
                            nw = bh;
                            nh = bw;
                        } else if (rotation == 180) {
                            // (w - x - width, h - y - height)
                            nx = w - bx - bw;
                            ny = h - by - bh;
                        } else if (rotation == 270) {
                            // (y, w - x - width)
                            nx = by;
                            ny = w - bx - bw;
                            nw = bh;
                            nh = bw;
                        }

                        // Update Rect in Map
                        item.put("rect", Map.of("x", nx, "y", ny, "width", nw, "height", nh));
                        newList.add(item);
                    }
                    // Serialize back to JSON for processing loop below
                    jsonStr = objectMapper.writeValueAsString(newList);
                }

            } else {
                // PDF or no rotation: Just save the rotation metadata
                file.setRotation(rotation);
            }

            // 3. Save BBoxes (Common Logic)
            if (jsonStr != null) {
                // Parse and Save to BBoxes table
                try {
                    List<Map<String, Object>> list = objectMapper.readValue(jsonStr,
                            new TypeReference<List<Map<String, Object>>>() {
                            });

                    // Clear existing bboxes (orphanRemoval will delete them)
                    file.getBboxes().clear();

                    for (Map<String, Object> item : list) {
                        String type = (String) item.get("type");
                        String frontendId = (String) item.get("id");
                        Map<String, Number> rect = (Map<String, Number>) item.get("rect");
                        Number pageNum = (Number) item.get("page");
                        Integer page = (pageNum != null) ? pageNum.intValue() : 1;

                        if (type != null && rect != null) {
                            BBox bbox = new BBox();
                            bbox.setUserFile(file);
                            bbox.setType(type);
                            bbox.setFrontendId(frontendId);
                            bbox.setX(rect.get("x").doubleValue());
                            bbox.setY(rect.get("y").doubleValue());
                            bbox.setWidth(rect.get("width").doubleValue());
                            bbox.setHeight(rect.get("height").doubleValue());
                            bbox.setPage(page);

                            file.getBboxes().add(bbox);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse coordinates: " + e.getMessage());
                }
            }

            userFileRepository.save(file);

            return ResponseEntity.ok("Coordinates updated");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        }
    }
}
