package com.DogMate.Service;

import com.DogMate.Domain.VerificationCode;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface IVerificationCodeRepository {
    VerificationCode save(VerificationCode verificationCode);

    Optional<VerificationCode> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);

    void deleteByCreatedAtBefore(LocalDateTime threshold);

    Optional<VerificationCode> findById(UUID id);
}
