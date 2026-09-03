/**
 * Whether to offer sign-in by emailed link.
 *
 * Off for launch. Sending a link needs an SMTP provider, and every provider
 * needs a verified domain to send from — there isn't one for Lazy Skill yet.
 * Supabase's built-in sender is not a substitute: it is a shared demo service
 * limited to a handful of messages an hour that routinely land in spam, so
 * leaving the option visible would mean showing people a door that does not
 * open.
 *
 * To turn it back on: verify a domain with the mail provider, fill in
 * Supabase's SMTP settings, then flip this to true. The form itself is still
 * here and still works.
 */
export const EMAIL_SIGN_IN_ENABLED = false;
