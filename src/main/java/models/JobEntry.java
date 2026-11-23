package models;

import java.util.ArrayList;
import java.util.List;

public class JobEntry {
    public String id;
    public String title;
    public String organization;
    public String category; // Legacy or Type: JOB, INTERNSHIP, SCHOLARSHIP, TRAINING, ENTREPRENEURSHIP, APPRENTICESHIP, FELLOWSHIP
    public String opportunityType; // Opportunity Format/Type: JOB, INTERNSHIP, SCHOLARSHIP, TRAINING, ENTREPRENEURSHIP, APPRENTICESHIP, FELLOWSHIP
    public String domainCategory; // Domain category: IT, Energy, Accounting / Accountant, Agriculture, Engineering, Business / Administration, Health, etc.
    public String fieldOfStudy;
    public List<String> requiredSkills = new ArrayList<>();
    public String educationLevel;
    public String location;
    public String sourceName;
    public String applicationUrl;
    public String eligibilitySummary;
    public String status; // LIVE, ACTIVE, EXPIRED
    public String postedDate;
    public String deadline;
    public String expiredAt;
    public String createdAt;

    public JobEntry() {
    }

    // Preserved 4-arg constructor to maintain full backward compatibility
    public JobEntry(String title, String status, String postedDate, String deadline) {
        this.title = title;
        this.status = status;
        this.postedDate = postedDate;
        this.deadline = deadline;
    }

    // Extended constructor for full opportunity specifications
    public JobEntry(String id, String title, String organization, String category,
                    String fieldOfStudy, List<String> requiredSkills, String educationLevel,
                    String location, String sourceName, String applicationUrl,
                    String eligibilitySummary, String status, String postedDate,
                    String deadline, String expiredAt, String createdAt) {
        this.id = id;
        this.title = title;
        this.organization = organization;
        this.category = category;
        this.opportunityType = category;
        this.fieldOfStudy = fieldOfStudy;
        if (requiredSkills != null) {
            this.requiredSkills = requiredSkills;
        }
        this.educationLevel = educationLevel;
        this.location = location;
        this.sourceName = sourceName;
        this.applicationUrl = applicationUrl;
        this.eligibilitySummary = eligibilitySummary;
        this.status = status;
        this.postedDate = postedDate;
        this.deadline = deadline;
        this.expiredAt = expiredAt;
        this.createdAt = createdAt;
    }
}