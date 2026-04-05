package utils;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import io.github.cdimascio.dotenv.Dotenv;

public class WhatsAppNotifier {
    private static final Dotenv dotenv = Dotenv.load();

    public static final String ACCOUNT_SID = dotenv.get("TWILIO_ACCOUNT_SID");
    public static final String AUTH_TOKEN = dotenv.get("TWILIO_AUTH_TOKEN");

    public static void sendWhatsAppAlert(String messageContent) {
        Twilio.init(ACCOUNT_SID, AUTH_TOKEN);

        Message message = Message.creator(
                new PhoneNumber("whatsapp:" + dotenv.get("MY_PHONE_NUMBER")),
                new PhoneNumber("whatsapp:+14155238886"),
                messageContent // This now contains the full Batch + Guide
        ).create();

        System.out.println("Batch Alert Sent! SID: " + message.getSid());
    }
}