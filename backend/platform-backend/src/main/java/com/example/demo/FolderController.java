package com.example.demo;

import com.example.demo.model.Folder;
import com.example.demo.model.User;
import com.example.demo.repository.FolderRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/folders")
@CrossOrigin(origins = "*")
public class FolderController {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    private final com.example.demo.repository.UserFileRepository userFileRepository;

    public FolderController(FolderRepository folderRepository, UserRepository userRepository, JwtUtil jwtUtil,
            com.example.demo.repository.UserFileRepository userFileRepository) {
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.userFileRepository = userFileRepository;
    }

    private User getUserFromToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            String email = jwtUtil.extractEmail(jwt);
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<?> createFolder(@RequestHeader("Authorization") String token,
            @RequestBody Folder folderRequest) {
        User user = getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).body("Unauthorized");

        Folder folder = new Folder(folderRequest.getName(), user.getId(), folderRequest.getParentFolderId());
        Folder savedFolder = folderRepository.save(folder);
        return ResponseEntity.ok(savedFolder);
    }

    @GetMapping
    public ResponseEntity<?> getFolders(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) Long parentId,
            @RequestParam(required = false, defaultValue = "false") boolean trashed) {

        User user = getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).body("Unauthorized");

        List<Folder> folders;
        if (trashed) {
            folders = folderRepository.findByUserIdAndIsTrashedTrue(user.getId());
        } else if (parentId != null) {
            folders = folderRepository.findByUserIdAndParentFolderIdAndIsTrashedFalse(user.getId(), parentId);
        } else {
            folders = folderRepository.findByUserIdAndParentFolderIdIsNullAndIsTrashedFalse(user.getId());
        }
        return ResponseEntity.ok(folders);
    }

    @PutMapping("/{id}/trash")
    public ResponseEntity<?> trashFolder(@RequestHeader("Authorization") String token, @PathVariable Long id) {
        User user = getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).body("Unauthorized");

        Optional<Folder> folderOpt = folderRepository.findById(id);
        if (folderOpt.isPresent() && folderOpt.get().getUserId().equals(user.getId())) {
            Folder folder = folderOpt.get();
            folder.setTrashed(true);
            folderRepository.save(folder);
            return ResponseEntity.ok("Folder moved to trash");
        }
        return ResponseEntity.status(404).body("Folder not found");
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteFolder(@RequestHeader("Authorization") String token, @PathVariable Long id) {
        User user = getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).body("Unauthorized");

        Optional<Folder> folderOpt = folderRepository.findById(id);
        if (folderOpt.isPresent() && folderOpt.get().getUserId().equals(user.getId())) {
            try {
                deleteFolderRecursive(id);
                return ResponseEntity.ok("Folder permanently deleted");
            } catch (Exception e) {
                return ResponseEntity.status(500).body("Error deleting folder: " + e.getMessage());
            }
        }
        return ResponseEntity.status(404).body("Folder not found");
    }

    private void deleteFolderRecursive(Long folderId) {
        // 1. Find sub-folders
        List<Folder> subFolders = folderRepository.findByParentFolderId(folderId);
        for (Folder sub : subFolders) {
            deleteFolderRecursive(sub.getId());
        }

        // 2. Delete files in this folder
        userFileRepository.deleteByFolderId(folderId);

        // 3. Delete this folder
        folderRepository.deleteById(folderId);
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreFolder(@RequestHeader("Authorization") String token, @PathVariable Long id) {
        User user = getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).body("Unauthorized");

        Optional<Folder> folderOpt = folderRepository.findById(id);
        if (folderOpt.isPresent() && folderOpt.get().getUserId().equals(user.getId())) {
            Folder folder = folderOpt.get();
            folder.setTrashed(false);
            folderRepository.save(folder);
            return ResponseEntity.ok("Folder restored");
        }
        return ResponseEntity.status(404).body("Folder not found");
    }
}
