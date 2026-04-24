package com.DogMate.Service;

import com.DogMate.Domain.PendingRegistration;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Infrastructure.PendingRegistrationRepository;
import com.DogMate.util.DisposableEmailDomainBlacklist;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class PendingRegistrationService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_TTL_MINUTES = 15;

    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final IUserRepository userRepository;
    private final IVerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;
    private final UserService userService;
    private final DogWalkerService dogWalkerService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PendingRegistrationService(
        PendingRegistrationRepository pendingRegistrationRepository,
        IUserRepository userRepository,
        IVerificationCodeRepository verificationCodeRepository,
        PasswordEncoder passwordEncoder,
        EmailVerificationService emailVerificationService,
        UserService userService,
        DogWalkerService dogWalkerService
    ) {
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.userRepository = userRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
        this.userService = userService;
        this.dogWalkerService = dogWalkerService;
    }

    /**
     * Stores signup data and sends OTP. Does not create a {@link UserAccount}.
     * @return true if the SMTP layer reported the message was sent successfully
     */
    @Transactional
    public boolean startRegistration(
        String email,
        String password,
        String firstName,
        String lastName,
        String phoneNumber,
        String userRole
    ) {
        return startRegistration(email, password, firstName, lastName, phoneNumber, null, userRole);
    }

    /**
     * Stores signup data and sends OTP, including optional birth date.
     */
    @Transactional
    public boolean startRegistration(
        String email,
        String password,
        String firstName,
        String lastName,
        String phoneNumber,
        LocalDate birthDate,
        String userRole
    ) {
        String norm = normalizeEmail(email);
        DisposableEmailDomainBlacklist.assertEmailDomainAllowed(norm);
        if (userRepository.existsByEmailIgnoreCase(norm)) {
            throw new IllegalArgumentException("כתובת המייל כבר קיימת במערכת: " + email);
        }
        String trimmedFirstName = firstName.trim();
        String trimmedLastName = lastName.trim();
        String normalizedPhone = phoneNumber != null && !phoneNumber.isBlank() ? phoneNumber.trim() : null;
        String otp = generateSixDigitCode();
        String hash = passwordEncoder.encode(password);
        PendingRegistration pending = pendingRegistrationRepository.findByEmail(norm)
            .map(existing -> {
                existing.setPasswordHash(hash);
                existing.setFirstName(trimmedFirstName);
                existing.setLastName(trimmedLastName);
                existing.setPhoneNumber(normalizedPhone);
                existing.setBirthDate(birthDate);
                existing.setUserRole(userRole);
                existing.setOtpCode(otp);
                existing.setCreatedAt(LocalDateTime.now());
                return existing;
            })
            .orElseGet(() -> new PendingRegistration(
                UUID.randomUUID(),
                norm,
                hash,
                trimmedFirstName,
                trimmedLastName,
                normalizedPhone,
                birthDate,
                userRole,
                otp,
                LocalDateTime.now()
            ));
        pendingRegistrationRepository.save(pending);
        boolean sent = emailVerificationService.sendOtpEmail(norm, otp);
        if (!sent) {
            // Prevent stale pending rows from blocking retries when SMTP fails.
            pendingRegistrationRepository.deleteByEmail(norm);
            throw new IllegalStateException("שליחת מייל עם קוד האימות נכשלה. נסה שוב בעוד רגע.");
        }
        return true;
    }

    /**
     * Validates OTP, creates the user with email already verified, removes pending row.
     */
    @Transactional
    public UserAccount completeRegistration(String rawEmail, String rawCode) {
        String norm = normalizeEmail(rawEmail);
        String code = normalizeCode(rawCode);

        Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository.findByEmail(norm);
        if (pendingOpt.isEmpty()) {
            if (userRepository.existsByEmailIgnoreCase(norm)) {
                throw new IllegalArgumentException("המייל כבר רשום. התחבר במקום.");
            }
            throw new IllegalArgumentException(
                "אין הרשמה ממתינה. התחל שוב מהמסך הרשמה והשתמש בקוד שנשלח למייל."
            );
        }
        PendingRegistration pending = pendingOpt.get();

        if (pending.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(OTP_TTL_MINUTES))) {
            pendingRegistrationRepository.deleteById(pending.getId());
            throw new IllegalArgumentException("קוד האימות פג תוקף");
        }
        if (!pending.getOtpCode().equals(code)) {
            throw new IllegalArgumentException("קוד האימות שגוי");
        }
        if (userRepository.existsByEmailIgnoreCase(norm)) {
            pendingRegistrationRepository.deleteById(pending.getId());
            throw new IllegalArgumentException("כתובת המייל כבר רשומה");
        }

        UserAccount user;
        if ("walker".equals(pending.getUserRole())) {
            user = dogWalkerService.registerDogWalkerFromPending(
                norm,
                pending.getPasswordHash(),
                pending.getFirstName(),
                pending.getLastName(),
                pending.getPhoneNumber(),
                pending.getBirthDate()
            );
        } else {
            user = userService.registerRegularUserFromPending(
                norm,
                pending.getPasswordHash(),
                pending.getFirstName(),
                pending.getLastName(),
                pending.getPhoneNumber(),
                pending.getBirthDate()
            );
        }
        user.setEmailVerified(true);
        userRepository.save(user);
        pendingRegistrationRepository.deleteById(pending.getId());
        verificationCodeRepository.deleteByEmail(norm);
        return user;
    }

    @Transactional
    public void resendOtp(String rawEmail) {
        String norm = normalizeEmail(rawEmail);
        DisposableEmailDomainBlacklist.assertEmailDomainAllowed(norm);
        Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository.findByEmail(norm);
        if (pendingOpt.isEmpty()) {
            if (userRepository.existsByEmailIgnoreCase(norm)) {
                throw new IllegalArgumentException("המייל כבר רשום. התחבר במקום.");
            }
            throw new IllegalArgumentException(
                "אין הרשמה ממתינה. התחל הרשמה מהמסך הרשמה כדי לקבל קוד."
            );
        }
        PendingRegistration pending = pendingOpt.get();

        if (pending.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(OTP_TTL_MINUTES))) {
            pendingRegistrationRepository.deleteById(pending.getId());
            throw new IllegalArgumentException("בקשת ההרשמה פגה. נא להירשם מחדש.");
        }

        String otp = generateSixDigitCode();
        pending.setOtpCode(otp);
        pending.setCreatedAt(LocalDateTime.now());
        pendingRegistrationRepository.save(pending);
        boolean sent = emailVerificationService.sendOtpEmail(norm, otp);
        if (!sent) {
            pendingRegistrationRepository.deleteById(pending.getId());
            throw new IllegalStateException("שליחת קוד אימות מחדש נכשלה. נא להירשם מחדש.");
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("נדרש מייל");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("נדרש קוד אימות");
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
