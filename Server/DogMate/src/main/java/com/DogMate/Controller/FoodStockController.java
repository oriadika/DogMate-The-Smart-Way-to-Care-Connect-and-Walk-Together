package com.DogMate.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.DogMate.DTO.FoodStockDTO;
import com.DogMate.Service.DogService;

@RestController
@RequestMapping("/api/food-stock")
public class FoodStockController {

    private final DogService dogService;

    public FoodStockController(DogService dogService) {
        this.dogService = dogService;
    }


    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getMyDogsFoodStocks(@PathVariable String userId) {
        try {
            List<FoodStockDTO> stocks = dogService.getUserFoodStocks(UUID.fromString(userId));

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("foodStocks", stocks);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "נכשלה טעינת מלאי המזון: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }


    @PutMapping("/{id}/renew")
    public ResponseEntity<?> renewFoodStock(@PathVariable UUID id) {
        try {
            FoodStockDTO updatedStock = dogService.renewFoodStock(id);
            return ResponseEntity.ok(updatedStock);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorBody("נכשל חידוש המלאי: " + e.getMessage()));
        }
    }

  
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFoodStock(@PathVariable UUID id) {
        dogService.deleteFoodStock(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "מלאי המזון נמחק והוסר מכל הכלבים");
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFoodStock(@PathVariable UUID id, @RequestBody FoodStockDTO foodStockDTO) {
        try {
            FoodStockDTO updatedStock = dogService.updateFoodStock(id, foodStockDTO);
            return ResponseEntity.ok(updatedStock);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorBody("נכשל עדכון המלאי: " + e.getMessage()));
        }
    }

    private Map<String, Object> errorBody(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}