package com.DogMate.Service;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.DogWalkerRating;
import com.DogMate.Domain.RegularUser;
import com.DogMate.Domain.WalkerCityOffering;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DogWalkerServiceTest {

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IDogWalkerRepository dogWalkerRepository;

    @Mock
    private IDogWalkerRatingRepository dogWalkerRatingRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DogWalkerService dogWalkerService;

    private String testEmail;
    private String testPassword;
    private String testFirstName;
    private String testLastName;
    private String testPasswordHash;

    @BeforeEach
    void setUp() {
        testEmail = "walker@example.com";
        testPassword = "password123";
        testFirstName = "Jane";
        testLastName = "Walker";
        testPasswordHash = "$2a$10$hashedPasswordString";
    }

    @Test
    void GivenValidData_WhenRegisterDogWalker_ThenSaveAndReturnWalker() {
        DogWalkerUser mockSaved = new DogWalkerUser(
                UUID.randomUUID(), testEmail, testPasswordHash, testFirstName, testLastName);
        when(userRepository.existsByEmail(testEmail)).thenReturn(false);
        when(passwordEncoder.encode(testPassword)).thenReturn(testPasswordHash);
        when(dogWalkerRepository.save(any(DogWalkerUser.class))).thenReturn(mockSaved);

        DogWalkerUser result = dogWalkerService.registerDogWalker(
                testEmail, testPassword, testFirstName, testLastName);

        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(passwordEncoder, times(1)).encode(testPassword);
        verify(dogWalkerRepository, times(1)).save(any(DogWalkerUser.class));
        assertEquals(mockSaved, result);
    }

    @Test
    void GivenEmailAlreadyExists_WhenRegisterDogWalker_ThenThrowAndNotSave() {
        when(userRepository.existsByEmail(testEmail)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogWalkerService.registerDogWalker(
                        testEmail, testPassword, testFirstName, testLastName));

        assertEquals("Email already exists: " + testEmail, ex.getMessage());
        verify(userRepository, times(1)).existsByEmail(testEmail);
        verify(passwordEncoder, never()).encode(anyString());
        verify(dogWalkerRepository, never()).save(any());
    }

    @Test
    void GivenWalker_WhenUpdateProfessionalProfile_ThenPersistsLists() {
        UUID id = UUID.randomUUID();
        DogWalkerUser walker = new DogWalkerUser(
                id, testEmail, testPasswordHash, testFirstName, testLastName);
        when(userRepository.findById(id)).thenReturn(Optional.of(walker));
        when(dogWalkerRepository.save(any(DogWalkerUser.class))).thenAnswer(inv -> inv.getArgument(0));

        List<WalkerCityOffering> offerings = List.of(
                new WalkerCityOffering("Tel Aviv", "א׳–ה׳ 08:00–14:00", "50 ₪ ל־30 דקות"));
        DogWalkerUser result = dogWalkerService.updateProfessionalProfile(id, offerings);

        assertEquals(1, result.getCityOfferings().size());
        assertEquals("Tel Aviv", result.getCityOfferings().get(0).getCity());
        assertEquals("א׳–ה׳ 08:00–14:00", result.getCityOfferings().get(0).getAvailability());
        assertEquals("50 ₪ ל־30 דקות", result.getCityOfferings().get(0).getPricing());
        verify(dogWalkerRepository, times(1)).save(walker);
    }

    @Test
    void GivenNoUser_WhenGetProfessionalProfile_ThenThrows() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogWalkerService.getProfessionalProfile(id));

        assertTrue(ex.getMessage().contains("User not found"));
    }

    @Test
    void GivenOwnerNotWalker_WhenGetProfessionalProfile_ThenThrows() {
        UUID id = UUID.randomUUID();
        RegularUser owner = new RegularUser(
                id, testEmail, testPasswordHash, testFirstName, testLastName);
        when(userRepository.findById(id)).thenReturn(Optional.of(owner));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogWalkerService.getProfessionalProfile(id));

        assertTrue(ex.getMessage().contains("not a dog walker"));
    }

    @Test
    void GivenValidRating_WhenCreateRating_ThenSaved() {
        UUID walkerId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        DogWalkerUser walker = new DogWalkerUser(walkerId, testEmail, testPasswordHash, testFirstName, testLastName);
        RegularUser owner = new RegularUser(ownerId, "owner@mail.com", "h", "Owner", "One");

        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(dogWalkerRatingRepository.existsByWalkerIdAndOwnerId(walkerId, ownerId)).thenReturn(false);
        when(dogWalkerRatingRepository.save(any(DogWalkerRating.class))).thenAnswer(inv -> inv.getArgument(0));

        DogWalkerRating saved = dogWalkerService.createRating(walkerId, ownerId, 5, "מעולה");
        assertEquals(5, saved.getStars());
        assertEquals("מעולה", saved.getComment());
        verify(dogWalkerRatingRepository, times(1)).save(any(DogWalkerRating.class));
    }

    @Test
    void GivenDuplicateRating_WhenCreateRating_ThenThrows() {
        UUID walkerId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        DogWalkerUser walker = new DogWalkerUser(walkerId, testEmail, testPasswordHash, testFirstName, testLastName);
        RegularUser owner = new RegularUser(ownerId, "owner@mail.com", "h", "Owner", "One");

        when(userRepository.findById(walkerId)).thenReturn(Optional.of(walker));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(dogWalkerRatingRepository.existsByWalkerIdAndOwnerId(walkerId, ownerId)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogWalkerService.createRating(walkerId, ownerId, 4, "טוב")
        );
        assertTrue(ex.getMessage().contains("already rated"));
    }

    @Test
    void GivenInvalidStars_WhenCreateRating_ThenThrows() {
        UUID walkerId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dogWalkerService.createRating(walkerId, ownerId, 6, "too much")
        );

        assertEquals("stars must be between 1 and 5", ex.getMessage());
        verify(dogWalkerRatingRepository, never()).save(any(DogWalkerRating.class));
    }
}
