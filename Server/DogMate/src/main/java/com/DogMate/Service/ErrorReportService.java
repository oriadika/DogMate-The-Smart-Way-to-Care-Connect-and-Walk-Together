package com.DogMate.Service;

import com.DogMate.DTO.ReportErrorRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ErrorReportService {

    private static final int MAX_MESSAGE_LENGTH = 2_000;
    private static final int MAX_STACK_LENGTH = 8_000;
    private static final DateTimeFormatter SERVER_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JavaMailSender mailSender;
    private final String supportEmail;
    private final String mailFrom;

    public ErrorReportService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${dogmate.support.email:dogmateteam@gmail.com}") String supportEmail,
            @Value("${dogmate.mail.from:dogmateteam@gmail.com}") String mailFrom
    ) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.supportEmail = supportEmail;
        this.mailFrom = mailFrom;
    }

    public void sendCrashReport(ReportErrorRequest request) {
        sendCrashReportInternal(request, 1, 1);
    }

    public int sendCrashReports(List<ReportErrorRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("חסרים פרטי השגיאה");
        }

        int sent = 0;
        int total = requests.size();
        for (int i = 0; i < total; i++) {
            sendCrashReportInternal(requests.get(i), i + 1, total);
            sent++;
        }
        return sent;
    }

    private void sendCrashReportInternal(ReportErrorRequest request, int index, int total) {
        if (request == null) {
            throw new IllegalArgumentException("חסרים פרטי השגיאה");
        }

        String message = normalize(request.getMessage(), MAX_MESSAGE_LENGTH);
        if (message.isEmpty()) {
            throw new IllegalArgumentException("חסר תיאור שגיאה");
        }

        if (mailSender == null) {
            throw new IllegalStateException("שירות הדוא\"ל אינו זמין");
        }

        String stackTrace = normalize(request.getStackTrace(), MAX_STACK_LENGTH);
        String occurredAt = request.getOccurredAt();
        if (occurredAt == null || occurredAt.isBlank()) {
            occurredAt = LocalDateTime.now(ZoneId.of("Asia/Jerusalem")).format(SERVER_TIME_FORMAT);
        }

        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(mailFrom);
        String replyTo = request.getUserEmail();
        if (replyTo != null && !replyTo.isBlank()) {
            email.setReplyTo(replyTo.trim());
        }
        email.setTo(supportEmail);
        email.setSubject(buildSubject(index, total));
        email.setText(buildEmailBody(request, message, stackTrace, occurredAt, index, total));
        mailSender.send(email);
    }

    private String buildSubject(int index, int total) {
        if (total > 1) {
            return "⚠️ [DogMate Crash Report] - Critical System Error (" + index + "/" + total + ")";
        }
        return "⚠️ [DogMate Crash Report] - Critical System Error";
    }

    private String buildEmailBody(
            ReportErrorRequest request,
            String message,
            String stackTrace,
            String occurredAt,
            int index,
            int total
    ) {
        StringBuilder body = new StringBuilder();
        body.append("דיווח שגיאת מערכת מ-DogMate\n");
        body.append("================================\n\n");
        if (total > 1) {
            body.append("דיווח מרוכז: ").append(index).append(" מתוך ").append(total).append('\n');
        }
        body.append("זמן דיווח (לקוח): ").append(occurredAt).append('\n');
        body.append("זמן קבלה (שרת): ")
                .append(LocalDateTime.now(ZoneId.of("Asia/Jerusalem")).format(SERVER_TIME_FORMAT))
                .append('\n');
        body.append("מקור: ").append(valueOrDash(request.getErrorSource())).append('\n');
        body.append("מסך: ").append(valueOrDash(request.getScreen())).append('\n');
        body.append("פלטפורמה: ").append(valueOrDash(request.getPlatform())).append('\n');
        body.append("גרסת אפליקציה: ").append(valueOrDash(request.getAppVersion())).append('\n');
        body.append("מזהה משתמש: ").append(valueOrDash(request.getUserId())).append('\n');
        body.append("אימייל משתמש: ").append(valueOrDash(request.getUserEmail())).append('\n');
        body.append("HTTP סטטוס: ").append(request.getHttpStatus() != null ? request.getHttpStatus() : "-").append('\n');
        body.append("HTTP מתודה: ").append(valueOrDash(request.getHttpMethod())).append('\n');
        body.append("URL בקשה: ").append(valueOrDash(request.getRequestUrl())).append('\n');
        body.append("\nהודעת שגיאה:\n").append(message).append('\n');
        body.append("\nStack trace / פרטים נוספים:\n");
        body.append(stackTrace.isEmpty() ? "(לא סופק stack trace)" : stackTrace).append('\n');
        return body.toString();
    }

    private static String normalize(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength) + "\n...[truncated]";
    }

    private static String valueOrDash(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }
}
