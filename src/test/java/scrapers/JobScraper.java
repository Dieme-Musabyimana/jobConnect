package scrapers;

import Pages.PortalPage;
import models.JobEntry;
import models.User; // Ensure this matches your model name
import utils.DataHandler;
import utils.WhatsAppNotifier;
import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Locator;

import java.time.LocalDateTime;
import java.util.*;

public class JobScraper extends BaseTest {

    @Test
    void runScraper() {
        PortalPage portal = new PortalPage(page);
        portal.navigate();

        Map<String, JobEntry> db = DataHandler.loadJobDatabase();
        List<String> currentPortalTitles = new ArrayList<>();

        Locator cards = portal.getJobCards();
        int totalFound = cards.count();

        StringBuilder newJobsBatch = new StringBuilder();
        boolean hasNewJobs = false;

        for (int i = 0; i < totalFound; i++) {
            Locator currentCard = cards.nth(i);
            String title = portal.getJobTitle(currentCard);

            String posted = currentCard.locator("p.MuiTypography-body2").nth(0).innerText();
            String deadline = currentCard.locator("p.MuiTypography-body2").nth(1).innerText();

            currentPortalTitles.add(title);

            if (!db.containsKey(title)) {
                db.put(title, new JobEntry(title, "LIVE", posted, deadline));
                newJobsBatch.append("📌 *").append(title).append("*\n");
                newJobsBatch.append("⏳ *Deadline:* ").append(deadline).append("\n\n");
                hasNewJobs = true;
            }
        }

        // Handle Expired Jobs
        for (JobEntry job : db.values()) {
            if (!currentPortalTitles.contains(job.title) && "LIVE".equals(job.status)) {
                job.status = "EXPIRED";
                job.expiredAt = LocalDateTime.now().toString();
            }
        }

        // 5. BROADCAST TO MULTIPLE USERS
        if (hasNewJobs) {
            List<User> subscribers = DataHandler.loadSubscribers();
            WhatsAppNotifier notifier = new WhatsAppNotifier();

            String footer = "--------------------------\n" +
                    "💡 *HOW TO APPLY:*\n" +
                    "1. Open: https://recruitment.mifotra.gov.rw/\n" +
                    "2. Search & Login to apply.";

            for (User user : subscribers) {
                if (user.active) {
                    String personalizedMsg = "Mwaramutse " + user.name + "!\n" +
                            "🚀 *NEW MIFOTRA JOBS FOUND*\n\n" +
                            newJobsBatch.toString() + footer;

                    notifier.sendWhatsApp(user.phone, personalizedMsg);
                }
            }
        }

        DataHandler.runCleanup(db);
        DataHandler.saveJobDatabase(db);
    }
}