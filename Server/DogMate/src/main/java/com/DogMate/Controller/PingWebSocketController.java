package com.DogMate.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * WebSocket ping / meet-response notifications.
 */
@Controller
public class PingWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Handle ping notifications via WebSocket — client sends to /app/ping (optional path).
     */
    @MessageMapping("/ping")
    public void handlePing(PingNotification notification) {
        try {
            System.out.println("WebSocket Ping received from: " + notification.getFromUserId()
                + " to: " + notification.getToUserId());

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
     * Broadcasts to /topic/ping/{targetUserId}. Used by UserController for PING and MEET_RESPONSE.
     */
    public void sendToUserTopic(String targetUserId, PingNotification notification) {
        messagingTemplate.convertAndSend("/topic/ping/" + targetUserId, notification);
    }

    /**
     * DTO for WebSocket JSON — kinds: PING (meet invite), MEET_RESPONSE (accept/decline).
     */
    public static class PingNotification {
        /** PING or MEET_RESPONSE */
        private String kind;
        private String pingId;
        private String fromUserId;
        private String fromUserName;
        private String toUserId;
        private long timestamp;

        private String dogName;
        private String dogBreed;
        private String dogAgeLabel;
        private String dogImageUrl;

        /** MEET_RESPONSE: did the recipient accept */
        private Boolean accepted;

        public PingNotification() {
            this.timestamp = System.currentTimeMillis();
            this.kind = "PING";
        }

        public String getKind() {
            return kind;
        }

        public void setKind(String kind) {
            this.kind = kind;
        }

        public String getPingId() {
            return pingId;
        }

        public void setPingId(String pingId) {
            this.pingId = pingId;
        }

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

        public String getDogName() {
            return dogName;
        }

        public void setDogName(String dogName) {
            this.dogName = dogName;
        }

        public String getDogBreed() {
            return dogBreed;
        }

        public void setDogBreed(String dogBreed) {
            this.dogBreed = dogBreed;
        }

        public String getDogAgeLabel() {
            return dogAgeLabel;
        }

        public void setDogAgeLabel(String dogAgeLabel) {
            this.dogAgeLabel = dogAgeLabel;
        }

        public String getDogImageUrl() {
            return dogImageUrl;
        }

        public void setDogImageUrl(String dogImageUrl) {
            this.dogImageUrl = dogImageUrl;
        }

        public Boolean getAccepted() {
            return accepted;
        }

        public void setAccepted(Boolean accepted) {
            this.accepted = accepted;
        }
    }
}
