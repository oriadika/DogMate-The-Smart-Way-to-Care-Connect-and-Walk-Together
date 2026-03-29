package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Domain.WalkerCityOffering;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class DogWalkerService {

    private final IUserRepository userRepository;
    private final IDogWalkerRepository dogWalkerRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DogWalkerService(IUserRepository userRepository,
                            IDogWalkerRepository dogWalkerRepository,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.dogWalkerRepository = dogWalkerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Register a new dog walker; shared email check uses {@link IUserRepository#existsByEmail}.
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    @Transactional
    public DogWalkerUser registerDogWalker(String email, String password,
                                            String firstName, String lastName) {
        boolean emailExists = userRepository.existsByEmail(email);
        DogWalkerUser newUser = DogWalkerUser.create(
                email, password, firstName, lastName, emailExists, passwordEncoder::encode);
        return dogWalkerRepository.save(newUser);
    }

    private DogWalkerUser loadDogWalkerOrThrow(UUID userId) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));
        if (!(user instanceof DogWalkerUser walker)) {
            throw new IllegalArgumentException("User is not a dog walker: " + userId);
        }
        return walker;
    }

    @Transactional(readOnly = true)
    public DogWalkerUser getProfessionalProfile(UUID userId) {
        return loadDogWalkerOrThrow(userId);
    }

    @Transactional
    public DogWalkerUser updateProfessionalProfile(UUID userId, List<WalkerCityOffering> cityOfferings) {
        DogWalkerUser walker = loadDogWalkerOrThrow(userId);
        List<WalkerCityOffering> next = cityOfferings != null ? cityOfferings : Collections.emptyList();
        walker.setCityOfferings(new ArrayList<>(next));
        return dogWalkerRepository.save(walker);
    }
}
