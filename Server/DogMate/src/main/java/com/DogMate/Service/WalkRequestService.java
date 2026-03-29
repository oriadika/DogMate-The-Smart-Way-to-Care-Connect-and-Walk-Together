package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.UserAccount;
import com.DogMate.Domain.WalkRequest;
import com.DogMate.Domain.WalkRequestStatus;
import com.DogMate.Infrastructure.DogRelationshipRepository;
import com.DogMate.Infrastructure.DogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class WalkRequestService {

    private final IWalkRequestRepository walkRequestRepository;
    private final IUserRepository userRepository;
    private final DogRelationshipRepository dogRelationshipRepository;
    private final DogRepository dogRepository;

    public WalkRequestService(
            IWalkRequestRepository walkRequestRepository,
            IUserRepository userRepository,
            DogRelationshipRepository dogRelationshipRepository,
            DogRepository dogRepository) {
        this.walkRequestRepository = walkRequestRepository;
        this.userRepository = userRepository;
        this.dogRelationshipRepository = dogRelationshipRepository;
        this.dogRepository = dogRepository;
    }

    @Transactional(readOnly = true)
    public List<WalkRequest> listPendingForWalker(UUID walkerId) {
        loadWalkerOrThrow(walkerId);
        return walkRequestRepository.findForWalkerAndStatus(walkerId, WalkRequestStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<WalkRequest> listUpcomingScheduleForWalker(UUID walkerId) {
        loadWalkerOrThrow(walkerId);
        return walkRequestRepository.findUpcomingConfirmedForWalker(
                walkerId, WalkRequestStatus.CONFIRMED_CHARGED, Instant.now());
    }

    @Transactional
    public WalkRequest confirmCharge(UUID walkerId, UUID requestId) {
        loadWalkerOrThrow(walkerId);
        WalkRequest req = walkRequestRepository
                .findByIdAndWalker_Id(requestId, walkerId)
                .orElseThrow(() -> new IllegalArgumentException("Walk request not found for this walker: " + requestId));
        if (req.getStatus() != WalkRequestStatus.PENDING) {
            throw new IllegalArgumentException("Only pending requests can be confirmed; current status: " + req.getStatus());
        }
        req.setStatus(WalkRequestStatus.CONFIRMED_CHARGED);
        req.setCharged(true);
        return walkRequestRepository.save(req);
    }

    @Transactional
    public WalkRequest decline(UUID walkerId, UUID requestId) {
        loadWalkerOrThrow(walkerId);
        WalkRequest req = walkRequestRepository
                .findByIdAndWalker_Id(requestId, walkerId)
                .orElseThrow(() -> new IllegalArgumentException("Walk request not found for this walker: " + requestId));
        if (req.getStatus() != WalkRequestStatus.PENDING) {
            throw new IllegalArgumentException("Only pending requests can be declined; current status: " + req.getStatus());
        }
        req.setStatus(WalkRequestStatus.DECLINED);
        return walkRequestRepository.save(req);
    }

    @Transactional
    public WalkRequest createForOwner(
            UUID ownerId,
            UUID walkerId,
            UUID dogIdOrNull,
            Instant scheduledStart,
            Instant scheduledEnd,
            String notes) {
        UserAccount ownerAccount = userRepository
                .findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + ownerId));
        if (!(ownerAccount instanceof RegularUser owner)) {
            throw new IllegalArgumentException("User is not a regular (owner) account: " + ownerId);
        }

        UserAccount walkerAccount = userRepository
                .findById(walkerId)
                .orElseThrow(() -> new IllegalArgumentException("Walker not found with ID: " + walkerId));
        if (!(walkerAccount instanceof DogWalkerUser walker)) {
            throw new IllegalArgumentException("User is not a dog walker: " + walkerId);
        }

        if (scheduledStart == null || scheduledEnd == null) {
            throw new IllegalArgumentException("scheduledStart and scheduledEnd are required");
        }
        if (!scheduledEnd.isAfter(scheduledStart)) {
            throw new IllegalArgumentException("scheduledEnd must be after scheduledStart");
        }

        Dog dogRef = null;
        if (dogIdOrNull != null) {
            if (!dogRelationshipRepository.existsLinkBetweenOwnerAndDog(ownerId, dogIdOrNull)) {
                throw new IllegalArgumentException("Dog does not belong to this owner: " + dogIdOrNull);
            }
            dogRef = dogRepository.getReferenceById(dogIdOrNull);
        }

        Instant now = Instant.now();
        WalkRequest entity = new WalkRequest(
                UUID.randomUUID(),
                walker,
                owner,
                dogRef,
                scheduledStart,
                scheduledEnd,
                WalkRequestStatus.PENDING,
                false,
                now,
                notes != null && !notes.isBlank() ? notes.trim() : null);

        return walkRequestRepository.save(entity);
    }

    private DogWalkerUser loadWalkerOrThrow(UUID walkerId) {
        UserAccount user = userRepository
                .findById(walkerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + walkerId));
        if (!(user instanceof DogWalkerUser walker)) {
            throw new IllegalArgumentException("User is not a dog walker: " + walkerId);
        }
        return walker;
    }
}
