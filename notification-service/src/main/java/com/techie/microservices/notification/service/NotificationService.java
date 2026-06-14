package com.techie.microservices.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender javaMailSender;

    public void sendOrderPlacedEmail(Map<String, String> event) {
        String email = event.get("email");
        String firstName = event.get("firstName");
        String lastName = event.get("lastName");
        String orderNumber = event.get("orderNumber");
        if (isBlank(email)) {
            log.warn("Skipping ORDER_PLACED notification for order {} because email is missing", orderNumber);
            return;
        }

        MimeMessagePreparator messagePreparator = mimeMessage -> {
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage);
            messageHelper.setFrom("springshop@email.com");
            messageHelper.setTo(email);
            messageHelper.setSubject(String.format("Your Order with OrderNumber %s is placed successfully", orderNumber));
            messageHelper.setText(String.format("""
                            Hi %s,%s

                            Your order with order number %s is now placed successfully.

                            Best Regards
                            Spring Shop
                            """,
                    firstName,
                    lastName,
                    orderNumber));
        };

        sendEmail(messagePreparator, "Order notification email sent");
    }

    public void sendOrderPaidEmail(Map<String, String> event) {
        String email = event.get("email");
        String firstName = event.get("firstName");
        String lastName = event.get("lastName");
        String orderNumber = event.get("orderNumber");
        if (isBlank(email)) {
            log.warn("Skipping ORDER_PAID notification for order {} because email is missing", orderNumber);
            return;
        }

        MimeMessagePreparator messagePreparator = mimeMessage -> {
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage);
            messageHelper.setFrom("springshop@email.com");
            messageHelper.setTo(email);
            messageHelper.setSubject(String.format("Your Order with OrderNumber %s is paid successfully", orderNumber));
            messageHelper.setText(String.format("""
                            Hi %s,%s

                            Your payment for order number %s was successful.

                            Best Regards
                            Spring Shop
                            """,
                    firstName,
                    lastName,
                    orderNumber));
        };

        sendEmail(messagePreparator, "Order paid notification email sent");
    }

    private void sendEmail(MimeMessagePreparator messagePreparator, String successMessage) {
        try {
            javaMailSender.send(messagePreparator);
            log.info(successMessage);
        } catch (MailException e) {
            log.error("Exception occurred when sending mail", e);
            throw new RuntimeException("Exception occurred when sending notification email", e);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
