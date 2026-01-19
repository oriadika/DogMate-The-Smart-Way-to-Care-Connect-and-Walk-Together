package com.DogMate.Infrastructure;

import com.DogMate.Domain.UserAccount;
import com.DogMate.Service.IUserRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserAccount, UUID>, IUserRepository {
    
    /**
     * Spring Data JPA automatically implements this method
     * Finds a user by email address
     */
    Optional<UserAccount> findByEmail(String email);

    /**
     * Spring Data JPA automatically implements this method
     * Checks if a user with the given email exists
     */
    boolean existsByEmail(String email);

    /**
     * Reset all users on server startup:
     * - Set loggedIn to false
     * - Clear latitude and longitude (hide location)
     */
    @Modifying
    @Query("UPDATE UserAccount u SET u.loggedIn = false, u.latitude = null, u.longitude = null")
    int resetAllUsersOnStartup();

    // IUserRepository interface methods are automatically implemented by JpaRepository:
    // - save() -> JpaRepository.save()
    // - findById() -> JpaRepository.findById()
    // - deleteById() -> JpaRepository.deleteById()
    
    // Note: If you need custom queries, you can add them here:
    // @Query("SELECT u FROM UserAccount u WHERE u.email = :email")
    // Optional<UserAccount> findByEmail(@Param("email") String email);
}