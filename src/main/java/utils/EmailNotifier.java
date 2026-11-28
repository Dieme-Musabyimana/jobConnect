package utils;

import io.github.cdimascio.dotenv.Dotenv;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import models.User;

import java.util.Collection;
import java.util.List;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class EmailNotifier {
    private static final Dotenv DOTENV = loadDotenv();
    private static final int MAX_EMAIL_LENGTH = 50000;
    private static final java.util.Set<String> dispatchedRecipients = new java.util.HashSet<>();

    public static synchronized void beginScraperRun() {
        dispatchedRecipients.clear();
    }

    private static Dotenv loadDotenv() {
        try {
            return Dotenv.configure().ignoreIfMissing().load();
        } catch (RuntimeException e) {
            return null;
        }
    }

    public int notifyUserWithDigest(User user, Collection<WhatsAppNotifier.OpportunityMatch> candidates) {
        if (user == null || !user.notifyEmail) return 0;
        List<WhatsAppNotifier.OpportunityMatch> matches = NotificationDigest.eligibleMatches(user, candidates);
        if (matches.isEmpty()) return 0;
        String recipientId = NotificationDigest.recipientIdentifier(user);
        synchronized (EmailNotifier.class) {
            if (!dispatchedRecipients.add(recipientId)) return 0;
        }

        String body = NotificationDigest.format(user, matches, MAX_EMAIL_LENGTH);
        String host = config("SMTP_HOST", "smtp.gmail.com");
        String portValue = config("SMTP_PORT", "587");
        String smtpUser = config("SMTP_USER");
        String smtpPassword = config("SMTP_PASS");
        String from = config("EMAIL_FROM", smtpUser);
        String summary = digestSummary(matches.size());
        boolean liveEnabled = "true".equalsIgnoreCase(config("SEND_LIVE_EMAIL", "false"));
        boolean credentialsConfigured = configuredCredential(smtpUser) && configuredCredential(smtpPassword);

        if (!liveEnabled || !credentialsConfigured || blank(host) || blank(portValue)
                || !configuredCredential(from)) {
            NotificationDigest.record(user, "EMAIL", "SIMULATED_EMAIL_SENT", matches,
                    summary, null, null);
            System.out.println("[EMAIL] Simulated digest recorded for " + matches.size() + " opportunities.");
            return matches.size();
        }

        if (blank(user.email)) {
            NotificationDigest.record(user, "EMAIL", "DELIVERY_FAILED", matches,
                    summary, "MISSING_RECIPIENT", null);
            System.err.println("[EMAIL] Digest delivery failed: recipient is not configured.");
            return matches.size();
        }

        final int port;
        try {
            port = Integer.parseInt(portValue);
        } catch (NumberFormatException e) {
            NotificationDigest.record(user, "EMAIL", "DELIVERY_FAILED", matches,
                    summary, "INVALID_SMTP_PORT", null);
            System.err.println("[EMAIL] Digest delivery failed: SMTP port configuration is invalid.");
            return matches.size();
        }

        Properties properties = new Properties();
        properties.put("mail.smtp.host", host);
        properties.put("mail.smtp.port", Integer.toString(port));
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        properties.put("mail.smtp.ssl.enable", Boolean.toString(port == 465));
        properties.put("mail.smtp.starttls.enable", Boolean.toString(port != 465));
        properties.put("mail.smtp.starttls.required", Boolean.toString(port != 465));

        try {
            Session session = Session.getInstance(properties, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUser, smtpPassword);
                }
            });
            MimeMessage email = new MimeMessage(session);
            email.setFrom(new InternetAddress(from));
            email.setRecipients(Message.RecipientType.TO, InternetAddress.parse(user.email, false));
            email.setSubject("Your matched opportunities digest", "UTF-8");
            email.setText(body, "UTF-8");
            Transport.send(email);
            NotificationDigest.record(user, "EMAIL", "SENT", matches, summary, null, "SMTP_ACCEPTED");
            System.out.println("[EMAIL] Digest submitted successfully for " + matches.size() + " opportunities.");
        } catch (MessagingException | RuntimeException e) {
            String errorCode = smtpErrorCode(e);
            NotificationDigest.record(user, "EMAIL", "DELIVERY_FAILED", matches,
                    summary, errorCode, e.getClass().getSimpleName());
            System.err.println("[EMAIL] Digest delivery failed with " + errorCode + ".");
        }
        return matches.size();
    }

    private static String config(String key) {
        return config(key, null);
    }

    private static String config(String key, String defaultValue) {
        String value = System.getenv(key);
        if (blank(value) && DOTENV != null) value = DOTENV.get(key);
        if (blank(value)) value = System.getProperty(key);
        return blank(value) ? defaultValue : value.trim();
    }

    private static boolean configuredCredential(String value) {
        if (blank(value)) return false;
        String normalized = value.trim().toLowerCase(java.util.Locale.ROOT);
        return !(normalized.contains("placeholder")
                || normalized.contains("example")
                || normalized.contains("dummy")
                || normalized.contains("sample")
                || normalized.startsWith("your")
                || normalized.startsWith("replace")
                || normalized.startsWith("insert")
                || normalized.startsWith("enter")
                || normalized.equals("changeme")
                || normalized.equals("change_me")
                || normalized.equals("change-me")
                || normalized.equals("replace_me")
                || normalized.equals("insert_value")
                || normalized.equals("enter_value")
                || normalized.equals("password")
                || normalized.equals("username")
                || normalized.equals("test")
                || normalized.startsWith("<")
                || normalized.endsWith(">")
                || normalized.matches("[x*]{4,}"));
    }

    private static String smtpErrorCode(Exception exception) {
        Throwable cause = exception;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null) {
                Matcher matcher = Pattern.compile("(?<!\\d)([245]\\d\\d)(?!\\d)").matcher(message);
                if (matcher.find()) return "SMTP_" + matcher.group(1);
            }
            cause = cause.getCause();
        }
        return "EMAIL_SEND_ERROR";
    }

    private static String digestSummary(int count) {
        return "Opportunity digest with " + count + " new matches.";
    }

    private static boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
