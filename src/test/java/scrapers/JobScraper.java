package scrapers;

import Pages.PortalPage;
import models.JobEntry;
import models.User;
import utils.DataHandler;
import utils.EmailNotifier;
import utils.MatchingEngine;
import utils.SmsNotifier;
import utils.WhatsAppNotifier;
import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Locator;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;

public class JobScraper extends BaseTest {

    @Test
    void runScraper() {
        WhatsAppNotifier.beginScraperRun();
        SmsNotifier.beginScraperRun();
        EmailNotifier.beginScraperRun();
        DataHandler.initializeNotificationsFile();
        Path notificationsPath = DataHandler.getNotificationsPath();
        System.out.println("Notifications file: " + notificationsPath);

        PortalPage portal = new PortalPage(page);
        portal.navigate();

        Map<String, JobEntry> db = DataHandler.loadJobDatabase();
        List<String> currentPortalTitles = new ArrayList<>();
        List<JobEntry> newlyDiscoveredJobs = new ArrayList<>();

        Locator cards = portal.getJobCards();
        int totalFound = cards.count();

        for (int i = 0; i < totalFound; i++) {
            Locator currentCard = cards.nth(i);
            String title = portal.getJobTitle(currentCard);

            String posted = currentCard.locator("p.MuiTypography-body2").nth(0).innerText();
            String deadline = currentCard.locator("p.MuiTypography-body2").nth(1).innerText();

            currentPortalTitles.add(title);

            if (!db.containsKey(title)) {
                JobEntry newJob = new JobEntry(title, "LIVE", posted, deadline);
                newJob.id = "mifotra-" + UUID.randomUUID().toString().substring(0, 8);
                newJob.organization = "MIFOTRA / Public Service Rwanda";
                newJob.category = "JOB";
                newJob.sourceName = "MIFOTRA e-Recruitment";
                newJob.applicationUrl = "https://recruitment.mifotra.gov.rw";
                newJob.location = "Rwanda";
                newJob.eligibilitySummary = "Official Rwandan Public Service vacancy. Apply directly through the MIFOTRA e-recruitment portal.";
                newJob.createdAt = LocalDateTime.now().toString();

                db.put(title, newJob);
                newlyDiscoveredJobs.add(newJob);
            }
        }

        // Handle Expired Jobs
        for (JobEntry job : db.values()) {
            if (!currentPortalTitles.contains(job.title) && "LIVE".equals(job.status)) {
                job.status = "EXPIRED";
                job.expiredAt = LocalDateTime.now().toString();
            }
        }

        int activeSubscriberCount = 0;
        int matchedUserCount = 0;
        int matchedUserJobCount = 0;
        int belowThresholdUserJobCount = 0;
        int notificationsWritten = 0;
        int opportunitiesIncludedInDigests = 0;

        // 5. MATCHING & TARGETED NOTIFICATIONS (matchScore >= 60, channel consent, deduplication)
        if (!newlyDiscoveredJobs.isEmpty()) {
            List<User> subscribers = DataHandler.loadSubscribers();
            WhatsAppNotifier notifier = new WhatsAppNotifier();
            SmsNotifier smsNotifier = new SmsNotifier();
            EmailNotifier emailNotifier = new EmailNotifier();
            Set<User> matchedUsers = Collections.newSetFromMap(new IdentityHashMap<>());
            Map<User, List<WhatsAppNotifier.OpportunityMatch>> matchesByUser = new IdentityHashMap<>();
            activeSubscriberCount = (int) subscribers.stream().filter(Objects::nonNull).filter(user -> user.active).count();

            for (JobEntry job : newlyDiscoveredJobs) {
                for (User user : subscribers) {
                    if (user != null && user.active) {
                        MatchingEngine.MatchResult match = MatchingEngine.calculateMatch(user, job);
                        if (match.score >= 60.0) {
                            matchedUserJobCount++;
                            matchedUsers.add(user);
                            matchesByUser.computeIfAbsent(user, ignored -> new ArrayList<>())
                                    .add(new WhatsAppNotifier.OpportunityMatch(job, match));
                        } else {
                            belowThresholdUserJobCount++;
                        }
                    }
                }
            }
            matchedUserCount = matchedUsers.size();
            for (Map.Entry<User, List<WhatsAppNotifier.OpportunityMatch>> entry : matchesByUser.entrySet()) {
                User user = entry.getKey();
                List<WhatsAppNotifier.OpportunityMatch> userMatches = entry.getValue();
                if (user.notifyWhatsApp) {
                    int includedCount = notifier.notifyUserWithDigest(user, userMatches);
                    if (includedCount > 0) {
                        notificationsWritten++;
                        opportunitiesIncludedInDigests += includedCount;
                    }
                }
                if (user.notifyEmail) {
                    int includedCount = emailNotifier.notifyUserWithDigest(user, userMatches);
                    if (includedCount > 0) {
                        notificationsWritten++;
                        opportunitiesIncludedInDigests += includedCount;
                    }
                }
                if (user.notifySms) {
                    int includedCount = smsNotifier.notifyUserWithDigest(user, userMatches);
                    if (includedCount > 0) {
                        notificationsWritten++;
                        opportunitiesIncludedInDigests += includedCount;
                    }
                }
            }
        } else {
            System.out.println("Notification matching skipped: no newly discovered jobs; scraped jobs were already in the database.");
        }

        DataHandler.runCleanup(db);
        DataHandler.saveJobDatabase(db);
        System.out.println("Jobs scraped: " + totalFound + "; new jobs: " + newlyDiscoveredJobs.size());
        System.out.println("Active subscribers checked: " + activeSubscriberCount
                + "; users with a match score of at least 60: " + matchedUserCount
                + "; matching user-job pairs: " + matchedUserJobCount
                + "; user-job pairs below 60: " + belowThresholdUserJobCount
                + "; digest notifications recorded: " + notificationsWritten
                + "; unsent opportunities included in digests: " + opportunitiesIncludedInDigests);
        System.out.println("Notifications file: " + notificationsPath);
    }
}