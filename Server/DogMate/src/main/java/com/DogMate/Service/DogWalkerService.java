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
            throw new IllegalArgumentException("stars must be between 1 and 5");
        }

        // Validate user roles.
        loadDogWalkerOrThrow(walkerId);
        UserAccount owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Owner not found with ID: " + ownerId));
        if (!(owner instanceof RegularUser)) {
            throw new IllegalArgumentException("Only dog owners can rate dog walkers");
        }

        boolean alreadyRated = dogWalkerRatingRepository.existsByWalkerIdAndOwnerId(walkerId, ownerId);
        if (alreadyRated) {
            throw new IllegalArgumentException("You already rated this dog walker");
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
                .orElseThrow(() -> new IllegalArgumentException("Rating not found with ID: " + ratingId));

        if (!rating.getWalkerId().equals(walkerId)) {
            throw new IllegalArgumentException("Rating does not belong to the selected dog walker");
        }
        if (!rating.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("You can delete only your own review");
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
