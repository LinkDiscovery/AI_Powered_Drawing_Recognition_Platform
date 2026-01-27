package com.example.demo.repository;

import com.example.demo.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {

    // Find folders by user and parent (for hierarchy navigation)
    List<Folder> findByUserIdAndParentFolderIdAndIsTrashedFalse(Long userId, Long parentFolderId);

    // Find root folders (parent is null)
    List<Folder> findByUserIdAndParentFolderIdIsNullAndIsTrashedFalse(Long userId);

    // Find trashed folders
    List<Folder> findByUserIdAndIsTrashedTrue(Long userId);

    // Find sub-folders for recursive delete
    List<Folder> findByParentFolderId(Long parentId);
}
