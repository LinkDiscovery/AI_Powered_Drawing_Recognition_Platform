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

    @Column(nullable = true)
    private Double titleX;

    @Column(nullable = true)
    private Double titleY;

    @Column(nullable = true)
    private Double titleWidth;

    @Column(nullable = true)
    private Double titleHeight;

    @Column(columnDefinition = "TEXT")
    private String coordinates;

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

    public Double getTitleX() {
        return titleX;
    }

    public void setTitleX(Double titleX) {
        this.titleX = titleX;
    }

    public Double getTitleY() {
        return titleY;
    }

    public void setTitleY(Double titleY) {
        this.titleY = titleY;
    }

    public Double getTitleWidth() {
        return titleWidth;
    }

    public void setTitleWidth(Double titleWidth) {
        this.titleWidth = titleWidth;
    }

    public Double getTitleHeight() {
        return titleHeight;
    }

    public void setTitleHeight(Double titleHeight) {
        this.titleHeight = titleHeight;
    }

    public String getCoordinates() {
        return coordinates;
    }

    public void setCoordinates(String coordinates) {
        this.coordinates = coordinates;
    }
}
