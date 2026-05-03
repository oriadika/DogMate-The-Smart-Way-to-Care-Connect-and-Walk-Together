package com.DogMate.Service;

import com.DogMate.Domain.UserAccount;
import com.DogMate.Domain.VerificationCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmailVerificationService {
    private static final int OTP_LENGTH = 6;
    /** Plain-text email: force RTL display in most clients (RLE … PDF). */
    private static final String RTL_EMBED_START = "\u202B";
    private static final String RTL_EMBED_END = "\u202C";
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final IUserRepository userRepository;
    private final IVerificationCodeRepository verificationCodeRepository;
    private final JavaMailSender mailSender;
    private final String appFromEmail;
    private final TransactionTemplate transactionTemplate;
    private final boolean logOtpOnSendFailure;
    /** Empty in default application.properties — mail will not be sent until env vars are set. */
    private final String mailUsername;
    private final String mailPassword;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailVerificationService(
        IUserRepository userRepository,
        IVerificationCodeRepository verificationCodeRepository,
        ObjectProvider<JavaMailSender> mailSenderProvider,
        TransactionTemplate transactionTemplate,
        @Value("${dogmate.mail.from:noreply@dogmate.app}") String appFromEmail,
        @Value("${dogmate.mail.log-otp-on-send-failure:false}") boolean logOtpOnSendFailure,
        @Value("${spring.mail.username:}") String mailUsername,
        @Value("${spring.mail.password:}") String mailPassword
    ) {
        this.userRepository = userRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.transactionTemplate = transactionTemplate;
        this.appFromEmail = appFromEmail;
        this.logOtpOnSendFailure = logOtpOnSendFailure;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword;
    }

    private boolean isSmtpConfigured() {
        return mailSender != null
            && StringUtils.hasText(mailUsername)
            && StringUtils.hasText(mailPassword);
    }

    /**
     * Sends the OTP email for signup (pending registration).
     * @return true if SMTP accepted the message; false if SMTP is not configured or send failed (see logs).
     */
    public boolean sendOtpEmail(String email, String code) {
        return sendVerificationMail(email, code);
    }

    /**
     * Fire-and-forget OTP dispatch used by signup flows so the HTTP request does not block on SMTP.
     */
    @Async
    public void sendOtpEmailAsync(String email, String code) {
        sendVerificationMail(email, code);
    }

    /**
     * Persists the OTP in its own committed transaction before attempting SMTP.
     * Otherwise a failed {@code mailSender.send()} rolls back the whole transaction and no code is stored,
     * while the user row may already be committed — verification then always fails with "code not found".
     */
    public void issueVerificationCode(String rawEmail) {
        String normalizedLookup = normalizeEmailForLookup(rawEmail);
        UserAccount user = loadUserByEmail(normalizedLookup);
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("המייל כבר אומת");
        }
        String canonicalEmail = user.getEmail();
        String code = transactionTemplate.execute(status -> {
            verificationCodeRepository.deleteByEmail(canonicalEmail);
            verificationCodeRepository.deleteByCreatedAtBefore(LocalDateTime.now().minusHours(24));

            String generated = generateSixDigitCode();
            VerificationCode verificationCode = new VerificationCode(
                UUID.randomUUID(),
                canonicalEmail,
                generated,
                LocalDateTime.now()
            );
            verificationCodeRepository.save(verificationCode);
            return generated;
        });
        sendOtpEmailAsync(canonicalEmail, code);
    }

    @Transactional
    public void verifyCode(String rawEmail, String rawCode) {
        String normalizedLookup = normalizeEmailForLookup(rawEmail);
        String code = normalizeCode(rawCode);
        UserAccount user = loadUserByEmail(normalizedLookup);

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("המייל כבר אומת");
        }

        String canonicalEmail = user.getEmail();
        VerificationCode verificationCode = verificationCodeRepository
            .findTopByEmailOrderByCreatedAtDesc(canonicalEmail)
            .orElseThrow(() -> new IllegalArgumentException("לא נמצא קוד אימות"));

        if (verificationCode.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(15))) {
            verificationCodeRepository.deleteByEmail(canonicalEmail);
            throw new IllegalArgumentException("קוד האימות פג תוקף");
        }

        if (!verificationCode.getCode().equals(code)) {
            throw new IllegalArgumentException("קוד האימות שגוי");
        }

        user.setEmailVerified(true);
        userRepository.save(user);
        verificationCodeRepository.deleteByEmail(canonicalEmail);
    }

    private boolean sendVerificationMail(String email, String code) {
        if (!isSmtpConfigured()) {
            log.warn(
                "Mail not sent: set SPRING_MAIL_PASSWORD (and optionally SPRING_MAIL_USERNAME). "
                    + "For Gmail use an App Password; dogmate.mail.from must match the sending account. "
                    + "Intended recipient: {} — OTP (dev only): {}",
                email,
                code
            );
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(appFromEmail);
            message.setTo(email);
            message.setSubject("DogMate – קוד אימות למייל");
            message.setText(
                RTL_EMBED_START
                    + "שלום\n\n"
                    + "DogMate זה קוד האימות שלך באפליקציית\n\n"
                    + code
                    + "\n\n"
                    + ".הקוד תקף ל־15 דקות\n\n"
                    + ".אם לא ביקשת להירשם, אפשר להתעלם ממייל זה\n\n"
                    + ",בברכה\n"
                    + "DogMate צוות"
                    + RTL_EMBED_END
            );
            mailSender.send(message);
            log.info("Verification email sent successfully to {}", email);
            return true;
        } catch (Exception e) {
            log.error(
                "Failed to send verification email to {} (check SMTP auth / App Password / that From matches sender). OTP was: {}",
                email,
                code,
                e
            );
            if (logOtpOnSendFailure) {
                log.warn("dogmate.mail.log-otp-on-send-failure=true: OTP for {} = {}", email, code);
            }
            return false;
        }
    }

    private UserAccount loadUserByEmail(String normalizedLookupEmail) {
        Optional<UserAccount> userOpt = userRepository.findByEmailIgnoreCase(normalizedLookupEmail);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + normalizedLookupEmail);
        }
        return userOpt.get();
    }

    private String normalizeEmailForLookup(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("חובה להזין אימייל");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("חובה להזין קוד אימות");
        }
        String normalized = code.trim();
        if (!normalized.matches("\\d{6}")) {
            throw new IllegalArgumentException("קוד האימות חייב להכיל 6 ספרות");
        }
        return normalized;
    }

    private String generateSixDigitCode() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int value = secureRandom.nextInt(bound);
        return String.format("%06d", value);
    }
}
