package Pages;

import com.microsoft.playwright.*;

public class MifotraPage {
    private final Page page;

    // Based on your screenshot, each job is wrapped in a section with an aria-labelledby
    private final String jobCards = "section[aria-labelledby^='advertisement-title-']";
    // The title is inside the h3 tag
    private final String titleSelector = "h3";

    public MifotraPage(Page page) {
        this.page = page;
    }

    public void navigate() {
        // We navigate and wait for the actual MUI cards to load
        page.navigate("https://recruitment.mifotra.gov.rw", new Page.NavigateOptions().setTimeout(60000));
        page.waitForSelector(jobCards, new Page.WaitForSelectorOptions().setTimeout(60000));
    }

    public Locator getJobCards() {
        return page.locator(jobCards);
    }

    public String getJobTitle(Locator card) {
        // This targets the h3 inside the card you are currently looking at
        return card.locator(titleSelector).innerText().trim();
    }
}