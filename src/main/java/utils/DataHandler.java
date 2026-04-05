package utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import models.JobEntry;
import models.User;

import java.io.*;
import java.net.URL;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

public class DataHandler {
    private static final Path JOBS_PATH = Paths.get("src/test/resources/jobs.json");
    private static final String SHEET_API_URL = "https://sheetdb.io/api/v1/n66m3qv8qvqyf"; // Your Live API
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    // 1. Updated: Load Subscribers from the Cloud (Google Sheets)
    public static List<User> loadSubscribers() {
        System.out.println("🌐 Fetching live subscribers from Google Sheets...");
        try {
            URL url = new URL(SHEET_API_URL);
            try (InputStream is = url.openStream();
                 Scanner s = new Scanner(is).useDelimiter("\\A")) {

                String jsonResponse = s.hasNext() ? s.next() : "[]";

                // Map the JSON directly to your List<User>
                List<User> users = gson.fromJson(jsonResponse, new TypeToken<List<User>>(){}.getType());

                System.out.println("✅ Found " + (users != null ? users.size() : 0) + " subscribers.");
                return users != null ? users : new ArrayList<>();
            }
        } catch (Exception e) {
            System.err.println("⚠️ Cloud Load Error: " + e.getMessage() + ". Falling back to local file.");
            return loadLocalSubscribers(); // Fallback if internet is down
        }
    }

    // 2. Keep this as a Backup (Optional)
    private static List<User> loadLocalSubscribers() {
        Path USERS_PATH = Paths.get("src/test/resources/users.json");
        try {
            if (!Files.exists(USERS_PATH)) return new ArrayList<>();
            try (Reader reader = Files.newBufferedReader(USERS_PATH)) {
                List<User> users = gson.fromJson(reader, new TypeToken<List<User>>(){}.getType());
                return users != null ? users : new ArrayList<>();
            }
        } catch (IOException e) { return new ArrayList<>(); }
    }

    // --- Keep your Job Database methods as they are ---
    public static Map<String, JobEntry> loadJobDatabase() {
        try {
            if (!Files.exists(JOBS_PATH)) return new HashMap<>();
            try (Reader reader = Files.newBufferedReader(JOBS_PATH)) {
                Map<String, JobEntry> data = gson.fromJson(reader, new TypeToken<Map<String, JobEntry>>() {}.getType());
                return data != null ? data : new HashMap<>();
            }
        } catch (IOException e) { return new HashMap<>(); }
    }

    public static void saveJobDatabase(Map<String, JobEntry> database) {
        try (Writer writer = Files.newBufferedWriter(JOBS_PATH)) {
            gson.toJson(database, writer);
        } catch (IOException e) { System.err.println("Database Save Error: " + e.getMessage()); }
    }

    public static void runCleanup(Map<String, JobEntry> database) {
        LocalDateTime now = LocalDateTime.now();
        database.entrySet().removeIf(entry -> {
            JobEntry job = entry.getValue();
            if ("EXPIRED".equals(job.status) && job.expiredAt != null) {
                return Duration.between(LocalDateTime.parse(job.expiredAt), now).toHours() >= 60;
            }
            return false;
        });
    }
}