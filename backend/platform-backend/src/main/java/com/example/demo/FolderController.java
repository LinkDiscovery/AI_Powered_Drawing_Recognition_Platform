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

    public FolderController(FolderRepository folderRepository, UserRepository userRepository, JwtUtil jwtUtil) {
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
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

    @DeleteMapping("/{id}")
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

    @PostMapping("/{id}/restore")
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
