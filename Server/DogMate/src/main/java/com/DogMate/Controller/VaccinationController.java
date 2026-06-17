package com.DogMate.Controller;

import com.DogMate.DTO.VaccinationDTO;
import com.DogMate.Service.VaccinationService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vaccinations")
public class VaccinationController {

    private final VaccinationService vaccinationService;

    public VaccinationController(VaccinationService vaccinationService) {
        this.vaccinationService = vaccinationService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> listForUser(@PathVariable String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            List<VaccinationDTO> list = vaccinationService.listForUser(uid);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("vaccinations", list);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה טעינת החיסונים: " + e.getMessage()));
        }
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<?> create(@PathVariable String userId, @RequestBody CreateVaccinationRequest body) {
        try {
            if (body == null || body.getDogId() == null) {
                return ResponseEntity.badRequest().body(error("חסרים שדות נדרשים"));
            }
            UUID uid = UUID.fromString(userId);
            LocalDate date = parseDate(body.getAdministeredDate());
            LocalDate nextDue = parseOptionalDate(body.getNextDueDate());
            VaccinationDTO saved = vaccinationService.create(uid, body.getDogId(), body.getVaccineName(), date,
                    nextDue, body.getVetClinicName(), body.getDescription(),
                    body.getNotificationEnabled(), body.getRemindDaysBefore());
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("vaccination", saved);
            return ResponseEntity.status(HttpStatus.CREATED).body(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה שמירת החיסון: " + e.getMessage()));
        }
    }

    @PutMapping("/{vaccinationId}")
    public ResponseEntity<?> update(
            @PathVariable String vaccinationId,
            @RequestParam String userId,
            @RequestBody UpdateVaccinationRequest body) {
        try {
            if (body == null || body.getDogId() == null) {
                return ResponseEntity.badRequest().body(error("חסרים שדות נדרשים"));
            }
            UUID uid = UUID.fromString(userId);
            UUID vid = UUID.fromString(vaccinationId);
            LocalDate date = parseDate(body.getAdministeredDate());
            LocalDate nextDue = parseOptionalDate(body.getNextDueDate());
            VaccinationDTO saved = vaccinationService.update(uid, vid, body.getDogId(), body.getVaccineName(), date,
                    nextDue, body.getVetClinicName(), body.getDescription(),
                    body.getNotificationEnabled(), body.getRemindDaysBefore());
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("vaccination", saved);
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשל עדכון החיסון: " + e.getMessage()));
        }
    }

    @PostMapping("/{vaccinationId}/log-dose")
    public ResponseEntity<?> logDose(@PathVariable String vaccinationId, @RequestParam String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            UUID vid = UUID.fromString(vaccinationId);
            VaccinationDTO saved = vaccinationService.logDose(uid, vid);
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("vaccination", saved);
            ok.put("message", "החיסון נרשם בהצלחה");
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשל רישום החיסון: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{vaccinationId}")
    public ResponseEntity<?> delete(@PathVariable String vaccinationId, @RequestParam String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            UUID vid = UUID.fromString(vaccinationId);
            vaccinationService.delete(uid, vid);
            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("message", "החיסון נמחק בהצלחה");
            return ResponseEntity.ok(ok);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("נכשלה מחיקת החיסון: " + e.getMessage()));
        }
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("חובה להזין תאריך חיסון");
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateVaccinationRequest {
        private UUID dogId;
        private String vaccineName;
        private String administeredDate;
        private String nextDueDate;
        private String vetClinicName;
        private String description;
        private Boolean notificationEnabled;
        private String remindDaysBefore;

        public UUID getDogId() {
            return dogId;
        }

        public void setDogId(UUID dogId) {
            this.dogId = dogId;
        }

        public String getVaccineName() {
            return vaccineName;
        }

        public void setVaccineName(String vaccineName) {
            this.vaccineName = vaccineName;
        }

        public String getAdministeredDate() {
            return administeredDate;
        }

        public void setAdministeredDate(String administeredDate) {
            this.administeredDate = administeredDate;
        }

        public String getNextDueDate() {
            return nextDueDate;
        }

        public void setNextDueDate(String nextDueDate) {
            this.nextDueDate = nextDueDate;
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

        public String getRemindDaysBefore() {
            return remindDaysBefore;
        }

        public void setRemindDaysBefore(String remindDaysBefore) {
            this.remindDaysBefore = remindDaysBefore;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UpdateVaccinationRequest {
        private UUID dogId;
        private String vaccineName;
        private String administeredDate;
        private String nextDueDate;
        private String vetClinicName;
        private String description;
        private Boolean notificationEnabled;
        private String remindDaysBefore;

        public UUID getDogId() {
            return dogId;
        }

        public void setDogId(UUID dogId) {
            this.dogId = dogId;
        }

        public String getVaccineName() {
            return vaccineName;
        }

        public void setVaccineName(String vaccineName) {
            this.vaccineName = vaccineName;
        }

        public String getAdministeredDate() {
            return administeredDate;
        }

        public void setAdministeredDate(String administeredDate) {
            this.administeredDate = administeredDate;
        }

        public String getNextDueDate() {
            return nextDueDate;
        }

        public void setNextDueDate(String nextDueDate) {
            this.nextDueDate = nextDueDate;
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

        public String getRemindDaysBefore() {
            return remindDaysBefore;
        }

        public void setRemindDaysBefore(String remindDaysBefore) {
            this.remindDaysBefore = remindDaysBefore;
        }
    }
}
