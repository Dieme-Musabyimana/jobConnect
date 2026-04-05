package utils;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import io.github.cdimascio.dotenv.Dotenv;

public class WhatsAppNotifier {
    private static final Dotenv dotenv = Dotenv.load();
    public static final String ACCOUNT_SID = dotenv.get("TWILIO_ACCOUNT_SID");
    public static final String AUTH_TOKEN = dotenv.get("TWILIO_AUTH_TOKEN");
    public static final String FROM_NUMBER = dotenv.get("TWILIO_WHATSAPP_NUMBER");

    public void sendWhatsApp(String targetNumber, String messageContent) {
        try {
            Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
            Message.creator(
                    new com.twilio.type.PhoneNumber("whatsapp:" + targetNumber),
                    new com.twilio.type.PhoneNumber("whatsapp:" + FROM_NUMBER),
                    messageContent
            ).create();
            System.out.println("✅ Sent to: " + targetNumber);
        } catch (Exception e) {
            System.err.println("❌ Error sending to " + targetNumber + ": " + e.getMessage());
        }
    }
}