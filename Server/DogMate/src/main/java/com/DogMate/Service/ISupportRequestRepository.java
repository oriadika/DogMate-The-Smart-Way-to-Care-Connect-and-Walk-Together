package com.DogMate.Service;

import com.DogMate.Domain.SupportRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ISupportRequestRepository {
    SupportRequest save(SupportRequest supportRequest);

    Optional<SupportRequest> findById(UUID id);

    List<SupportRequest> findAll(Sort sort);
}
