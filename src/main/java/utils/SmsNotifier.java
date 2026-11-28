package utils;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.cdimascio.dotenv.Dotenv;
import models.User;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

public class SmsNotifier {
    private static final Dotenv DOTENV = loadDotenv();
    private static final int MAX_SMS_LENGTH = 1500;
    private static final String TWILIO_MESSAGES_URL =
            "https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private static final Set<String> dispatchedRecipients = new HashSet<>();

    public static synchronized void beginScraperRun() {
        dispatchedRecipients.clear();
    }

    private static Dotenv loadDotenv() {
        try {
            return Dotenv.configure().ignoreIfMissing().load();
        } catch (RuntimeException e) {
            return null;
        }
    }

    public int notifyUserWithDigest(User user, Collection<WhatsAppNotifier.OpportunityMatch> candidates) {
        if (user == null || !user.notifySms) return 0;
        List<WhatsAppNotifier.OpportunityMatch> matches = NotificationDigest.eligibleMatches(user, candidates);
        if (matches.isEmpty()) return 0;
        String recipientId = NotificationDigest.recipientIdentifier(user);
        synchronized (SmsNotifier.class) {
            if (!dispatchedRecipients.add(recipientId)) return 0;
        }

        String message = NotificationDigest.format(user, matches, MAX_SMS_LENGTH);
        String accountSid = config("TWILIO_ACCOUNT_SID");
        String authToken = config("TWILIO_AUTH_TOKEN");
        String from = firstConfig("TWILIO_SMS_FROM", "TWILIO_FROM_NUMBER", "TWILIO_WHATSAPP_NUMBER");
        boolean liveEnabled = "true".equalsIgnoreCase(config("SEND_LIVE_SMS", "false"));

        if (!liveEnabled || blank(accountSid) || blank(authToken) || blank(from)) {
            NotificationDigest.record(user, "SMS", "SIMULATED_SMS_SENT", matches,
                    digestSummary(matches.size()), null, null);
            System.out.println("[SMS] Simulated digest recorded for " + matches.size() + " opportunities.");
            return matches.size();
        }

        if (blank(user.phone)) {
            NotificationDigest.record(user, "SMS", "DELIVERY_FAILED", matches,
                    digestSummary(matches.size()), "MISSING_RECIPIENT", null);
            System.err.println("[SMS] Digest delivery failed: recipient is not configured.");
            return matches.size();
        }

        try {
            String credentials = accountSid + ":" + authToken;
            String authorization = Base64.getEncoder().encodeToString(
                    credentials.getBytes(StandardCharsets.UTF_8));
            String form = "To=" + formEncode(normalizePhone(user.phone))
                    + "&From=" + formEncode(normalizePhone(from))
                    + "&Body=" + formEncode(message);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(String.format(TWILIO_MESSAGES_URL, accountSid)))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Basic " + authorization)
                    .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(form, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            TwilioResponse twilioResponse = parseTwilioResponse(response.body());
            String httpStatus = "HTTP_" + response.statusCode();

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                NotificationDigest.record(user, "SMS", "SENT", matches,
                        digestSummary(matches.size()), null,
                        twilioResponse.status == null ? httpStatus : twilioResponse.status);
                System.out.println("[SMS] Digest submitted successfully for " + matches.size() + " opportunities.");
            } else {
                String errorCode = twilioResponse.errorCode == null
                        ? httpStatus : "TWILIO_" + twilioResponse.errorCode;
                NotificationDigest.record(user, "SMS", "DELIVERY_FAILED", matches,
                        digestSummary(matches.size()), errorCode, httpStatus);
                System.err.println("[SMS] Twilio delivery failed with " + errorCode + " and " + httpStatus + ".");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            NotificationDigest.record(user, "SMS", "DELIVERY_FAILED", matches,
                    digestSummary(matches.size()), "SMS_SEND_INTERRUPTED", null);
            System.err.println("[SMS] Digest delivery was interrupted.");
        } catch (Exception e) {
            NotificationDigest.record(user, "SMS", "DELIVERY_FAILED", matches,
                    digestSummary(matches.size()), "SMS_SEND_ERROR", e.getClass().getSimpleName());
            System.err.println("[SMS] Digest delivery failed (" + e.getClass().getSimpleName() + ").");
        }
        return matches.size();
    }

    private static String config(String key) {
        return config(key, null);
    }

    private static String config(String key, String defaultValue) {
        String value = System.getenv(key);
        if (blank(value) && DOTENV != null) value = DOTENV.get(key);
        if (blank(value)) value = System.getProperty(key);
        return blank(value) ? defaultValue : value.trim();
    }

    private static String firstConfig(String... keys) {
        for (String key : keys) {
            String value = config(key);
            if (!blank(value)) return value;
        }
        return null;
    }

    private static String digestSummary(int count) {
        return "Opportunity digest with " + count + " new matches.";
    }

    private static String formEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String normalizePhone(String value) {
        String normalized = value == null ? "" : value.trim();
        while (normalized.regionMatches(true, 0, "whatsapp:", 0, "whatsapp:".length())) {
            normalized = normalized.substring("whatsapp:".length()).trim();
        }
        normalized = normalized.replaceAll("[^0-9+]", "");
        if (normalized.startsWith("+")) {
            normalized = "+" + normalized.substring(1).replace("+", "");
        } else {
            normalized = normalized.replace("+", "");
        }
        return normalized;
    }

    private static TwilioResponse parseTwilioResponse(String body) {
        TwilioResponse result = new TwilioResponse();
        if (blank(body)) return result;
        try {
            JsonElement parsed = JsonParser.parseString(body);
            if (!parsed.isJsonObject()) return result;
            JsonObject object = parsed.getAsJsonObject();
            if (object.has("status") && !object.get("status").isJsonNull()) {
                result.status = object.get("status").getAsString();
            }
            if (object.has("code") && !object.get("code").isJsonNull()) {
                result.errorCode = object.get("code").getAsString();
            }
        } catch (RuntimeException ignored) {
            // HTTP status remains available when Twilio does not return JSON.
        }
        return result;
    }

    private static final class TwilioResponse {
        private String status;
        private String errorCode;
    }

    private static boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
