package com.example.demo.model;

import jakarta.persistence.*;
import com.example.demo.model.UserFile;

@Entity
@Table(name = "bboxes")
public class BBox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_file_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    @com.fasterxml.jackson.annotation.JsonBackReference
    private UserFile userFile;

    @Column(nullable = false)
    private String type; // title, front, side, plan

    @Column(nullable = false)
    private Double x;

    @Column(nullable = false)
    private Double y;

    @Column(nullable = false)
    private Double width;

    @Column(nullable = false)
    private Double height;

    // Optional frontend ID for reference if needed, but DB ID is primary
    private String frontendId;

    @Column(columnDefinition = "integer default 1")
    private Integer page = 1;

    @Column(columnDefinition = "integer default 0")
    private Integer rotation = 0; // 0, 90, 180, 270 degrees

    public BBox() {
    }

    public BBox(UserFile userFile, String type, Double x, Double y, Double width, Double height, Integer page,
            String frontendId, Integer rotation) {
        this.userFile = userFile;
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.page = (page == null) ? 1 : page;
        this.frontendId = frontendId;
        this.rotation = (rotation == null) ? 0 : rotation;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public UserFile getUserFile() {
        return userFile;
    }

    public void setUserFile(UserFile userFile) {
        this.userFile = userFile;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public Double getWidth() {
        return width;
    }

    public void setWidth(Double width) {
        this.width = width;
    }

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public String getFrontendId() {
        return frontendId;
    }

    public void setFrontendId(String frontendId) {
        this.frontendId = frontendId;
    }

    public Integer getPage() {
        return page;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getRotation() {
        return rotation;
    }

    public void setRotation(Integer rotation) {
        this.rotation = rotation;
    }
}
