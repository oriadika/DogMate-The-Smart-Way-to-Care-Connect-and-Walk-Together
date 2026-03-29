package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface IDogWalkerRepository extends JpaRepository<DogWalkerUser, UUID> {
}
