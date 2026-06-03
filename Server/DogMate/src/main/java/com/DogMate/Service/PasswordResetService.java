package com.DogMate.Service;

import com.DogMate.Domain.PasswordResetToken;
import com.DogMate.Domain.UserAccount;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
public class PasswordResetService {
    private static final int OTP_LENGTH = 6;
    private static final int TOKEN_TTL_MINUTES = 5;

    private final IUserRepository userRepository;
    private final IPasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationService emailVerificationService;
    private final UserService userService;
    private final TransactionTemplate transactionTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
        IUserRepository userRepository,
        IPasswordResetTokenRepository passwordResetTokenRepository,
        EmailVerificationService emailVerificationService,
        UserService userService,
        TransactionTemplate transactionTemplate
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationService = emailVerificationService;
        this.userService = userService;
        this.transactionTemplate = transactionTemplate;
    }

    /**
     * Issues a short-lived reset code and emails it to the user.
     * @return true if SMTP accepted the message; false if mail is not configured or send failed.
     */
    public boolean requestPasswordReset(String rawEmail) {
        String normalizedLookup = normalizeEmailForLookup(rawEmail);
        UserAccount user = userRepository.findByEmailIgnoreCase(normalizedLookup)
            .orElseThrow(() -> new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + normalizedLookup));

        String canonicalEmail = user.getEmail();
        String code = transactionTemplate.execute(status -> {
            passwordResetTokenRepository.deleteByEmail(canonicalEmail);
            passwordResetTokenRepository.deleteByCreatedAtBefore(LocalDateTime.now().minusHours(24));

            String generated = generateSixDigitCode();
            PasswordResetToken token = new PasswordResetToken(
                UUID.randomUUID(),
                canonicalEmail,
                generated,
                LocalDateTime.now()
            );
            passwordResetTokenRepository.save(token);
            return generated;
        });
        return emailVerificationService.sendPasswordResetOtpEmail(canonicalEmail, code);
    }

    @Transactional
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    public void resetPassword(String rawEmail, String rawCode, String newPassword) {
        String normalizedLookup = normalizeEmailForLookup(rawEmail);
        String code = normalizeCode(rawCode);
        UserAccount user = userRepository.findByEmailIgnoreCase(normalizedLookup)
            .orElseThrow(() -> new IllegalArgumentException("לא נמצא משתמש עם האימייל: " + normalizedLookup));

        String canonicalEmail = user.getEmail();
        PasswordResetToken token = passwordResetTokenRepository
            .findTopByEmailOrderByCreatedAtDesc(canonicalEmail)
            .orElseThrow(() -> new IllegalArgumentException("לא נמצא קוד לאיפוס סיסמה. בקש קוד חדש."));

        if (token.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(TOKEN_TTL_MINUTES))) {
            passwordResetTokenRepository.deleteByEmail(canonicalEmail);
            throw new IllegalArgumentException("קוד איפוס הסיסמה פג תוקף. בקש קוד חדש.");
        }

        if (!token.getCode().equals(code)) {
            throw new IllegalArgumentException("קוד איפוס הסיסמה שגוי");
        }

        userService.editPassword(canonicalEmail, newPassword);
        passwordResetTokenRepository.deleteByEmail(canonicalEmail);
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
            throw new IllegalArgumentException("קוד איפוס הסיסמה חייב להכיל 6 ספרות");
        }
        return normalized;
    }

    private String generateSixDigitCode() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int value = secureRandom.nextInt(bound);
        return String.format("%06d", value);
    }
}
