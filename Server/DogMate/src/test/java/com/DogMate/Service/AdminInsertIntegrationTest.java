// package com.DogMate.Service;

// import com.DogMate.Domain.AdminUser;
// import org.junit.jupiter.api.Test;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.context.SpringBootTest;

// import static org.junit.jupiter.api.Assertions.assertEquals;
// import static org.junit.jupiter.api.Assertions.assertNotNull;

// @SpringBootTest
// class AdminInsertIntegrationTest {

//     @Autowired
//     private UserService userService;

//     @Autowired
//     private IUserRepository userRepository;

//     @Test
//     void insertAdminUserIntoDatabase() {
//         String email = "admin@admin.com";
//         String password = "123456";
//         String permissionLevel = "Admin";

//         // Keep this test idempotent by removing any existing user with the same email.
//         userRepository.findByEmail(email).ifPresent(existing -> userService.deleteUser(existing.getId()));

//         AdminUser created = userService.createAdminUser(email, password, permissionLevel);

//         assertNotNull(created.getId());
//         assertEquals(email, created.getEmail());
//         assertEquals(permissionLevel, created.getPermissionLevel());
//     }
// }
