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


    @GetMapping("/my-food-stocks")
    public ResponseEntity<List<FoodStockDTO>> getMyDogsFoodStocks(@PathVariable String userId) {
        List<FoodStockDTO> stocks = dogService.getUserFoodStocks(UUID.fromString(userId));
        return ResponseEntity.ok(stocks);
    }


    @PutMapping("/{id}/renew")
    public ResponseEntity<FoodStockDTO> renewFoodStock(@PathVariable UUID id) {
        FoodStockDTO updatedStock = dogService.renewFoodStock(id);
        return ResponseEntity.ok(updatedStock);
    }

  
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFoodStock(@PathVariable UUID id) {
        dogService.deleteFoodStock(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Food stock deleted and unlinked from all dogs");
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FoodStockDTO> updateFoodStock(@PathVariable UUID id,@RequestBody FoodStockDTO foodStockDTO) {
        FoodStockDTO updatedStock = dogService.updateFoodStock(id, foodStockDTO);
        return ResponseEntity.ok(updatedStock);
    }
}