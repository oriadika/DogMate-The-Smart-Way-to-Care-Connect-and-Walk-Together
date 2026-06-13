package com.DogMate.Service;

import com.DogMate.Domain.PasswordResetToken;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface IPasswordResetTokenRepository {
    PasswordResetToken save(PasswordResetToken token);

    Optional<PasswordResetToken> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);

    void deleteByCreatedAtBefore(LocalDateTime threshold);

    Optional<PasswordResetToken> findById(UUID id);
}
