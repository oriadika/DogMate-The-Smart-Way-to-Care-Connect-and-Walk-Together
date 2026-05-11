package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.DogWalkerRating;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Domain.WalkerCityOffering;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

@Service
public class DogWalkerService {

    private final IUserRepository userRepository;
    private final IDogWalkerRepository dogWalkerRepository;
    private final IDogWalkerRatingRepository dogWalkerRatingRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DogWalkerService(IUserRepository userRepository,
                            IDogWalkerRepository dogWalkerRepository,
                            IDogWalkerRatingRepository dogWalkerRatingRepository,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.dogWalkerRepository = dogWalkerRepository;
        this.dogWalkerRatingRepository = dogWalkerRatingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Register a new dog walker; shared email check uses {@link IUserRepository#existsByEmail}.
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    @Transactional
    public DogWalkerUser registerDogWalker(String email, String password,
                                            String firstName, String lastName) {
        return registerDogWalker(email, password, firstName, lastName, null);
    }

    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    @Transactional
    public DogWalkerUser registerDogWalker(String email, String password,
                                            String firstName, String lastName, String phoneNumber) {
        boolean emailExists = userRepository.existsByEmail(email);
        DogWalkerUser newUser = DogWalkerUser.create(
                email, password, firstName, lastName, emailExists, passwordEncoder::encode);
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            newUser.setPhoneNumber(phoneNumber);
        }
        return dogWalkerRepository.save(newUser);
    }

    /**
     * Creates a walker after email OTP; password is already bcrypt-hashed (from pending registration).
     */
    @CacheEvict(cacheNames = "loggedUsers", allEntries = true)
    @Transactional
    public DogWalkerUser registerDogWalkerFromPending(
        String email,
        String passwordHash,
        String firstName,
        String lastName,
        String phoneNumber,
        LocalDate birthDate
    ) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("כתובת המייל כבר קיימת במערכת: " + email);
        }
        DogWalkerUser newUser = DogWalkerUser.createWithHashedPassword(email, passwordHash, firstName, lastName);
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            newUser.setPhoneNumber(phoneNumber);
        }
        newUser.setBirthDate(birthDate);
        return dogWalkerRepository.save(newUser);
    }

    private DogWalkerUser loadDogWalkerOrThrow(UUID userId) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא משתמש עם המזהה: " + userId));
        if (!(user instanceof DogWalkerUser walker)) {
            throw new IllegalArgumentException("המשתמש אינו דוגווקר: " + userId);
        }
        return walker;
    }

    @Transactional(readOnly = true)
    public DogWalkerUser getProfessionalProfile(UUID userId) {
        return loadDogWalkerOrThrow(userId);
    }

    /**
     * All dog walkers who have at least one city offering stored (professional details filled).
     */
    @Transactional(readOnly = true)
    public List<DogWalkerUser> getWalkersWithProfessionalDetails() {
        return dogWalkerRepository.findAllWithNonEmptyCityOfferings();
    }

    @Transactional
    public DogWalkerUser updateProfessionalProfile(UUID userId, List<WalkerCityOffering> cityOfferings) {
        DogWalkerUser walker = loadDogWalkerOrThrow(userId);
        List<WalkerCityOffering> next = cityOfferings != null ? cityOfferings : Collections.emptyList();
        walker.setCityOfferings(new ArrayList<>(next));
        return dogWalkerRepository.save(walker);
    }

    @Transactional
    public DogWalkerRating createRating(UUID walkerId, UUID ownerId, Integer stars, String comment) {
        UserAccount.validateUserId(walkerId);
        UserAccount.validateUserId(ownerId);
        if (stars == null || stars < 1 || stars > 5) {
            throw new IllegalArgumentException("הדירוג חייב להיות בין 1 ל־5");
        }

        // Validate user roles.
        loadDogWalkerOrThrow(walkerId);
        UserAccount owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא בעל כלב עם המזהה: " + ownerId));
        if (!(owner instanceof RegularUser)) {
            throw new IllegalArgumentException("רק בעלי כלבים יכולים לדרג דוגווקרים");
        }

        boolean alreadyRated = dogWalkerRatingRepository.existsByWalkerIdAndOwnerId(walkerId, ownerId);
        if (alreadyRated) {
            throw new IllegalArgumentException("כבר דירגת את הדוגווקר הזה");
        }

        DogWalkerRating rating = new DogWalkerRating(
                UUID.randomUUID(),
                walkerId,
                ownerId,
                stars,
                comment != null ? comment.trim() : ""
        );
        return dogWalkerRatingRepository.save(rating);
    }

    @Transactional
    public void deleteRating(UUID walkerId, UUID ratingId, UUID ownerId) {
        UserAccount.validateUserId(walkerId);
        UserAccount.validateUserId(ratingId);
        UserAccount.validateUserId(ownerId);

        DogWalkerRating rating = dogWalkerRatingRepository.findById(ratingId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא דירוג עם המזהה: " + ratingId));

        if (!rating.getWalkerId().equals(walkerId)) {
            throw new IllegalArgumentException("הדירוג אינו שייך לדוגווקר שנבחר");
        }
        if (!rating.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("ניתן למחוק רק ביקורות ששלחת");
        }

        dogWalkerRatingRepository.delete(rating);
    }

    @Transactional(readOnly = true)
    public WalkerRatingSummary getRatingSummaryForWalker(UUID walkerId, UUID ownerId) {
        List<DogWalkerRating> ratings = dogWalkerRatingRepository.findByWalkerIdOrderByCreatedAtDesc(walkerId);
        int count = ratings.size();
        double average = count == 0 ? 0.0 : ratings.stream().mapToInt(DogWalkerRating::getStars).average().orElse(0.0);
        boolean alreadyRated = ownerId != null && ratings.stream().anyMatch(r -> r.getOwnerId().equals(ownerId));

        List<WalkerReviewView> reviews = ratings.stream().map(r -> {
            String reviewerName = userRepository.findById(r.getOwnerId())
                    .filter(RegularUser.class::isInstance)
                    .map(RegularUser.class::cast)
                    .map(u -> (u.getFirst_name() + " " + u.getLast_name()).trim())
                    .filter(name -> !name.isBlank())
                    .orElse("בעל כלב");
            return new WalkerReviewView(
                    r.getId(),
                    r.getOwnerId(),
                    r.getStars(),
                    r.getComment(),
                    reviewerName,
                    r.getCreatedAt()
            );
        }).toList();

        return new WalkerRatingSummary(average, count, alreadyRated, reviews);
    }

    public record WalkerReviewView(
            UUID ratingId,
            UUID reviewerId,
            Integer stars,
            String comment,
            String reviewerName,
            java.time.LocalDateTime createdAt
    ) {}

    public record WalkerRatingSummary(
            Double averageRating,
            Integer ratingsCount,
            boolean alreadyRatedByCurrentOwner,
            List<WalkerReviewView> reviews
    ) {}
}
