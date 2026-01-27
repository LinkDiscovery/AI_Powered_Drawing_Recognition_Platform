package com.example.demo.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.io.File;
import java.util.List;

/**
 * Client for communicating with the Python OCR server
 */
@Component
public class AIServiceClient {

    private final RestTemplate restTemplate;
    private final String aiServerUrl;

    public AIServiceClient(
            RestTemplate restTemplate,
            @Value("${ai.server.url:http://localhost:8000}") String aiServerUrl) {
        this.restTemplate = restTemplate;
        this.aiServerUrl = aiServerUrl;
    }

    /**
     * Check if the AI server is healthy
     */
    public boolean isHealthy() {
        try {
            String url = aiServerUrl + "/health";
            ResponseEntity<HealthResponse> response = restTemplate.getForEntity(url, HealthResponse.class);
            return response.getStatusCode() == HttpStatus.OK
                    && response.getBody() != null
                    && "healthy".equals(response.getBody().status);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extract text from an image file using OCR
     * 
     * @param imageFile The image file to process
     * @return OCR result containing detected text and bounding boxes
     * @throws AIServiceException if the OCR request fails
     */
    public OcrResult extractText(File imageFile) throws AIServiceException {
        return extractText(imageFile, 0);
    }

    /**
     * Extract text from an image file using OCR with rotation
     * 
     * @param imageFile The image file to process
     * @param rotation  Image rotation in degrees (0, 90, 180, 270)
     * @return OCR result containing detected text and bounding boxes
     * @throws AIServiceException if the OCR request fails
     */
    public OcrResult extractText(File imageFile, int rotation) throws AIServiceException {
        try {
            String url = aiServerUrl + "/api/ocr/extract";

            // Prepare multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(imageFile));
            body.add("rotation", String.valueOf(rotation));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Make request
            ResponseEntity<OcrResult> response = restTemplate.postForEntity(url, requestEntity, OcrResult.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                throw new AIServiceException("OCR request failed with status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            throw new AIServiceException("OCR request failed: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new AIServiceException("Unexpected error during OCR: " + e.getMessage(), e);
        }
    }

    // Response DTOs

    public static class HealthResponse {
        public String status;
        public String ocr;
        public String version;
    }

    public static class OcrResult {
        private boolean success;
        private OcrData data;

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public OcrData getData() {
            return data;
        }

        public void setData(OcrData data) {
            this.data = data;
        }

        public String getFullText() {
            return data != null ? data.getText() : "";
        }
    }

    public static class OcrData {
        private String text;
        private Double confidence;
        private List<OcrDetail> details;

        public String getText() {
            return text != null ? text : "";
        }

        public void setText(String text) {
            this.text = text;
        }

        public Double getConfidence() {
            return confidence;
        }

        public void setConfidence(Double confidence) {
            this.confidence = confidence;
        }

        public List<OcrDetail> getDetails() {
            return details;
        }

        public void setDetails(List<OcrDetail> details) {
            this.details = details;
        }
    }

    public static class OcrDetail {
        private String text;
        private List<List<Integer>> bbox;
        private Double confidence;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public List<List<Integer>> getBbox() {
            return bbox;
        }

        public void setBbox(List<List<Integer>> bbox) {
            this.bbox = bbox;
        }

        public Double getConfidence() {
            return confidence;
        }

        public void setConfidence(Double confidence) {
            this.confidence = confidence;
        }
    }

    /**
     * Custom exception for AI service errors
     */
    public static class AIServiceException extends Exception {
        public AIServiceException(String message) {
            super(message);
        }

        public AIServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
