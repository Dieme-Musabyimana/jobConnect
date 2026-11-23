package models;

import java.util.ArrayList;
import java.util.List;

public class User {
    public String id;
    public String name;
    public String email;
    public String phone;
    public String role; // YOUTH, ADMIN, SUPER_ADMIN
    public String adminStatus; // APPROVED, PENDING_APPROVAL, DENIED, NONE
    public boolean active;
    public boolean optInCategoryAlerts = true; // User preference to receive automatic alerts for matched categories
    public String educationLevel;
    public String fieldOfStudy;
    public List<String> skills = new ArrayList<>();
    public List<String> preferredCategories = new ArrayList<>();
    public String preferredLocation;
    public boolean notifyWhatsApp;
    public boolean notifyEmail;
    public boolean notifySms;
    public String notificationFrequency; // IMMEDIATE, DAILY, WEEKLY

    public User() {
        this.active = true;
        this.role = "YOUTH";
        this.adminStatus = "NONE";
        this.optInCategoryAlerts = true;
        this.notifyWhatsApp = true;
        this.notifyEmail = true;
        this.notificationFrequency = "IMMEDIATE";
    }

    // Preserved 3-arg constructor for full backward compatibility
    public User(String name, String phone, boolean active) {
        this.name = name;
        this.phone = phone;
        this.active = active;
        this.role = "YOUTH";
        this.adminStatus = "NONE";
        this.optInCategoryAlerts = true;
        this.notifyWhatsApp = true;
        this.notifyEmail = true;
        this.notificationFrequency = "IMMEDIATE";
    }

    // Comprehensive constructor
    public User(String id, String name, String email, String phone, boolean active,
                String educationLevel, String fieldOfStudy, List<String> skills,
                List<String> preferredCategories, String preferredLocation,
                boolean notifyWhatsApp, boolean notifyEmail, boolean notifySms,
                String notificationFrequency) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = "YOUTH";
        this.adminStatus = "NONE";
        this.active = active;
        this.optInCategoryAlerts = true;
        this.educationLevel = educationLevel;
        this.fieldOfStudy = fieldOfStudy;
        if (skills != null) {
            this.skills = skills;
        }
        if (preferredCategories != null) {
            this.preferredCategories = preferredCategories;
        }
        this.preferredLocation = preferredLocation;
        this.notifyWhatsApp = notifyWhatsApp;
        this.notifyEmail = notifyEmail;
        this.notifySms = notifySms;
        this.notificationFrequency = (notificationFrequency != null) ? notificationFrequency : "IMMEDIATE";
    }
}