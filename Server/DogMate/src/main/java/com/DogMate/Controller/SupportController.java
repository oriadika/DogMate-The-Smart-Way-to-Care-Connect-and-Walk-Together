package com.DogMate.Controller;

import com.DogMate.DTO.ReportErrorBatchRequest;
import com.DogMate.DTO.ReportErrorRequest;
import com.DogMate.Service.ErrorReportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final ErrorReportService errorReportService;

    public SupportController(ErrorReportService errorReportService) {
        this.errorReportService = errorReportService;
    }

    @PostMapping("/report-error")
    public ResponseEntity<?> reportError(@RequestBody ReportErrorRequest request) {
        try {
            errorReportService.sendCrashReport(request);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "הדיווח נשלח בהצלחה");
            response.put("sentCount", 1);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("שליחת הדיווח נכשלה: " + e.getMessage()));
        }
    }

    @PostMapping("/report-error/batch")
    public ResponseEntity<?> reportErrorBatch(@RequestBody ReportErrorBatchRequest request) {
        try {
            int sentCount = errorReportService.sendCrashReports(request.getReports());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "הדיווחים נשלחו בהצלחה");
            response.put("sentCount", sentCount);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("שליחת הדיווחים נכשלה: " + e.getMessage()));
        }
    }

    private Map<String, Object> createErrorResponse(String error) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        return response;
    }
}
