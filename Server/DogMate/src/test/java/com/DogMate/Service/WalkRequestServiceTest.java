package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.WalkRequest;
import com.DogMate.Domain.WalkRequestStatus;
import com.DogMate.Infrastructure.DogRelationshipRepository;
import com.DogMate.Infrastructure.DogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalkRequestServiceTest {

    @Mock
    private IWalkRequestRepository walkRequestRepository;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private DogRelationshipRepository dogRelationshipRepository;

    @Mock
    private DogRepository dogRepository;

    @InjectMocks
    private WalkRequestService walkRequestService;

    private UUID walkerId;
    private UUID ownerId;
    private DogWalkerUser walker;
    private RegularUser owner;

    @BeforeEach
    void setUp() {
        walkerId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
        walker = new DogWalkerUser(walkerId, "w@test.com", "h", "W", "alker");
        owner = new RegularUser(ownerId, "o@test.com", "h", "O", "wner");
    }

    @Test
    void listPendingForWalker_delegatesToRepository() {
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        WalkRequest wr = pendingRequest();
        when(walkRequestRepository.findForWalkerAndStatus(walkerId, WalkRequestStatus.PENDING))
                .thenReturn(List.of(wr));

        List<WalkRequest> result = walkRequestService.listPendingForWalker(walkerId);

        assertEquals(1, result.size());
        assertEquals(wr, result.get(0));
    }

    @Test
    void confirmCharge_pending_updatesStatusAndCharge() {
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        WalkRequest wr = pendingRequest();
        UUID reqId = wr.getId();
        when(walkRequestRepository.findByIdAndWalker_Id(reqId, walkerId)).thenReturn(Optional.of(wr));
        when(walkRequestRepository.save(any(WalkRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        WalkRequest updated = walkRequestService.confirmCharge(walkerId, reqId);

        assertEquals(WalkRequestStatus.CONFIRMED_CHARGED, updated.getStatus());
        assertTrue(updated.isCharged());
        verify(walkRequestRepository).save(wr);
    }

    @Test
    void decline_pending_setsDeclined() {
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        WalkRequest wr = pendingRequest();
        UUID reqId = wr.getId();
        when(walkRequestRepository.findByIdAndWalker_Id(reqId, walkerId)).thenReturn(Optional.of(wr));
        when(walkRequestRepository.save(any(WalkRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        WalkRequest updated = walkRequestService.decline(walkerId, reqId);

        assertEquals(WalkRequestStatus.DECLINED, updated.getStatus());
    }

    @Test
    void createForOwner_withoutDog_savesPending() {
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        when(walkRequestRepository.save(any(WalkRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant start = Instant.parse("2026-04-01T10:00:00Z");
        Instant end = Instant.parse("2026-04-01T11:00:00Z");
        walkRequestService.createForOwner(ownerId, walkerId, null, start, end, "hello");

        ArgumentCaptor<WalkRequest> cap = ArgumentCaptor.forClass(WalkRequest.class);
        verify(walkRequestRepository).save(cap.capture());
        WalkRequest saved = cap.getValue();
        assertEquals(WalkRequestStatus.PENDING, saved.getStatus());
        assertFalse(saved.isCharged());
        assertEquals("hello", saved.getNotes());
        assertNull(saved.getDog());
        verifyNoInteractions(dogRepository);
        verifyNoInteractions(dogRelationshipRepository);
    }

    @Test
    void createForOwner_withDog_checksRelationshipAndUsesReference() {
        UUID dogId = UUID.randomUUID();
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        when(dogRelationshipRepository.existsLinkBetweenOwnerAndDog(ownerId, dogId)).thenReturn(true);
        when(dogRepository.getReferenceById(dogId)).thenReturn(mock(Dog.class));
        when(walkRequestRepository.save(any(WalkRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant start = Instant.parse("2026-04-01T10:00:00Z");
        Instant end = Instant.parse("2026-04-01T11:00:00Z");
        walkRequestService.createForOwner(ownerId, walkerId, dogId, start, end, null);

        verify(dogRepository).getReferenceById(dogId);
    }

    @Test
    void createForOwner_endBeforeStart_throws() {
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));

        Instant start = Instant.parse("2026-04-01T11:00:00Z");
        Instant end = Instant.parse("2026-04-01T10:00:00Z");

        assertThrows(
                IllegalArgumentException.class,
                () -> walkRequestService.createForOwner(ownerId, walkerId, null, start, end, null));
        verify(walkRequestRepository, never()).save(any());
    }

    private WalkRequest pendingRequest() {
        WalkRequest wr = new WalkRequest(
                UUID.randomUUID(),
                walker,
                owner,
                null,
                Instant.parse("2026-05-01T08:00:00Z"),
                Instant.parse("2026-05-01T09:00:00Z"),
                WalkRequestStatus.PENDING,
                false,
                Instant.parse("2026-03-01T00:00:00Z"),
                null);
        return wr;
    }
}
