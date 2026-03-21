package com.DogMate.Service;

import com.DogMate.Domain.*;
import com.DogMate.Infrastructure.DogRepository;
import com.DogMate.Infrastructure.ReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.*;

@Service
public class ReminderService {

    private final IReminderRepository reminderRepo;
    private final IUserRepository userRepo;
    private final IDogRepository dogRepository;


    @Autowired
    public ReminderService(IReminderRepository reminderRepo, IUserRepository userRepo, IDogRepository dogRepository) {
        this.reminderRepo = reminderRepo;
        this.userRepo = userRepo;
        this.dogRepository = dogRepository;
    }

    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public Reminder createReminder(UUID userId, LinkedList<UUID> dogIds, String title,
                                   LocalDateTime remindAt, String description) {
        if (userRepo.findById(userId).isEmpty()){
            throw new IllegalArgumentException("User with id " + userId + " not found");
        }

        RegularUser user = (RegularUser) userRepo.findById(userId).get();

        List<UUID> dogIdsRepo = dogRepository.findAll().stream().map(Dog::getID).toList();

        for (UUID dogId : dogIds){
            if (!dogIdsRepo.contains(dogId)){
                throw new IllegalArgumentException("One or more dog ids are not found");
            }
            else{
                if (!user.getDogRelationships().stream()
                        .map(DogRelationship::getDogID)
                        .toList().contains(dogId)){
                    throw new IllegalArgumentException("One or more dogs are not associated with the user");
                }
            }
        }

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }

        if (remindAt == null || remindAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("remindAt must be in the future");
        }

        if (description  == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }

        List<Dog> dogs = dogRepository.findAll().stream().filter(dog -> (dogIds.contains(dog.getID()))).toList();
        Reminder r = new Reminder(user,
                new LinkedList<>(dogs),title, remindAt, description);

        return reminderRepo.save(r);
    }

    @CacheEvict(cacheNames = "remindersByUser", key = "#userId")
    public boolean removeReminder(UUID userId, UUID reminderId) {
        var reminderOpt = reminderRepo.findById(reminderId);
        if (reminderOpt.isEmpty()) return false;

        Reminder r = reminderOpt.get();
        if (!r.getUser().getId().equals(userId)) return false; // user-scoped security

        reminderRepo.deleteById(reminderId);
        return true;
    }

    @Cacheable(cacheNames = "remindersByUser", key = "#userId")
    public List<Reminder> getRemindersForUser(UUID userId) {
        var userAcc = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with id " + userId + " not found"));

        if (!(userAcc instanceof RegularUser)) {
            throw new IllegalArgumentException("User must be a RegularUser");
        }

        RegularUser regularUser = (RegularUser) userAcc;
        return reminderRepo.findByRegularUser(regularUser);
    }

    @CacheEvict(cacheNames = "remindersByUser", allEntries = true)
    public void removeDogFromAllReminders(UUID dogId) {
        List<Reminder> allReminders = reminderRepo.findAll();
        List<UUID> remindersToDelete = new ArrayList<>();
        for (Reminder r : allReminders) {
            r.getDogIds().removeIf(dog -> dog.getID().equals(dogId));
            if (r.getDogIds().isEmpty()) {
                remindersToDelete.add(r.getId());
            } else {
                reminderRepo.save(r);
            }
        }
        for (UUID reminderId : remindersToDelete) {
            reminderRepo.deleteById(reminderId);
        }
    }
}
