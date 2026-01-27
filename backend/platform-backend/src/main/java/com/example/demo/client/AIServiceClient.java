package com.example.demo.client;

import com.fasterxml.jackson.annotation.JsonProperty;
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
        try {
            String url = aiServerUrl + "/api/ocr/extract";

            // Prepare multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(imageFile));

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
        @JsonProperty("detected_texts")
        private List<DetectedText> detectedTexts;

        @JsonProperty("full_text")
        private String fullText;

        @JsonProperty("processing_time")
        private Double processingTime;

        public List<DetectedText> getDetectedTexts() {
            return detectedTexts;
        }

        public void setDetectedTexts(List<DetectedText> detectedTexts) {
            this.detectedTexts = detectedTexts;
        }

        public String getFullText() {
            return fullText;
        }

        public void setFullText(String fullText) {
            this.fullText = fullText;
        }

        public Double getProcessingTime() {
            return processingTime;
        }

        public void setProcessingTime(Double processingTime) {
            this.processingTime = processingTime;
        }
    }

    public static class DetectedText {
        private String text;
        private BoundingBox bbox;
        private Double confidence;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public BoundingBox getBbox() {
            return bbox;
        }

        public void setBbox(BoundingBox bbox) {
            this.bbox = bbox;
        }

        public Double getConfidence() {
            return confidence;
        }

        public void setConfidence(Double confidence) {
            this.confidence = confidence;
        }
    }

    public static class BoundingBox {
        @JsonProperty("x_min")
        private Integer xMin;

        @JsonProperty("y_min")
        private Integer yMin;

        @JsonProperty("x_max")
        private Integer xMax;

        @JsonProperty("y_max")
        private Integer yMax;

        public Integer getxMin() {
            return xMin;
        }

        public void setxMin(Integer xMin) {
            this.xMin = xMin;
        }

        public Integer getyMin() {
            return yMin;
        }

        public void setyMin(Integer yMin) {
            this.yMin = yMin;
        }

        public Integer getxMax() {
            return xMax;
        }

        public void setxMax(Integer xMax) {
            this.xMax = xMax;
        }

        public Integer getyMax() {
            return yMax;
        }

        public void setyMax(Integer yMax) {
            this.yMax = yMax;
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
