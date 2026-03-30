package com.DogMate.Controller;

import com.DogMate.Domain.DogWalkerUser;
import com.DogMate.Domain.WalkerCityOffering;
import com.DogMate.Service.DogWalkerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DogWalkerController.class)
@AutoConfigureMockMvc(addFilters = false)
class DogWalkerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DogWalkerService dogWalkerService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getProfessionalProfile_returnsPayload() throws Exception {
        UUID id = UUID.randomUUID();
        DogWalkerUser walker = new DogWalkerUser(
                id, "walker@test.com", "hash", "Jane", "Walker");
        walker.getCityOfferings().add(new WalkerCityOffering("Haifa", "09:00-17:00", "80 ₪ לשעה"));
        when(dogWalkerService.getProfessionalProfile(id)).thenReturn(walker);

        mockMvc.perform(get("/api/dog-walkers/" + id + "/professional-profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("walker@test.com"))
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.lastName").value("Walker"))
                .andExpect(jsonPath("$.cityOfferings[0].city").value("Haifa"))
                .andExpect(jsonPath("$.cityOfferings[0].availability").value("09:00-17:00"))
                .andExpect(jsonPath("$.cityOfferings[0].pricing").value("80 ₪ לשעה"));
    }

    @Test
    void getWalkersWithProfessionalProfiles_returnsList() throws Exception {
        UUID id = UUID.randomUUID();
        DogWalkerUser walker = new DogWalkerUser(
                id, "walker@test.com", "hash", "Jane", "Walker");
        walker.getCityOfferings().add(new WalkerCityOffering("Haifa", "09:00-17:00", "80 ₪ לשעה"));
        when(dogWalkerService.getWalkersWithProfessionalDetails()).thenReturn(List.of(walker));

        mockMvc.perform(get("/api/dog-walkers/available-with-professional-profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("walker@test.com"))
                .andExpect(jsonPath("$[0].firstName").value("Jane"))
                .andExpect(jsonPath("$[0].cityOfferings[0].city").value("Haifa"));
    }

    @Test
    void putProfessionalProfile_returnsUpdated() throws Exception {
        UUID id = UUID.randomUUID();
        DogWalkerUser updated = new DogWalkerUser(
                id, "walker@test.com", "hash", "Jane", "Walker");
        updated.setCityOfferings(List.of(new WalkerCityOffering("Tel Aviv", "", "100 ₪")));
        when(dogWalkerService.updateProfessionalProfile(eq(id), any())).thenReturn(updated);

        Map<String, Object> body = Map.of(
                "cityOfferings", List.of(
                        Map.of("city", "Tel Aviv", "availability", "", "pricing", "100 ₪")));

        mockMvc.perform(put("/api/dog-walkers/" + id + "/professional-profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cityOfferings[0].city").value("Tel Aviv"))
                .andExpect(jsonPath("$.cityOfferings[0].pricing").value("100 ₪"));
    }

    @Test
    void putProfessionalProfile_missingCityOfferings_returnsBadRequest() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = Map.of(
                "cities", List.of("Tel Aviv"),
                "availabilityHours", List.of());

        mockMvc.perform(put("/api/dog-walkers/" + id + "/professional-profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
