package utils;

import models.JobEntry;
import models.User;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class MatchingEngine {

    public static class MatchResult {
        public double score;
        public String eligibleNote;
        public List<String> reasons = new ArrayList<>();

        public MatchResult(double score, String eligibleNote, List<String> reasons) {
            this.score = Math.round(score * 10.0) / 10.0;
            this.eligibleNote = eligibleNote;
            this.reasons = reasons != null ? reasons : new ArrayList<>();
        }
    }

    /**
     * Weighted scoring formula:
     * S = 0.20*C + 0.25*F + 0.20*K + 0.20*E + 0.15*L
     *
     * C: Category preference score (0 - 100)
     * F: Field of study score (0 - 100)
     * K: Skills overlap score (0 - 100)
     * E: Education eligibility score (0 - 100)
     * L: Location preference score (0 - 100)
     */
    public static MatchResult calculateMatch(User user, JobEntry job) {
        if (user == null || job == null) {
            return new MatchResult(0.0, "Verify stated eligibility on official source.", Collections.emptyList());
        }

        List<String> reasons = new ArrayList<>();

        // 1. Category Score (0.20)
        double cScore = 50.0;
        String jobCat = (job.category != null) ? job.category.trim().toUpperCase() : "JOB";
        if (user.preferredCategories != null && !user.preferredCategories.isEmpty()) {
            boolean matchesCategory = false;
            for (String pref : user.preferredCategories) {
                if (pref != null && (pref.equalsIgnoreCase(jobCat) || pref.equalsIgnoreCase("ALL"))) {
                    matchesCategory = true;
                    break;
                }
            }
            if (matchesCategory) {
                cScore = 100.0;
                reasons.add("Category matches: " + jobCat);
            } else {
                cScore = 15.0;
            }
        } else {
            cScore = 65.0;
        }

        // 2. Field of Study Score (0.25)
        double fScore = 20.0;
        String userField = user.fieldOfStudy != null ? user.fieldOfStudy.trim().toLowerCase() : "";
        String jobField = job.fieldOfStudy != null ? job.fieldOfStudy.trim().toLowerCase() : "";
        String jobTitle = job.title != null ? job.title.trim().toLowerCase() : "";

        if (userField.isEmpty()) {
            fScore = 50.0;
        } else if (!jobField.isEmpty() && (jobField.contains(userField) || userField.contains(jobField))) {
            fScore = 100.0;
            reasons.add("Field matches " + user.fieldOfStudy);
        } else if (jobTitle.contains(userField)) {
            fScore = 90.0;
            reasons.add("Specialization aligns with title");
        } else {
            String[] tokens = userField.split("[\\s,/]+");
            int matches = 0;
            for (String tok : tokens) {
                if (tok.length() > 2 && (jobField.contains(tok) || jobTitle.contains(tok))) {
                    matches++;
                }
            }
            if (matches > 0) {
                fScore = 70.0;
                reasons.add("Related discipline in " + user.fieldOfStudy);
            } else {
                fScore = 15.0;
            }
        }

        // 3. Skills Overlap Score (0.20)
        double kScore = 30.0;
        List<String> userSkills = user.skills != null ? user.skills : Collections.emptyList();
        List<String> jobSkills = job.requiredSkills != null ? job.requiredSkills : Collections.emptyList();

        if (jobSkills.isEmpty()) {
            kScore = 60.0;
        } else if (userSkills.isEmpty()) {
            kScore = 25.0;
        } else {
            int matchedSkillsCount = 0;
            List<String> matchedSkillNames = new ArrayList<>();
            for (String js : jobSkills) {
                if (js == null) continue;
                String normalizedJs = js.trim().toLowerCase();
                for (String us : userSkills) {
                    if (us == null) continue;
                    String normalizedUs = us.trim().toLowerCase();
                    if (normalizedJs.contains(normalizedUs) || normalizedUs.contains(normalizedJs)) {
                        matchedSkillsCount++;
                        matchedSkillNames.add(js.trim());
                        break;
                    }
                }
            }
            double ratio = (double) matchedSkillsCount / (double) jobSkills.size();
            kScore = Math.max(10.0, Math.min(100.0, ratio * 100.0));
            if (!matchedSkillNames.isEmpty()) {
                reasons.add("Matching skills: " + String.join(", ", matchedSkillNames));
            }
        }

        // 4. Education Eligibility Score (0.20)
        double eScore = calculateEducationScore(user.educationLevel, job.educationLevel);
        if (eScore >= 80.0) {
            String eduLabel = (job.educationLevel != null && !job.educationLevel.trim().isEmpty()) ? job.educationLevel : "Open entry";
            reasons.add("Education aligns with " + eduLabel);
        }

        // 5. Location Preference Score (0.15)
        double lScore = 30.0;
        String userLoc = user.preferredLocation != null ? user.preferredLocation.trim().toLowerCase() : "";
        String jobLoc = job.location != null ? job.location.trim().toLowerCase() : "";

        if (userLoc.isEmpty() || userLoc.contains("all") || userLoc.contains("any")) {
            lScore = 80.0;
            reasons.add("Flexible location preference");
        } else if (jobLoc.contains("remote") || jobLoc.contains("nationwide") || jobLoc.contains("all rwanda")) {
            lScore = 95.0;
            reasons.add("Accessible nationwide or remote");
        } else if (!jobLoc.isEmpty() && (jobLoc.contains(userLoc.split(",")[0].trim()) || userLoc.contains(jobLoc.split(",")[0].trim()))) {
            lScore = 100.0;
            reasons.add("Location matches " + job.location);
        } else {
            lScore = 15.0;
        }

        double totalScore = (0.20 * cScore) + (0.25 * fScore) + (0.20 * kScore) + (0.20 * eScore) + (0.15 * lScore);
        totalScore = Math.max(0.0, Math.min(100.0, totalScore));

        String eligibleNote = "Note: Independent opportunity index. Verify all stated eligibility criteria and deadlines directly on the official source.";

        return new MatchResult(totalScore, eligibleNote, reasons);
    }

    private static double calculateEducationScore(String userEdu, String jobEdu) {
        if (jobEdu == null || jobEdu.trim().isEmpty() || jobEdu.equalsIgnoreCase("OPEN") || jobEdu.equalsIgnoreCase("NONE") || jobEdu.toLowerCase().contains("any")) {
            return 100.0;
        }
        if (userEdu == null || userEdu.trim().isEmpty()) {
            return 45.0;
        }

        int userRank = getEducationRank(userEdu);
        int jobRank = getEducationRank(jobEdu);

        if (userRank >= jobRank) {
            return 100.0;
        } else if (userRank == jobRank - 1) {
            return 60.0;
        } else {
            return 20.0;
        }
    }

    private static int getEducationRank(String edu) {
        String s = edu.toLowerCase();
        if (s.contains("phd") || s.contains("doctor")) return 5;
        if (s.contains("master")) return 4;
        if (s.contains("bachelor") || s.contains("degree") || s.contains("university") || s.contains("a0")) return 3;
        if (s.contains("diploma") || s.contains("advanced diploma") || s.contains("a1") || s.contains("tvet")) return 2;
        if (s.contains("high school") || s.contains("secondary") || s.contains("a2")) return 1;
        return 2;
    }

    /**
     * Deduplication helper: generates a canonical identity key for an opportunity.
     */
    public static String buildCanonicalKey(JobEntry job) {
        if (job == null) return UUID.randomUUID().toString();
        if (job.applicationUrl != null && !job.applicationUrl.trim().isEmpty()) {
            return job.applicationUrl.trim().toLowerCase().replaceAll("^https?://(www\\.)?", "").replaceAll("/+$", "");
        }
        String org = job.organization != null ? job.organization.trim().toLowerCase() : "unknown";
        String title = job.title != null ? job.title.trim().toLowerCase().replaceAll("[^a-z0-9]", "") : "listing";
        return org + "_" + title;
    }

    /**
     * Evaluates status as ACTIVE or EXPIRED based on deadline strings.
     */
    public static String evaluateStatus(String deadlineStr, String currentStatus) {
        if ("EXPIRED".equalsIgnoreCase(currentStatus)) {
            return "EXPIRED";
        }
        if (deadlineStr == null || deadlineStr.trim().isEmpty()) {
            return "ACTIVE";
        }
        String[] patterns = { "MMM d, yyyy", "MMM dd, yyyy", "yyyy-MM-dd", "dd/MM/yyyy" };
        for (String pattern : patterns) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH);
                LocalDate deadline = LocalDate.parse(deadlineStr.trim(), formatter);
                if (deadline.isBefore(LocalDate.now())) {
                    return "EXPIRED";
                } else {
                    return "ACTIVE";
                }
            } catch (Exception ignored) {
            }
        }
        return "ACTIVE";
    }
}
