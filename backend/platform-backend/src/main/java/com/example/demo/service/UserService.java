package com.example.demo.service;

import com.example.demo.model.User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {
    // In-memory storage for demonstration.
    // In a real app, use a Repository/Database.
    private final Map<String, User> userStore = new ConcurrentHashMap<>();

    public User register(String email, String password, String name) {
        if (userStore.containsKey(email)) {
            throw new RuntimeException("User already exists");
        }
        User user = new User(email, password, name);
        userStore.put(email, user);
        return user;
    }

    public User login(String email, String password) {
        User user = userStore.get(email);
        if (user != null && user.getPassword().equals(password)) {
            return user;
        }
        return null;
    }
}
