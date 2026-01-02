package com.DogMate.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class PingWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Handle ping notifications via WebSocket
     * Client sends ping to /app/ping
     * Server broadcasts to /topic/ping/{toUserId}
     */
    @MessageMapping("/ping")
    public void handlePing(PingNotification notification) {
        try {
            System.out.println("WebSocket Ping received from: " + notification.getFromUserId() 
                + " to: " + notification.getToUserId());

            // Send notification to the target user
            messagingTemplate.convertAndSend(
                "/topic/ping/" + notification.getToUserId(),
                notification
            );

            System.out.println("Ping notification sent to user: " + notification.getToUserId());
        } catch (Exception e) {
            System.err.println("Error handling ping: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * DTO for ping notification
     */
    public static class PingNotification {
        private String fromUserId;
        private String fromUserName;
        private String toUserId;
        private long timestamp;

        // Constructors
        public PingNotification() {
            this.timestamp = System.currentTimeMillis();
        }

        public PingNotification(String fromUserId, String fromUserName, String toUserId) {
            this.fromUserId = fromUserId;
            this.fromUserName = fromUserName;
            this.toUserId = toUserId;
            this.timestamp = System.currentTimeMillis();
        }

        // Getters and Setters
        public String getFromUserId() {
            return fromUserId;
        }

        public void setFromUserId(String fromUserId) {
            this.fromUserId = fromUserId;
        }

        public String getFromUserName() {
            return fromUserName;
        }

        public void setFromUserName(String fromUserName) {
            this.fromUserName = fromUserName;
        }

        public String getToUserId() {
            return toUserId;
        }

        public void setToUserId(String toUserId) {
            this.toUserId = toUserId;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
    }
}
