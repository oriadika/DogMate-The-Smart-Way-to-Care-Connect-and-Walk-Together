package com.DogMate.Service;

import com.DogMate.Domain.UserAccount;
import com.DogMate.Infrastructure.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing user session timeouts and automatic logouts.
 * Automatically logs out users after a configured period of inactivity.
 */
@Service
public class SessionCleanupService {
    
    private final UserRepository userRepository;
    
    // Session timeout in hours (default: 24 hours)
    @Value("${dogmate.session.timeout.hours:24}")
    private int sessionTimeoutHours;
    
    @Autowired
    public SessionCleanupService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    /**
     * Scheduled task to clean up inactive sessions.
     * Runs every 10 minutes to check for timed-out sessions.
     */
    @Scheduled(fixedRateString = "${dogmate.session.cleanup.interval.ms:600000}")
    @Transactional
    public void cleanupInactiveSessions() {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(sessionTimeoutHours);
            
            // Find all users who are logged in but haven't been active
            List<UserAccount> loggedInUsers = userRepository.findByLoggedInTrue();
            
            int loggedOutCount = 0;
            for (UserAccount user : loggedInUsers) {
                // If lastActivityTime is null or older than timeout, log them out
                if (user.getLastActivityTime() == null || user.getLastActivityTime().isBefore(cutoffTime)) {
                    user.setLoggedIn(false);
                    user.setLastActivityTime(null);
                    userRepository.save(user);
                    loggedOutCount++;
                    System.out.println("Auto-logged out inactive user: " + user.getEmail());
                }
            }
            
            if (loggedOutCount > 0) {
                System.out.println("SessionCleanupService: Auto-logged out " + loggedOutCount + " inactive users");
            }
        } catch (Exception e) {
            System.err.println("Error in session cleanup: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Immediately logs out all users (used on app startup).
     * Useful when the server is restarted to clear stale sessions.
     */
    @Transactional
    public void logoutAllUsers() {
        try {
            List<UserAccount> loggedInUsers = userRepository.findByLoggedInTrue();
            int count = 0;
            for (UserAccount user : loggedInUsers) {
                user.setLoggedIn(false);
                user.setLastActivityTime(null);
                userRepository.save(user);
                count++;
            }
            System.out.println("SessionCleanupService: Logged out " + count + " users on startup");
        } catch (Exception e) {
            System.err.println("Error logging out all users: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
