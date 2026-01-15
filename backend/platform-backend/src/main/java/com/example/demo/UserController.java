package com.example.demo;

import com.example.demo.service.UserService;
import com.example.demo.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public UserController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/notes")
    public ResponseEntity<?> getNotes(@RequestHeader("Authorization") String token) {
        try {
            String email = extractEmail(token);
            String notes = userService.getNotes(email);
            return ResponseEntity.ok(Map.of("notes", notes != null ? notes : ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Token");
        }
    }

    @PostMapping("/notes")
    public ResponseEntity<?> saveNotes(@RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        try {
            String email = extractEmail(token);
            String notes = body.get("notes");
            userService.updateNotes(email, notes);
            return ResponseEntity.ok("Saved");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Token or Error");
        }
    }

    private String extractEmail(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return jwtUtil.extractEmail(bearerToken.substring(7));
        }
        throw new RuntimeException("Invalid Token Format");
    }
}
