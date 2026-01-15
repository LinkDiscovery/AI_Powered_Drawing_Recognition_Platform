package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_files")
public class UserFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private Long userId; // Simple logical FK (or use @ManyToOne with User)

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private Long fileSize;

    private LocalDateTime uploadTime;

    public UserFile() {
        this.uploadTime = LocalDateTime.now();
    }

    public UserFile(Long userId, String fileName, String filePath, Long fileSize) {
        this.userId = userId;
        this.fileName = fileName;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.uploadTime = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public LocalDateTime getUploadTime() {
        return uploadTime;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
}
