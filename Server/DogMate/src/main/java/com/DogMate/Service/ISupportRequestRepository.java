package com.DogMate.Service;

import com.DogMate.Domain.SupportRequest;

import java.util.Optional;
import java.util.UUID;

public interface ISupportRequestRepository {
    SupportRequest save(SupportRequest supportRequest);
    Optional<SupportRequest> findById(UUID id);
}
