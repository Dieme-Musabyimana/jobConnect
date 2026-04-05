
package scrapers;

import Pages.MifotraPage;
import models.JobEntry;
import utils.DataHandler;
import utils.WhatsAppNotifier; // Import the new notifier
import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Locator;

import java.time.LocalDateTime;
import java.util.*;

public class JobScraper extends BaseTest {

    @Test
    void runScraper() {
        // 1. Initialize the Portal Page (Assumes BaseTest setup)
        MifotraPage portal = new MifotraPage(page);
        portal.navigate();

        // 2. Load the Database and setup variables
        Map<String, JobEntry> db = DataHandler.loadJobDatabase();
        List<String> currentPortalTitles = new ArrayList<>();

        // 3. Get the Job Cards
        Locator cards = portal.getJobCards();
        int totalFound = cards.count();

        StringBuilder newJobsBatch = new StringBuilder("🚀 *MIFOTRA NEW JOBS FOUND!*\n\n");
        boolean hasNewJobs = false;

        for (int i = 0; i < totalFound; i++) {
            Locator currentCard = cards.nth(i);
            String title = portal.getJobTitle(currentCard);

            // SCRAPE THE DATES
            String posted = currentCard.locator("p.MuiTypography-body2").nth(0).innerText();
            String deadline = currentCard.locator("p.MuiTypography-body2").nth(1).innerText();

            currentPortalTitles.add(title);

            if (!db.containsKey(title)) {
                db.put(title, new JobEntry(title, "LIVE", posted, deadline));

                newJobsBatch.append("📌 *").append(title).append("*\n");
                newJobsBatch.append("📅 *Posted:* ").append(posted).append("\n");
                newJobsBatch.append("⏳ *Deadline:* ").append(deadline).append("\n\n");

                hasNewJobs = true;
            }
        }

        // 4. Logic for EXPIRED jobs (Compare current portal vs database)
        for (String savedTitle : db.keySet()) {
            if (!currentPortalTitles.contains(savedTitle)) {
                JobEntry job = db.get(savedTitle);
                if (job.status.equals("LIVE")) {
                    job.status = "EXPIRED";
                    job.expiredAt = LocalDateTime.now().toString();
                }
            }
        }

        // 5. Send Batch WhatsApp
        if (hasNewJobs) {
            newJobsBatch.append("--------------------------\n");
            newJobsBatch.append("💡 *HOW TO APPLY:*\n");
            newJobsBatch.append("1. Open the portal: https://recruitment.mifotra.gov.rw/\n");
            newJobsBatch.append("2. Search for the *Job Title* you are interested in.\n");
            newJobsBatch.append("3. Log in to your account to apply.");

            WhatsAppNotifier.sendWhatsAppAlert(newJobsBatch.toString());
        }

        // 6. Save updated database
        DataHandler.saveJobDatabase(db);
    }
}