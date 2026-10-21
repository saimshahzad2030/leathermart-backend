import { logger } from '../utils/logger.js';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const EmailService = {
  /**
   * Send notification to business concierge when a customer submits a contact inquiry.
   * Uses customer's email as reply-to address.
   */
  async sendContactNotification(contact) {
    const businessEmail =
      process.env.CONTACT_NOTIFICATION_EMAIL ||
      process.env.BUSINESS_CONTACT_EMAIL ||
      'concierge@ateliervalenti.com';

    const fromAddress =
      process.env.SMTP_FROM ||
      'Atelier Valenti Milano <noreply@ateliervalenti.com>';

    const safeName = escapeHtml(contact.name);
    const safeEmail = escapeHtml(contact.email);
    const safePhone = escapeHtml(contact.phone || 'Not provided');
    const safeSubject = escapeHtml(contact.subject);
    const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br/>');
    const timestamp = new Date(contact.createdAt || Date.now()).toUTCString();

    const subjectLine = `[Atelier Inquiry] ${contact.subject} — ${contact.name}`;

    const textContent = `
NEW CLIENT CONTACT INQUIRY
==========================
Date: ${timestamp}
Reference ID: ${contact.id}

Client Name: ${contact.name}
Email Address: ${contact.email}
Phone Number: ${contact.phone || 'Not provided'}
Subject: ${contact.subject}

Message:
--------------------------
${contact.message}
--------------------------

Reply directly to this email to respond to the client at ${contact.email}.
Atelier Valenti Milano Concierge System
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D0C; color: #E7DFD5; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #171513; border: 1px solid #2B2621; border-radius: 8px; overflow: hidden; }
    .header { background-color: #11100F; border-bottom: 1px solid #2B2621; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.2em; text-transform: uppercase; color: #C5A47E; font-weight: 500; }
    .header p { margin: 4px 0 0; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #8A7E72; }
    .content { padding: 24px; font-size: 13px; line-height: 1.6; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #221E1A; font-size: 12px; }
    .meta-table td.label { color: #8A7E72; width: 120px; font-family: monospace; text-transform: uppercase; }
    .meta-table td.value { color: #F7F4EE; font-weight: 500; }
    .message-box { background-color: #0E0D0C; border: 1px solid #221E1A; border-left: 3px solid #C5A47E; padding: 16px; margin: 16px 0; font-size: 13px; color: #E7DFD5; white-space: pre-wrap; word-break: break-word; }
    .footer { padding: 16px 24px; background-color: #11100F; border-top: 1px solid #221E1A; font-size: 11px; color: #6E645A; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Atelier Valenti Milano</h1>
      <p>Client Concierge Notification</p>
    </div>
    <div class="content">
      <table class="meta-table">
        <tr>
          <td class="label">Client:</td>
          <td class="value">${safeName}</td>
        </tr>
        <tr>
          <td class="label">Email:</td>
          <td class="value"><a href="mailto:${safeEmail}" style="color: #C5A47E;">${safeEmail}</a></td>
        </tr>
        <tr>
          <td class="label">Phone:</td>
          <td class="value">${safePhone}</td>
        </tr>
        <tr>
          <td class="label">Subject:</td>
          <td class="value">${safeSubject}</td>
        </tr>
        <tr>
          <td class="label">Received:</td>
          <td class="value" style="font-family: monospace;">${timestamp}</td>
        </tr>
        <tr>
          <td class="label">Reference:</td>
          <td class="value" style="font-family: monospace; font-size: 11px;">${contact.id}</td>
        </tr>
      </table>

      <div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8A7E72; margin-top: 16px;">
        Inquiry Message:
      </div>
      <div class="message-box">
        ${safeMessage}
      </div>
    </div>
    <div class="footer">
      Hit "Reply" in your email client to respond directly to ${safeEmail}.
    </div>
  </div>
</body>
</html>
    `.trim();

    // Check if SMTP is configured
    const isSmtpConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (isSmtpConfigured) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: fromAddress,
          to: businessEmail,
          replyTo: contact.email,
          subject: subjectLine,
          text: textContent,
          html: htmlContent,
        });

        logger.info(`[EMAIL SERVICE] Contact notification sent successfully to ${businessEmail} for inquiry ${contact.id}`);
        return { sent: true };
      } catch (err) {
        logger.error(`[EMAIL SERVICE] Failed to deliver contact notification email: ${err.message}`);
        return { sent: false, error: err.message };
      }
    } else {
      // Graceful development simulation log
      logger.info(
        `[EMAIL SERVICE] (Simulated) Contact notification dispatched:\n` +
        `  To: ${businessEmail}\n` +
        `  Reply-To: ${contact.email}\n` +
        `  Subject: ${subjectLine}\n` +
        `  Client: ${contact.name} <${contact.email}>\n` +
        `  Message length: ${contact.message?.length || 0} chars`
      );
      return { sent: true, simulated: true };
    }
  },
};
