package utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
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
    private static final Path USERS_PATH = Paths.get("src/test/resources/users.json");
    private static final Path PUBLIC_DATA_DIR = Paths.get("public/data");
    private static final Path PUBLIC_JOBS_PATH = Paths.get("public/data/jobs.json");
    private static final Path PUBLIC_USERS_PATH = Paths.get("public/data/users.json");
    private static final Path PUBLIC_NOTIFICATIONS_PATH = Paths.get("public/data/notifications.json");

    private static final String SHEET_API_URL = "https://sheetdb.io/api/v1/n66m3qv8qvqyf"; // SheetDB API endpoint
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    // 1. Updated: Load Subscribers from the Cloud (Google Sheets) with local users.json fallback
    public static List<User> loadSubscribers() {
        System.out.println("🌐 Fetching live subscribers from Google Sheets...");
        try {
            URL url = new URL(SHEET_API_URL);
            try (InputStream is = url.openStream();
                 Scanner s = new Scanner(is).useDelimiter("\\A")) {

                String jsonResponse = s.hasNext() ? s.next() : "[]";

                // Map the JSON directly to your List<User>
                List<User> users = gson.fromJson(jsonResponse, new TypeToken<List<User>>(){}.getType());

                if (users != null && !users.isEmpty()) {
                    System.out.println("✅ Found " + users.size() + " subscribers from cloud.");
                    syncToPublic(users, PUBLIC_USERS_PATH);
                    return users;
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Cloud Load Error: " + e.getMessage() + ". Falling back to local file.");
        }
        List<User> fallback = loadLocalSubscribers();
        syncToPublic(fallback, PUBLIC_USERS_PATH);
        return fallback;
    }

    // 2. Local Subscribers Backup
    public static List<User> loadLocalSubscribers() {
        try {
            if (!Files.exists(USERS_PATH)) return new ArrayList<>();
            try (Reader reader = Files.newBufferedReader(USERS_PATH)) {
                List<User> users = gson.fromJson(reader, new TypeToken<List<User>>(){}.getType());
                return users != null ? users : new ArrayList<>();
            }
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    // 3. Load Job Database supporting both Map<String, JobEntry> and List<JobEntry>
    public static Map<String, JobEntry> loadJobDatabase() {
        Map<String, JobEntry> result = new LinkedHashMap<>();
        Path targetPath = Files.exists(JOBS_PATH) ? JOBS_PATH : PUBLIC_JOBS_PATH;

        if (!Files.exists(targetPath)) {
            return result;
        }

        try {
            String contents = Files.readString(targetPath);
            if (contents.trim().isEmpty()) {
                return result;
            }
            JsonElement element = JsonParser.parseString(contents);
            if (element.isJsonObject()) {
                Map<String, JobEntry> map = gson.fromJson(element, new TypeToken<Map<String, JobEntry>>() {}.getType());
                if (map != null) result.putAll(map);
            } else if (element.isJsonArray()) {
                List<JobEntry> list = gson.fromJson(element, new TypeToken<List<JobEntry>>() {}.getType());
                if (list != null) {
                    for (JobEntry item : list) {
                        String key = (item.title != null) ? item.title : (item.id != null ? item.id : UUID.randomUUID().toString());
                        result.put(key, item);
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("Database Load Error at " + targetPath.toAbsolutePath().normalize()
                    + " (" + e.getClass().getSimpleName() + ").");
        }
        return result;
    }

    // 4. Save Job Database and mirror to public/data/jobs.json
    public static void saveJobDatabase(Map<String, JobEntry> database) {
        try {
            if (JOBS_PATH.getParent() != null && !Files.exists(JOBS_PATH.getParent())) {
                Files.createDirectories(JOBS_PATH.getParent());
            }
            try (Writer writer = Files.newBufferedWriter(JOBS_PATH)) {
                gson.toJson(database, writer);
            }

            // Mirror as a clean JSON array to public/data/jobs.json for React frontend consumption
            if (!Files.exists(PUBLIC_DATA_DIR)) {
                Files.createDirectories(PUBLIC_DATA_DIR);
            }
            List<JobEntry> jobList = new ArrayList<>(database.values());
            try (Writer writer = Files.newBufferedWriter(PUBLIC_JOBS_PATH)) {
                gson.toJson(jobList, writer);
            }
        } catch (IOException e) {
            System.err.println("Database Save Error: " + e.getMessage());
        }
    }

    // 5. Preserved 60-Hour Expired Job Cleanup Logic
    public static void runCleanup(Map<String, JobEntry> database) {
        LocalDateTime now = LocalDateTime.now();
        database.entrySet().removeIf(entry -> {
            JobEntry job = entry.getValue();
            if ("EXPIRED".equals(job.status) && job.expiredAt != null) {
                try {
                    return Duration.between(LocalDateTime.parse(job.expiredAt), now).toHours() >= 60;
                } catch (Exception ex) {
                    return false;
                }
            }
            return false;
        });
    }

    public static Path getNotificationsPath() {
        return PUBLIC_NOTIFICATIONS_PATH.toAbsolutePath().normalize();
    }

    public static synchronized void initializeNotificationsFile() {
        try {
            Files.createDirectories(PUBLIC_DATA_DIR);
            if (!Files.exists(PUBLIC_NOTIFICATIONS_PATH) || Files.size(PUBLIC_NOTIFICATIONS_PATH) == 0
                    || Files.readString(PUBLIC_NOTIFICATIONS_PATH).trim().isEmpty()) {
                Files.writeString(PUBLIC_NOTIFICATIONS_PATH, "[]");
                System.out.println("Initialized notifications file as an empty JSON array: " + getNotificationsPath());
            }
        } catch (IOException e) {
            System.err.println("Failed to initialize notifications file at " + getNotificationsPath()
                    + " (" + e.getClass().getSimpleName() + ").");
            throw new IllegalStateException("Could not initialize notifications file.", e);
        }
    }

    // Helper to mirror arbitrary data to public directory
    public static <T> void syncToPublic(T data, Path publicPath) {
        try {
            if (!Files.exists(PUBLIC_DATA_DIR)) {
                Files.createDirectories(PUBLIC_DATA_DIR);
            }
            try (Writer writer = Files.newBufferedWriter(publicPath)) {
                gson.toJson(data, writer);
            }
        } catch (IOException e) {
            System.err.println("Public Sync Error: " + e.getMessage());
        }
    }

    // Helper to log notifications to public/data/notifications.json
    public static synchronized void recordNotification(Map<String, Object> record) {
        initializeNotificationsFile();
        try {
            String contents = Files.readString(PUBLIC_NOTIFICATIONS_PATH);
            JsonElement root;
            try {
                root = JsonParser.parseString(contents);
            } catch (com.google.gson.JsonParseException e) {
                System.err.println("Could not read notifications file at " + getNotificationsPath()
                        + " (" + e.getClass().getSimpleName() + ").");
                throw new IllegalStateException("Notifications file contains invalid JSON.", e);
            }
            if (!root.isJsonArray()) {
                System.err.println("Could not read notifications file at " + getNotificationsPath()
                        + ": expected a JSON array.");
                throw new IllegalStateException("Notifications file must contain a JSON array.");
            }

            List<Map<String, Object>> existing = gson.fromJson(root, new TypeToken<List<Map<String, Object>>>() {}.getType());
            if (existing == null) existing = new ArrayList<>();
            existing.add(0, record); // prepend newest
            try (Writer writer = Files.newBufferedWriter(PUBLIC_NOTIFICATIONS_PATH)) {
                gson.toJson(existing, writer);
            }
        } catch (IOException e) {
            System.err.println("Failed to read or write notifications file at " + getNotificationsPath()
                    + " (" + e.getClass().getSimpleName() + ").");
            throw new IllegalStateException("Could not update notifications file.", e);
        }
    }

}