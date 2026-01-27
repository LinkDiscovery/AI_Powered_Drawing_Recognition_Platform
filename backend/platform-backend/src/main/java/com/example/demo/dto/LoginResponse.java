package com.example.demo.dto;

public class LoginResponse {
    private String token;
    private String email;
    private String name;
    private Boolean hasSeenTour;

    public LoginResponse(String token, String email, String name, Boolean hasSeenTour) {
        this.token = token;
        this.email = email;
        this.name = name;
        this.hasSeenTour = hasSeenTour;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getHasSeenTour() {
        return hasSeenTour;
    }

    public void setHasSeenTour(Boolean hasSeenTour) {
        this.hasSeenTour = hasSeenTour;
    }
}
