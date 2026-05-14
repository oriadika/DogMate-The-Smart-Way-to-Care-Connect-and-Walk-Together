package com.DogMate.Service;

import com.DogMate.Domain.Dog;
import com.DogMate.Domain.DogVaccination;
import com.DogMate.DTO.VaccinationDTO;
import com.DogMate.Infrastructure.DogVaccinationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class VaccinationService {

    private final DogVaccinationRepository vaccinationRepository;
    private final IDogRepository dogRepository;

    public VaccinationService(DogVaccinationRepository vaccinationRepository, IDogRepository dogRepository) {
        this.vaccinationRepository = vaccinationRepository;
        this.dogRepository = dogRepository;
    }

    private boolean dogBelongsToUser(UUID userId, UUID dogId) {
        return dogRepository.findAllForRegularUser(userId).stream()
                .anyMatch(d -> d.getID().equals(dogId));
    }

    private DogVaccination loadOwnedOrThrow(UUID userId, UUID vaccinationId) {
        DogVaccination v = vaccinationRepository.findById(vaccinationId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא חיסון עם המזהה: " + vaccinationId));
        UUID dogId = v.getDog().getID();
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("אין הרשאה לחיסון זה");
        }
        return v;
    }

    @Transactional(readOnly = true)
    public List<VaccinationDTO> listForUser(UUID userId) {
        return vaccinationRepository.findAllForRegularUser(userId).stream()
                .map(VaccinationDTO::fromEntity)
                .toList();
    }

    @Transactional
    public VaccinationDTO create(UUID userId, UUID dogId, String vaccineName, LocalDate administeredDate) {
        if (vaccineName == null || vaccineName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם חיסון");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך חיסון");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        Dog dog = dogRepository.findById(dogId)
                .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
        DogVaccination entity = new DogVaccination(null, dog, vaccineName, administeredDate);
        return VaccinationDTO.fromEntity(vaccinationRepository.save(entity));
    }

    @Transactional
    public VaccinationDTO update(UUID userId, UUID vaccinationId, UUID dogId, String vaccineName, LocalDate administeredDate) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        if (vaccineName == null || vaccineName.isBlank()) {
            throw new IllegalArgumentException("חובה להזין שם חיסון");
        }
        if (administeredDate == null) {
            throw new IllegalArgumentException("חובה להזין תאריך חיסון");
        }
        if (!dogBelongsToUser(userId, dogId)) {
            throw new IllegalArgumentException("הכלב לא משויך למשתמש זה");
        }
        if (!v.getDog().getID().equals(dogId)) {
            Dog dog = dogRepository.findById(dogId)
                    .orElseThrow(() -> new IllegalArgumentException("לא נמצא כלב עם המזהה: " + dogId));
            v.setDog(dog);
        }
        v.setVaccineName(vaccineName);
        v.setAdministeredDate(administeredDate);
        return VaccinationDTO.fromEntity(vaccinationRepository.save(v));
    }

    @Transactional
    public void delete(UUID userId, UUID vaccinationId) {
        DogVaccination v = loadOwnedOrThrow(userId, vaccinationId);
        vaccinationRepository.delete(v);
    }
}
