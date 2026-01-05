import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

/**
 * Load email template and replace variables
 */
export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): string {
  const templatePath = path.join(process.cwd(), 'email-templates', `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}.html`);
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Handle conditional blocks {{ if .VariableName }}...{{ end }}
  // Remove blocks where the variable is empty or undefined
  for (const [key, value] of Object.entries(variables)) {
    const conditionalRegex = new RegExp(
      `\\{\\{\\s*if\\s+\\.${key}\\s*\\}\\}([\\s\\S]*?)\\{\\{\\s*end\\s*\\}\\}`,
      'g'
    );
    
    if (value && value.trim() !== '') {
      // Variable exists and is not empty - keep the content, remove the conditional tags
      template = template.replace(conditionalRegex, '$1');
    } else {
      // Variable is empty or undefined - remove the entire block
      template = template.replace(conditionalRegex, '');
    }
  }

  // Replace variables in format {{ .VariableName }}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, 'g');
    template = template.replace(regex, value);
  }

  return template;
}

/**
 * Send email using Resend email service
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  // Get Resend API key from environment variables
  const apiKey = process.env.SMTP_EMAIL_PASSWORD;

  if (!apiKey) {
    console.error('Missing Resend API key. Please set SMTP_EMAIL_PASSWORD in your environment variables.');
    throw new Error('Email service not configured: Missing API key');
  }

  // Get sender email from environment
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'Budget App <onboarding@resend.dev>';

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email sent successfully:', data);
    }
  } catch (error: any) {
    console.error('Error sending email via Resend:', error);
    throw error;
  }
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  to: string,
  invitationToken: string,
  accountName: string,
  inviterName: string,
  inviterEmail: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const invitationURL = `${baseUrl}/invite/${invitationToken}`;

  const roleDescription = role === 'editor' 
    ? '<strong>Editor</strong> - You can view and edit the budget'
    : '<strong>Viewer</strong> - You can view the budget';

  const html = renderEmailTemplate('invitation', {
    Email: to,
    InvitationURL: invitationURL,
    AccountName: accountName,
    InviterName: inviterName || inviterEmail.split('@')[0],
    RoleDescription: roleDescription,
  });

  await sendEmail(
    to,
    `You've been invited to collaborate on "${accountName}" - Budget App`,
    html
  );
}


