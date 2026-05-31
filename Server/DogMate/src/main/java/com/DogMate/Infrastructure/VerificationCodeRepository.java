package com.DogMate.Infrastructure;

import com.DogMate.Domain.VerificationCode;
import com.DogMate.Service.IVerificationCodeRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationCodeRepository
    extends JpaRepository<VerificationCode, UUID>, IVerificationCodeRepository {

    Optional<VerificationCode> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);

    void deleteByCreatedAtBefore(LocalDateTime threshold);
}
