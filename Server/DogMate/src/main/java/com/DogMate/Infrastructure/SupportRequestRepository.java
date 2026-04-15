package com.DogMate.Infrastructure;

import com.DogMate.Domain.SupportRequest;
import com.DogMate.Service.ISupportRequestRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SupportRequestRepository extends JpaRepository<SupportRequest, UUID>, ISupportRequestRepository {
}
