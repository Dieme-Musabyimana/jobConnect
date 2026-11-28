package utils;

import models.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public final class NotificationDigest {
    private NotificationDigest() {
    }

    public static List<WhatsAppNotifier.OpportunityMatch> eligibleMatches(
            User user, Collection<WhatsAppNotifier.OpportunityMatch> matches) {
        if (user == null || !user.active || !user.optInCategoryAlerts || matches == null) {
            return Collections.emptyList();
        }

        List<WhatsAppNotifier.OpportunityMatch> eligible = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (WhatsAppNotifier.OpportunityMatch candidate : matches) {
            if (candidate == null || candidate.job == null || candidate.match == null
                    || candidate.match.score < 60.0 || !matchesPreferredCategory(user, candidate.job)) {
                continue;
            }

            String idKey = candidate.job.id == null || candidate.job.id.trim().isEmpty()
                    ? null : "id:" + candidate.job.id.trim();
            String titleKey = candidate.job.title == null || candidate.job.title.trim().isEmpty()
                    ? null : "title:" + candidate.job.title.trim().toLowerCase(Locale.ROOT);
            boolean duplicate = (idKey != null && seen.contains(idKey))
                    || (titleKey != null && seen.contains(titleKey));
            if (!duplicate) {
                eligible.add(candidate);
                if (idKey != null) seen.add(idKey);
                if (titleKey != null) seen.add(titleKey);
            }
        }
        eligible.sort(Comparator.comparingDouble(
                        (WhatsAppNotifier.OpportunityMatch candidate) -> candidate.match.score).reversed()
                .thenComparing(candidate -> cleanText(candidate.job.title, 120), String.CASE_INSENSITIVE_ORDER));
        return eligible;
    }

    public static String format(User user, List<WhatsAppNotifier.OpportunityMatch> matches, int maxLength) {
        String greeting = "Mwaramutse " + cleanText(user.name, 80) + "!\nNew opportunities matched to your profile:\n\n";
        String omissionNote = "\n\nAdditional matches omitted to keep this digest concise.";
        List<String> sections = new ArrayList<>();
        for (WhatsAppNotifier.OpportunityMatch candidate : matches) {
            String section = formatOpportunity(candidate, sections.size() + 1);
            String separator = sections.isEmpty() ? "" : "\n\n";
            if (greeting.length() + String.join("\n\n", sections).length()
                    + separator.length() + section.length() + omissionNote.length() > maxLength) {
                break;
            }
            sections.add(section);
        }

        if (sections.isEmpty()) {
            String section = formatOpportunity(matches.get(0), 1);
            int available = Math.max(0, maxLength - greeting.length() - 2);
            return greeting + truncate(section, available);
        }

        String digest = greeting + String.join("\n\n", sections);
        if (sections.size() < matches.size() && digest.length() + omissionNote.length() <= maxLength) {
            digest += omissionNote;
        }
        return digest;
    }

    public static void record(User user, String channel, String status,
                              List<WhatsAppNotifier.OpportunityMatch> matches,
                              String messageSnippet, String errorCode, String providerStatus) {
        List<String> titles = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        List<Double> scores = new ArrayList<>();
        for (WhatsAppNotifier.OpportunityMatch candidate : matches) {
            if (candidate.job.title != null && !candidate.job.title.trim().isEmpty()) {
                titles.add(candidate.job.title.trim());
            }
            if (candidate.job.id != null && !candidate.job.id.trim().isEmpty()) {
                ids.add(candidate.job.id.trim());
            }
            scores.add(candidate.match.score);
        }

        String recipientId = recipientIdentifier(user);
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", UUID.randomUUID().toString());
        record.put("timestamp", java.time.LocalDateTime.now().toString());
        record.put("channel", channel);
        record.put("recipient", recipientId);
        record.put("recipientKey", recipientId);
        record.put("opportunityTitle", titles.isEmpty() ? "Opportunity digest" : titles.get(0));
        record.put("opportunityTitles", titles);
        record.put("sentOpportunityTitles", titles);
        record.put("sentOpportunityIds", ids);
        record.put("jobCount", matches.size());
        record.put("matchScore", scores.isEmpty() ? 0 : scores.get(0));
        record.put("matchScores", scores);
        record.put("status", status);
        record.put("messageSnippet", cleanText(messageSnippet, 180));
        if (errorCode != null && !errorCode.trim().isEmpty()) record.put("errorCode", cleanText(errorCode, 40));
        if (providerStatus != null && !providerStatus.trim().isEmpty()) {
            record.put("providerStatus", cleanText(providerStatus, 40));
        }
        DataHandler.recordNotification(record);
    }

    public static String recipientIdentifier(User user) {
        String identifier = firstNonBlank(user.id, user.email, user.phone, user.name);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(identifier.getBytes(StandardCharsets.UTF_8));
            return "user-" + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Could not create a notification recipient identifier.", e);
        }
    }

    private static boolean matchesPreferredCategory(User user, models.JobEntry job) {
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

    private static String formatOpportunity(WhatsAppNotifier.OpportunityMatch candidate, int index) {
        models.JobEntry job = candidate.job;
        String category = job.domainCategory != null && !job.domainCategory.trim().isEmpty()
                ? job.domainCategory : "Not specified";
        String type = job.opportunityType != null && !job.opportunityType.trim().isEmpty()
                ? job.opportunityType : (job.category != null ? job.category : "Not specified");
        String reasons = candidate.match.reasons == null || candidate.match.reasons.isEmpty()
                ? "Profile criteria match" : String.join(", ", candidate.match.reasons);
        return "Opportunity " + index + ": " + cleanText(job.title, 100) + "\n"
                + "Match score: " + Math.round(candidate.match.score) + "%\n"
                + "Organization: " + cleanText(job.organization, 60) + "\n"
                + "Domain category: " + cleanText(category, 40) + "\n"
                + "Format type: " + cleanText(type, 32) + "\n"
                + "Deadline: " + cleanText(job.deadline, 32, "Open") + "\n"
                + "Match reasons: " + cleanText(reasons, 90) + "\n"
                + "Apply URL: " + cleanUrl(job.applicationUrl);
    }

    private static String cleanUrl(String value) {
        String url = value == null ? "" : value.replaceAll("[\\r\\n\\t ]+", "");
        if (url.isEmpty()) return "Not available";
        return url.replace("_", "%5F").replace("*", "%2A").replace("~", "%7E")
                .replace("`", "%60").replace("[", "%5B").replace("]", "%5D").replace("|", "%7C");
    }

    private static String cleanText(String value, int maxLength) {
        return cleanText(value, maxLength, "Not specified");
    }

    private static String cleanText(String value, int maxLength, String fallback) {
        String clean = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("[*`_~#>|\\[\\]]", "").trim().replaceAll("\\s{2,}", " ");
        if (clean.isEmpty()) clean = fallback;
        return truncate(clean, maxLength);
    }

    private static String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) return value;
        if (maxLength <= 3) return value.substring(0, maxLength);
        return value.substring(0, maxLength - 3).trim() + "...";
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "unknown";
    }
}
