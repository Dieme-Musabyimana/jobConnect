package utils;

import models.JobEntry;
import models.User;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class MatchingEngineTest {

    @Test
    void testWeightedScoringTechProfile() {
        User user = new User();
        user.name = "Jean-Pierre";
        user.educationLevel = "Bachelor's Degree";
        user.fieldOfStudy = "Computer Science / Information Technology";
        user.skills = Arrays.asList("JavaScript", "React", "Node.js", "Git");
        user.preferredCategories = Arrays.asList("JOB", "INTERNSHIP");
        user.preferredLocation = "Kigali, Rwanda";
        user.active = true;

        JobEntry job = new JobEntry();
        job.title = "Junior Full-Stack Software Developer";
        job.organization = "Irembo Ltd";
        job.category = "JOB";
        job.fieldOfStudy = "Computer Science / Information Technology";
        job.requiredSkills = Arrays.asList("JavaScript", "React", "Node.js", "Git", "REST APIs");
        job.educationLevel = "Bachelor's Degree";
        job.location = "Kigali, Rwanda";

        MatchingEngine.MatchResult result = MatchingEngine.calculateMatch(user, job);

        assertNotNull(result);
        assertTrue(result.score >= 80.0, "Expected match score >= 80 for strong alignment, got: " + result.score);
        assertFalse(result.reasons.isEmpty(), "Reasons should not be empty");
        assertTrue(result.reasons.stream().anyMatch(r -> r.contains("skills") || r.contains("React")),
                "Should include skills match reason");
    }

    @Test
    void testThresholdFiltering() {
        User user = new User();
        user.name = "Eric";
        user.educationLevel = "TVET Certificate / A2 Level";
        user.fieldOfStudy = "Electrical Engineering & TVET";
        user.skills = Arrays.asList("Electrical Wiring", "Solar PV Systems");
        user.preferredCategories = List.of("APPRENTICESHIP");
        user.preferredLocation = "Musanze, Rwanda";
        user.active = true;

        // Unrelated job (e.g. Health Data Analyst requiring Bachelor's in Public Health in Rwamagana)
        JobEntry unrelatedJob = new JobEntry();
        unrelatedJob.title = "District Health Data Analyst";
        unrelatedJob.organization = "Ministry of Health";
        unrelatedJob.category = "JOB";
        unrelatedJob.fieldOfStudy = "Public Health, Statistics";
        unrelatedJob.requiredSkills = Arrays.asList("DHIS2", "Healthcare Reporting");
        unrelatedJob.educationLevel = "Bachelor's Degree (A0)";
        unrelatedJob.location = "Rwamagana, Rwanda";

        MatchingEngine.MatchResult result = MatchingEngine.calculateMatch(user, unrelatedJob);

        // Score should be below the 60 threshold
        assertTrue(result.score < 60.0, "Unrelated job should score < 60, got: " + result.score);
    }

    @Test
    void testDeduplicationAndExpiry() {
        JobEntry job1 = new JobEntry();
        job1.title = "Forest Extension Officer";
        job1.organization = "MIFOTRA";
        job1.applicationUrl = "https://recruitment.mifotra.gov.rw/job/123";

        JobEntry job2 = new JobEntry();
        job2.title = "Forest Extension Officer ";
        job2.organization = "MIFOTRA";
        job2.applicationUrl = "https://recruitment.mifotra.gov.rw/job/123/";

        String key1 = MatchingEngine.buildCanonicalKey(job1);
        String key2 = MatchingEngine.buildCanonicalKey(job2);

        assertEquals(key1, key2, "Canonical keys should match despite trailing spaces or slashes");

        String statusActive = MatchingEngine.evaluateStatus("Dec 31, 2026", "LIVE");
        assertEquals("ACTIVE", statusActive);
    }
}
