package com.DogMate.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CompleteReminderRequest(String administeredAt) {
}
