import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Contact/support messages go through SES rather than the Resend-backed
// emailService (utils/email.ts), which has no configured API key and just
// no-ops. Sender and recipient are the same verified SES identity
// (donortrackapp@gmail.com) so this works even while the SES account is
// still in sandbox mode, which only allows sending between verified
// identities — no domain verification or production-access request needed.
const CONTACT_EMAIL = "donortrackapp@gmail.com";

const ses = new SESClient({});

export async function sendContactEmail(options: {
  subject: string;
  text: string;
  replyTo: string;
}): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      Source: CONTACT_EMAIL,
      Destination: { ToAddresses: [CONTACT_EMAIL] },
      ReplyToAddresses: [options.replyTo],
      Message: {
        Subject: { Data: options.subject },
        Body: { Text: { Data: options.text } },
      },
    }),
  );
}
