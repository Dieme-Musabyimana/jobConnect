package models;
import java.time.LocalDateTime;

public class JobEntry {
    public String title;
    public String status;
    public String postedDate; // NEW
    public String deadline;   // NEW
    public String expiredAt;

    public JobEntry(String title, String status, String postedDate, String deadline) {
        this.title = title;
        this.status = status;
        this.postedDate = postedDate;
        this.deadline = deadline;
    }
}