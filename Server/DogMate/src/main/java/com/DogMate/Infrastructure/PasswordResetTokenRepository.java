package com.DogMate.Infrastructure;

import com.DogMate.Domain.PasswordResetToken;
import com.DogMate.Service.IPasswordResetTokenRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository
    extends JpaRepository<PasswordResetToken, UUID>, IPasswordResetTokenRepository {

    Optional<PasswordResetToken> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);

    void deleteByCreatedAtBefore(LocalDateTime threshold);
}
