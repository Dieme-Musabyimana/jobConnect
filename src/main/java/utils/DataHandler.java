//package utils;
//
//import java.io.IOException;
//import java.nio.file.*;
//import java.util.*;
//
//public class DataHandler {
//    // Points to the file in your resources folder
//    private static final Path DB_PATH = Paths.get("src/test/resources/jobs.json");
//
//    public static Set<String> loadSavedJobs() {
//        try {
//            if (!Files.exists(DB_PATH)) {
//                Files.createDirectories(DB_PATH.getParent());
//                Files.createFile(DB_PATH);
//                return new HashSet<>();
//            }
//            List<String> lines = Files.readAllLines(DB_PATH);
//            return new HashSet<>(lines);
//        } catch (IOException e) {
//            return new HashSet<>();
//        }
//    }
//
//    public static void saveJobs(Set<String> jobs) {
//        try {
//            // Converts the Set to a list of lines to save
//            Files.write(DB_PATH, jobs);
//        } catch (IOException e) {
//            System.err.println("Database Error: " + e.getMessage());
//        }
//    }
//}
package utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import models.JobEntry;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

public class DataHandler {
    private static final Path DB_PATH = Paths.get("src/test/resources/jobs.json");
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    // 1. Load the "Database" as a Map (Title -> Job Object)
    public static Map<String, JobEntry> loadJobDatabase() {
        try {
            if (!Files.exists(DB_PATH)) {
                Files.createDirectories(DB_PATH.getParent());
                return new HashMap<>();
            }
            Reader reader = Files.newBufferedReader(DB_PATH);
            Map<String, JobEntry> data = gson.fromJson(reader, new TypeToken<Map<String, JobEntry>>() {}.getType());
            reader.close();
            return data != null ? data : new HashMap<>();
        } catch (IOException e) {
            return new HashMap<>();
        }
    }

    // 2. Save the Map back to the JSON file
    public static void saveJobDatabase(Map<String, JobEntry> database) {
        try (Writer writer = Files.newBufferedWriter(DB_PATH)) {
            gson.toJson(database, writer);
        } catch (IOException e) {
            System.err.println("Failed to save database: " + e.getMessage());
        }
    }

    // 3. The 60-Hour Cleanup Rule
    public static void runCleanup(Map<String, JobEntry> database) {
        LocalDateTime now = LocalDateTime.now();

        // Remove jobs that have been EXPIRED for more than 60 hours
        database.entrySet().removeIf(entry -> {
            JobEntry job = entry.getValue();
            if (job.status.equals("EXPIRED") && job.expiredAt != null) {
                LocalDateTime expiryTime = LocalDateTime.parse(job.expiredAt);
                return Duration.between(expiryTime, now).toHours() >= 60;
            }
            return false;
        });
    }
}