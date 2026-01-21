package com.example.demo.repository;

import com.example.demo.model.UserFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserFileRepository extends JpaRepository<UserFile, Long> {
    // Default: find all (backward compatibility)
    List<UserFile> findByUserIdOrderByUploadTimeDesc(Long userId);

    // 1. All Non-Trashed (Search/Recent) - Handle NULL isTrashed
    @org.springframework.data.jpa.repository.Query("SELECT f FROM UserFile f WHERE f.userId = :userId AND (f.isTrashed = false OR f.isTrashed IS NULL) ORDER BY f.uploadTime DESC")
    List<UserFile> findByUserIdAndIsTrashedFalseOrderByUploadTimeDesc(Long userId);

    // 2. Root Folder View (folderId IS NULL) - Handle NULL isTrashed
    @org.springframework.data.jpa.repository.Query("SELECT f FROM UserFile f WHERE f.userId = :userId AND f.folderId IS NULL AND (f.isTrashed = false OR f.isTrashed IS NULL) ORDER BY f.uploadTime DESC")
    List<UserFile> findByUserIdAndFolderIdIsNullAndIsTrashedFalseOrderByUploadTimeDesc(Long userId);

    // 3. Folder View - Handle NULL isTrashed
    @org.springframework.data.jpa.repository.Query("SELECT f FROM UserFile f WHERE f.userId = :userId AND f.folderId = :folderId AND (f.isTrashed = false OR f.isTrashed IS NULL) ORDER BY f.uploadTime DESC")
    List<UserFile> findByUserIdAndFolderIdAndIsTrashedFalseOrderByUploadTimeDesc(Long userId, Long folderId);

    // 4. Trash View
    List<UserFile> findByUserIdAndIsTrashedTrueOrderByUploadTimeDesc(Long userId);
}
