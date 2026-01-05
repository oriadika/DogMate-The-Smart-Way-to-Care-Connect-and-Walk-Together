package com.DogMate.Infrastructure;

import com.DogMate.Domain.DogEvent;
import com.DogMate.Service.IDogEventRepository;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DogEventRepository extends JpaRepository<DogEvent, UUID>, IDogEventRepository {

}
