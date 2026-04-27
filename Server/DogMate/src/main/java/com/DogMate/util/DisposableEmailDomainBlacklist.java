package com.DogMate.util;

import java.util.Locale;
import java.util.Set;

/**
 * Blocks registration with known disposable / temporary email providers.
 * Domain match is case-insensitive; subdomains (e.g. {@code x.mailinator.com}) are blocked too.
 */
public final class DisposableEmailDomainBlacklist {

    /** User-facing message for HTTP 400 from {@link com.DogMate.Service.PendingRegistrationService}. */
    public static final String DISALLOWED_MESSAGE = "שימוש במייל זמני אינו מותר";

    private static final Set<String> DOMAINS = Set.of(
        "mailinator.com",
        "10minutemail.com",
        "10minutemail.net",
        "guerrillamail.com",
        "guerrillamail.org",
        "guerrillamail.net",
        "tempmail.com",
        "tempmail.net",
        "throwaway.email",
        "yopmail.com",
        "maildrop.cc",
        "getnada.com",
        "trashmail.com",
        "fakeinbox.com",
        "sharklasers.com",
        "mailnesia.com",
        "mintemail.com",
        "mytrashmail.com",
        "dispostable.com",
        "mailcatch.com",
        "mailnull.com",
        "mailmoat.com",
        "mailforspam.com",
        "temp-mail.org",
        "tempmailo.com",
        "emailondeck.com",
        "burnermail.io"
    );

    private DisposableEmailDomainBlacklist() {
    }

    /**
     * @param normalizedEmail lowercased trimmed email (e.g. from signup normalization)
     * @throws IllegalArgumentException with {@link #DISALLOWED_MESSAGE} if the domain is blocked
     */
    public static void assertEmailDomainAllowed(String normalizedEmail) {
        if (normalizedEmail == null || normalizedEmail.isEmpty()) {
            return;
        }
        int at = normalizedEmail.lastIndexOf('@');
        if (at < 0 || at >= normalizedEmail.length() - 1) {
            return;
        }
        String domain = normalizedEmail.substring(at + 1).toLowerCase(Locale.ROOT);
        for (String blocked : DOMAINS) {
            if (domain.equals(blocked) || domain.endsWith("." + blocked)) {
                throw new IllegalArgumentException(DISALLOWED_MESSAGE);
            }
        }
    }
}
