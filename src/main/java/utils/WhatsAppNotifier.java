package utils;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import io.github.cdimascio.dotenv.Dotenv;
import models.JobEntry;
import models.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

public class WhatsAppNotifier {
    private static Dotenv dotenv;
    static {
        try {
            dotenv = Dotenv.configure().ignoreIfMissing().load();
        } catch (Exception e) {
            dotenv = null;
        }
    }

    public static final String ACCOUNT_SID = dotenv != null ? dotenv.get("TWILIO_ACCOUNT_SID") : null;
    public static final String AUTH_TOKEN = dotenv != null ? dotenv.get("TWILIO_AUTH_TOKEN") : null;
    public static final String FROM_NUMBER = dotenv != null ? dotenv.get("TWILIO_WHATSAPP_NUMBER") : null;

    // Track dispatched user+opportunity pairs in memory to prevent duplicate alerts in a run
    private static final Set<String> sentAlertKeys = new HashSet<>();
    private static final Object dispatchLock = new Object();
    private static boolean liveModeReminderShown;
    private static final int MAX_MESSAGE_LENGTH = 1600;

    public static class OpportunityMatch {
        public final JobEntry job;
        public final MatchingEngine.MatchResult match;

        public OpportunityMatch(JobEntry job, MatchingEngine.MatchResult match) {
            this.job = job;
            this.match = match;
        }
    }

    private static String liveModeSetting() {
        String setting = System.getenv("SEND_LIVE_WHATSAPP");
        if (setting == null || setting.trim().isEmpty()) {
            setting = dotenv != null ? dotenv.get("SEND_LIVE_WHATSAPP") : null;
        }
        if (setting == null || setting.trim().isEmpty()) {
            setting = System.getProperty("SEND_LIVE_WHATSAPP");
        }
        return setting;
    }

    private static boolean isLiveEnabled() {
        String setting = liveModeSetting();
        if (setting == null || setting.trim().isEmpty()) {
            synchronized (WhatsAppNotifier.class) {
                if (!liveModeReminderShown) {
                    System.err.println("SEND_LIVE_WHATSAPP is not configured. Add SEND_LIVE_WHATSAPP=true to your .env file to enable live WhatsApp.");
                    liveModeReminderShown = true;
                }
            }
            return false;
        }
        return "true".equalsIgnoreCase(setting.trim());
    }

    private static String normalizeWhatsAppNumber(String number) {
        String normalized = number == null ? "" : number.trim();
        while (normalized.regionMatches(true, 0, "whatsapp:", 0, "whatsapp:".length())) {
            normalized = normalized.substring("whatsapp:".length()).trim();
        }
        normalized = normalized.replaceAll("[^0-9+]", "");
        int plusIndex = normalized.indexOf('+');
        if (plusIndex > 0) {
            normalized = normalized.replace("+", "");
        } else if (plusIndex == 0) {
            normalized = "+" + normalized.substring(1).replace("+", "");
        }
        return "whatsapp:" + normalized;
    }

    private static String redactSensitiveValues(String message, String targetNumber, String fromNumber) {
        String redacted = message == null ? "No error message provided." : message;
        for (String sensitive : Arrays.asList(targetNumber, fromNumber, ACCOUNT_SID, AUTH_TOKEN)) {
            if (sensitive != null && !sensitive.isEmpty()) {
                redacted = redacted.replace(sensitive, "[REDACTED]");
            }
        }
        return redacted.replaceAll("(?<![A-Za-z0-9])\\+?[0-9][0-9 .()\\-]{6,}[0-9](?![A-Za-z0-9])", "[REDACTED PHONE]");
    }

    public boolean sendWhatsApp(String targetNumber, String messageContent) {
        boolean isLiveEnabled = isLiveEnabled();
        boolean hasCredentials = ACCOUNT_SID != null && !ACCOUNT_SID.isEmpty() &&
                                 AUTH_TOKEN != null && !AUTH_TOKEN.isEmpty() &&
                                 FROM_NUMBER != null && !FROM_NUMBER.isEmpty();

        if (isLiveEnabled && !hasCredentials) {
            System.err.println("[LIVE TWILIO ERROR] Live WhatsApp is enabled but required credentials are not configured.");
            return false;
        }

        if (isLiveEnabled) {
            String normalizedTarget = normalizeWhatsAppNumber(targetNumber);
            String normalizedFrom = normalizeWhatsAppNumber(FROM_NUMBER);
            try {
                Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
                Message sentMessage = Message.creator(
                        new com.twilio.type.PhoneNumber(normalizedTarget),
                        new com.twilio.type.PhoneNumber(normalizedFrom),
                        messageContent
                ).create();
                System.out.println("[LIVE TWILIO] WhatsApp notification sent. Message SID: " + sentMessage.getSid());
                return true;
            } catch (Exception e) {
                String details = "[LIVE TWILIO ERROR] " + redactSensitiveValues(e.getMessage(), normalizedTarget, normalizedFrom);
                if (e instanceof ApiException) {
                    ApiException apiException = (ApiException) e;
                    details += " (Twilio code: " + apiException.getCode()
                            + ", HTTP status: " + apiException.getStatusCode() + ")";
                } else {
                    details += " (" + e.getClass().getSimpleName() + ")";
                }
                System.err.println(details);
                return false;
            }
        } else {
            System.out.println("[SIMULATED WHATSAPP ($0 Mode)] Content: " +
                    (messageContent.length() > 60 ? messageContent.substring(0, 60) + "..." : messageContent));
            return true;
        }
    }

    public int notifyUserWithDigest(User user, Collection<OpportunityMatch> matches) {
        synchronized (dispatchLock) {
            return dispatchUserDigest(user, matches);
        }
    }

    public static void beginScraperRun() {
        synchronized (dispatchLock) {
            sentAlertKeys.clear();
        }
    }

    private int dispatchUserDigest(User user, Collection<OpportunityMatch> matches) {
        if (user == null || matches == null || !user.active || !user.notifyWhatsApp || !user.optInCategoryAlerts) {
            return 0;
        }
        String recipientKey = recipientKey(user);
        List<OpportunityMatch> unsentMatches = new ArrayList<>();
        Set<String> candidateKeys = new HashSet<>();
        for (OpportunityMatch candidate : matches) {
            if (candidate == null || candidate.job == null || candidate.match == null
                    || candidate.match.score < 60.0 || !matchesPreferredCategory(user, candidate.job)) {
                continue;
            }

            Set<String> opportunityKeys = opportunityKeys(candidate.job);
            boolean alreadySent = opportunityKeys.stream().anyMatch(key ->
                    sentAlertKeys.contains(recipientKey + "|" + key)
                            || candidateKeys.contains(key));
            if (!alreadySent) {
                unsentMatches.add(candidate);
                candidateKeys.addAll(opportunityKeys);
            }
        }
        unsentMatches.sort(Comparator.comparingDouble((OpportunityMatch candidate) -> candidate.match.score)
                .reversed()
                .thenComparing(candidate -> cleanText(candidate.job.title, 120), String.CASE_INSENSITIVE_ORDER));
        if (unsentMatches.isEmpty()) return 0;

        String greeting = "Mwaramutse " + cleanText(user.name, 80) + "!\nNew opportunities matched to your profile:\n\n";
        List<String> sections = new ArrayList<>();
        List<OpportunityMatch> includedMatches = new ArrayList<>();
        boolean truncated = false;
        for (OpportunityMatch candidate : unsentMatches) {
            String section = formatOpportunity(candidate, includedMatches.size() + 1);
            String proposed = greeting + String.join("\n\n", append(sections, section));
            if (proposed.length() > MAX_MESSAGE_LENGTH) {
                truncated = true;
                continue;
            }
            sections.add(section);
            includedMatches.add(candidate);
        }

        if (includedMatches.isEmpty()) return 0;
        String message = greeting + String.join("\n\n", sections);
        if (truncated) {
            String note = "\n\nAdditional matches omitted to keep this message within the 1600-character limit.";
            while (!includedMatches.isEmpty() && message.length() + note.length() > MAX_MESSAGE_LENGTH) {
                includedMatches.remove(includedMatches.size() - 1);
                sections.remove(sections.size() - 1);
                message = greeting + String.join("\n\n", sections);
            }
            if (includedMatches.isEmpty()) return 0;
            message += note;
        }

        if (!sendWhatsApp(user.phone, message)) return 0;

        List<String> sentIds = new ArrayList<>();
        List<String> sentTitles = new ArrayList<>();
        List<String> alertKeys = new ArrayList<>();
        for (OpportunityMatch candidate : includedMatches) {
            JobEntry job = candidate.job;
            if (job.id != null && !job.id.trim().isEmpty()) sentIds.add(job.id.trim());
            if (job.title != null && !job.title.trim().isEmpty()) sentTitles.add(job.title.trim());
            for (String opportunityKey : opportunityKeys(job)) {
                alertKeys.add(opportunityKey);
            }
        }

        Map<String, Object> logEntry = new LinkedHashMap<>();
        logEntry.put("id", UUID.randomUUID().toString());
        logEntry.put("timestamp", LocalDateTime.now().toString());
        logEntry.put("channel", "WHATSAPP");
        logEntry.put("recipient", cleanText(user.name, 80));
        logEntry.put("recipientKey", recipientKey);
        logEntry.put("sentOpportunityIds", sentIds);
        logEntry.put("sentOpportunityTitles", sentTitles);
        logEntry.put("opportunityTitles", sentTitles);
        logEntry.put("opportunityTitle", sentTitles.get(0));
        logEntry.put("organization", includedMatches.get(0).job.organization);
        logEntry.put("matchScore", includedMatches.get(0).match.score);
        logEntry.put("matchScores", includedMatches.stream().map(candidate -> candidate.match.score).toList());
        logEntry.put("status", isLiveEnabled() ? "LIVE_WHATSAPP_SENT" : "SIMULATED_SUCCESS");
        logEntry.put("messageSnippet", "Opportunity digest with " + includedMatches.size() + " new matches.");
        DataHandler.recordNotification(logEntry);
        for (String opportunityKey : alertKeys) {
            sentAlertKeys.add(recipientKey + "|" + opportunityKey);
        }
        return includedMatches.size();
    }

    private static boolean matchesPreferredCategory(User user, JobEntry job) {
        String category = job.domainCategory != null && !job.domainCategory.trim().isEmpty()
                ? job.domainCategory.trim()
                : (job.category != null ? job.category.trim() : "General");
        if (user.preferredCategories == null || user.preferredCategories.isEmpty()) return true;
        for (String preference : user.preferredCategories) {
            if (preference != null && (preference.equalsIgnoreCase("ALL")
                    || preference.equalsIgnoreCase(category)
                    || category.toLowerCase(Locale.ROOT).contains(preference.toLowerCase(Locale.ROOT)))) {
                return true;
            }
        }
        return false;
    }

    private static Set<String> opportunityKeys(JobEntry job) {
        Set<String> keys = new HashSet<>();
        if (job.id != null && !job.id.trim().isEmpty()) keys.add("id:" + job.id.trim());
        if (job.title != null && !job.title.trim().isEmpty()) {
            keys.add("title:" + job.title.trim().toLowerCase(Locale.ROOT));
        }
        return keys;
    }

    private static String recipientKey(User user) {
        if (user.id != null && !user.id.trim().isEmpty()) return "user:" + user.id.trim();
        String identity = user.phone != null && !user.phone.trim().isEmpty()
                ? user.phone.trim()
                : (user.email != null && !user.email.trim().isEmpty() ? user.email.trim() : String.valueOf(user.name));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));
            return "hash:" + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Could not create a stable notification recipient key.", e);
        }
    }

    private static List<String> append(List<String> values, String value) {
        List<String> result = new ArrayList<>(values);
        result.add(value);
        return result;
    }

    private static String formatOpportunity(OpportunityMatch candidate, int index) {
        JobEntry job = candidate.job;
        String category = job.domainCategory != null && !job.domainCategory.trim().isEmpty()
                ? job.domainCategory : "Not specified";
        String type = job.opportunityType != null && !job.opportunityType.trim().isEmpty()
                ? job.opportunityType : (job.category != null ? job.category : "Not specified");
        String reasons = candidate.match.reasons == null || candidate.match.reasons.isEmpty()
                ? "Profile criteria match"
                : String.join(", ", candidate.match.reasons);
        return "Opportunity " + index + ": " + cleanText(job.title, 120) + "\n"
                + "Match score: " + Math.round(candidate.match.score) + "%\n"
                + "Organization: " + cleanText(job.organization, 80, "Not specified") + "\n"
                + "Domain category: " + cleanText(category, 50) + "\n"
                + "Format type: " + cleanText(type, 40) + "\n"
                + "Deadline: " + cleanText(job.deadline, 40, "Open") + "\n"
                + "Match reasons: " + cleanText(reasons, 120) + "\n"
                + "Apply URL: " + cleanUrl(job.applicationUrl);
    }

    private static String cleanUrl(String value) {
        String url = value == null ? "" : value.replaceAll("[\\r\\n\\t ]+", "");
        if (url.isEmpty()) return "Not available";
        return url.replace("_", "%5F")
                .replace("*", "%2A")
                .replace("~", "%7E")
                .replace("`", "%60")
                .replace("[", "%5B")
                .replace("]", "%5D")
                .replace("|", "%7C");
    }

    private static String cleanText(String value, int maxLength) {
        return cleanText(value, maxLength, "Not specified");
    }

    private static String cleanText(String value, int maxLength, String fallback) {
        String clean = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("[*`_~#>|]", "").replace("[", "").replace("]", "")
                .trim().replaceAll("\\s{2,}", " ");
        if (clean.isEmpty()) clean = fallback;
        if (clean.length() > maxLength) clean = clean.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
        return clean;
    }
}