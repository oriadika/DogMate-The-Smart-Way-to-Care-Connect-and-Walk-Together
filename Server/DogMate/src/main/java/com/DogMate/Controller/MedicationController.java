package com.DogMate.Controller;

import com.DogMate.Domain.RemindBeforeUnit;
import com.DogMate.DTO.MedicationDTO;
import com.DogMate.Service.MedicationService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> listForUser(@PathVariable String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            List<MedicationDTO> list = medicationService.listForUser(uid);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("medications", list);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה טעינת התרופות: " + e.getMessage()));
        }
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<?> create(@PathVariable String userId, @RequestBody CreateMedicationRequest body) {
        try {
            if (body == null || body.getDogId() == null) {
                return ResponseEntity.badRequest().body(error("חסרים שדות נדרשים"));
            }
            UUID uid = UUID.fromString(userId);
            LocalDate date = parseDate(body.getAdministeredDate());
            LocalDate nextDue = parseOptionalDate(body.getNextDueDate());
            MedicationDTO saved = medicationService.create(uid, body.getDogId(), body.getMedicationName(), date,
                    parseOptionalTime(body.getAdministeredTime()), nextDue,
                    parseOptionalTime(body.getNextDueTime()), body.getVetClinicName(), body.getDescription(),
                    body.getNotificationEnabled(), resolveRemindBeforeValue(body),
                    RemindBeforeUnit.fromString(body.getRemindBeforeUnit()));
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("medication", saved);
            return ResponseEntity.status(HttpStatus.CREATED).body(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה שמירת התרופה: " + e.getMessage()));
        }
    }

    @PutMapping("/{medicationId}")
    public ResponseEntity<?> update(
            @PathVariable String medicationId,
            @RequestParam String userId,
            @RequestBody UpdateMedicationRequest body) {
        try {
            if (body == null || body.getDogId() == null) {
                return ResponseEntity.badRequest().body(error("חסרים שדות נדרשים"));
            }
            UUID uid = UUID.fromString(userId);
            UUID mid = UUID.fromString(medicationId);
            LocalDate date = parseDate(body.getAdministeredDate());
            LocalDate nextDue = parseOptionalDate(body.getNextDueDate());
            MedicationDTO saved = medicationService.update(uid, mid, body.getDogId(), body.getMedicationName(), date,
                    parseOptionalTime(body.getAdministeredTime()), nextDue,
                    parseOptionalTime(body.getNextDueTime()), body.getVetClinicName(), body.getDescription(),
                    body.getNotificationEnabled(), resolveRemindBeforeValue(body),
                    RemindBeforeUnit.fromString(body.getRemindBeforeUnit()));
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("medication", saved);
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשל עדכון התרופה: " + e.getMessage()));
        }
    }

    @PostMapping("/{medicationId}/log-dose")
    public ResponseEntity<?> logDose(
            @PathVariable String medicationId,
            @RequestParam String userId,
            @RequestBody(required = false) LogDoseRequest body
    ) {
        try {
            UUID uid = UUID.fromString(userId);
            UUID mid = UUID.fromString(medicationId);
            MedicationDTO saved;
            if (body != null && body.getAdministeredDate() != null && !body.getAdministeredDate().isBlank()) {
                LocalDate date = parseDate(body.getAdministeredDate());
                LocalTime time = parseOptionalTime(body.getAdministeredTime());
                saved = medicationService.logDoseAt(uid, mid, date, time);
            } else {
                saved = medicationService.logDose(uid, mid);
            }
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("medication", saved);
            ok.put("message", "המנה נרשמה בהצלחה");
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשל רישום המנה: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{medicationId}")
    public ResponseEntity<?> delete(@PathVariable String medicationId, @RequestParam String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            UUID mid = UUID.fromString(medicationId);
            medicationService.delete(uid, mid);
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("message", "התרופה נמחקה בהצלחה");
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה מחיקת התרופה: " + e.getMessage()));
        }
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("חובה להזין תאריך מתן תרופה");
        }
        return LocalDate.parse(raw.trim());
    }

    private static LocalDate parseOptionalDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return LocalDate.parse(raw.trim());
    }

    private static Map<String, Object> error(String message) {
        Map<String, Object> m = new HashMap<>();
        m.put("success", false);
        m.put("error", message);
        return m;
    }

    private static LocalTime parseOptionalTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return LocalTime.parse(raw.trim(), DateTimeFormatter.ofPattern("H:mm"));
    }

    private static Integer resolveRemindBeforeValue(CreateMedicationRequest body) {
        if (body.getRemindBeforeValue() != null) {
            return body.getRemindBeforeValue();
        }
        return body.getRemindDaysBefore();
    }

    private static Integer resolveRemindBeforeValue(UpdateMedicationRequest body) {
        if (body.getRemindBeforeValue() != null) {
            return body.getRemindBeforeValue();
        }
        return body.getRemindDaysBefore();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LogDoseRequest {
        private String administeredDate;
        private String administeredTime;

        public String getAdministeredDate() {
            return administeredDate;
        }

        public void setAdministeredDate(String administeredDate) {
            this.administeredDate = administeredDate;
        }

        public String getAdministeredTime() {
            return administeredTime;
        }

        public void setAdministeredTime(String administeredTime) {
            this.administeredTime = administeredTime;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateMedicationRequest {
        private UUID dogId;
        private String medicationName;
        private String administeredDate;
        private String administeredTime;
        private String nextDueDate;
        private String vetClinicName;
        private String description;
        private Boolean notificationEnabled;
        private Integer remindBeforeValue;
        private String remindBeforeUnit;
        private Integer remindDaysBefore;
        private String nextDueTime;

        public UUID getDogId() {
            return dogId;
        }

        public void setDogId(UUID dogId) {
            this.dogId = dogId;
        }

        public String getMedicationName() {
            return medicationName;
        }

        public void setMedicationName(String medicationName) {
            this.medicationName = medicationName;
        }

        public String getAdministeredDate() {
            return administeredDate;
        }

        public void setAdministeredDate(String administeredDate) {
            this.administeredDate = administeredDate;
        }

        public String getAdministeredTime() {
            return administeredTime;
        }

        public void setAdministeredTime(String administeredTime) {
            this.administeredTime = administeredTime;
        }

        public String getNextDueDate() {
            return nextDueDate;
        }

        public void setNextDueDate(String nextDueDate) {
            this.nextDueDate = nextDueDate;
        }

        public String getNextDueTime() {
            return nextDueTime;
        }

        public void setNextDueTime(String nextDueTime) {
            this.nextDueTime = nextDueTime;
        }

        public String getVetClinicName() {
            return vetClinicName;
        }

        public void setVetClinicName(String vetClinicName) {
            this.vetClinicName = vetClinicName;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public Boolean getNotificationEnabled() {
            return notificationEnabled;
        }

        public void setNotificationEnabled(Boolean notificationEnabled) {
            this.notificationEnabled = notificationEnabled;
        }

        public Integer getRemindBeforeValue() {
            return remindBeforeValue;
        }

        public void setRemindBeforeValue(Integer remindBeforeValue) {
            this.remindBeforeValue = remindBeforeValue;
        }

        public String getRemindBeforeUnit() {
            return remindBeforeUnit;
        }

        public void setRemindBeforeUnit(String remindBeforeUnit) {
            this.remindBeforeUnit = remindBeforeUnit;
        }

        public Integer getRemindDaysBefore() {
            return remindDaysBefore;
        }

        public void setRemindDaysBefore(Integer remindDaysBefore) {
            this.remindDaysBefore = remindDaysBefore;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UpdateMedicationRequest {
        private UUID dogId;
        private String medicationName;
        private String administeredDate;
        private String administeredTime;
        private String nextDueDate;
        private String vetClinicName;
        private String description;
        private Boolean notificationEnabled;
        private Integer remindBeforeValue;
        private String remindBeforeUnit;
        private Integer remindDaysBefore;
        private String nextDueTime;

        public UUID getDogId() {
            return dogId;
        }

        public void setDogId(UUID dogId) {
            this.dogId = dogId;
        }

        public String getMedicationName() {
            return medicationName;
        }

        public void setMedicationName(String medicationName) {
            this.medicationName = medicationName;
        }

        public String getAdministeredDate() {
            return administeredDate;
        }

        public void setAdministeredDate(String administeredDate) {
            this.administeredDate = administeredDate;
        }

        public String getAdministeredTime() {
            return administeredTime;
        }

        public void setAdministeredTime(String administeredTime) {
            this.administeredTime = administeredTime;
        }

        public String getNextDueDate() {
            return nextDueDate;
        }

        public void setNextDueDate(String nextDueDate) {
            this.nextDueDate = nextDueDate;
        }

        public String getNextDueTime() {
            return nextDueTime;
        }

        public void setNextDueTime(String nextDueTime) {
            this.nextDueTime = nextDueTime;
        }

        public String getVetClinicName() {
            return vetClinicName;
        }

        public void setVetClinicName(String vetClinicName) {
            this.vetClinicName = vetClinicName;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public Boolean getNotificationEnabled() {
            return notificationEnabled;
        }

        public void setNotificationEnabled(Boolean notificationEnabled) {
            this.notificationEnabled = notificationEnabled;
        }

        public Integer getRemindBeforeValue() {
            return remindBeforeValue;
        }

        public void setRemindBeforeValue(Integer remindBeforeValue) {
            this.remindBeforeValue = remindBeforeValue;
        }

        public String getRemindBeforeUnit() {
            return remindBeforeUnit;
        }

        public void setRemindBeforeUnit(String remindBeforeUnit) {
            this.remindBeforeUnit = remindBeforeUnit;
        }

        public Integer getRemindDaysBefore() {
            return remindDaysBefore;
        }

        public void setRemindDaysBefore(Integer remindDaysBefore) {
            this.remindDaysBefore = remindDaysBefore;
        }
    }
}
