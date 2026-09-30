import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export type EmailDeliveryResult = {
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  messageId?: string;
  error?: string;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly brevoApiKey = process.env.BREVO_API_KEY;
  // Required in production. Must be a Brevo-verified sender on a domain with SPF/DKIM.
  private readonly senderEmail = process.env.MAIL_FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || '';
  private readonly senderName = process.env.MAIL_FROM_NAME || process.env.BREVO_SENDER_NAME || 'CuriousBees';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // Optional operational inbox for supervisor-registration alerts. Not used for authorization.
  private readonly mainAdminEmail = process.env.MAIN_ADMIN_EMAIL || '';

  onModuleInit() {
    if (!this.brevoApiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('❌ [MailService] CRITICAL: BREVO_API_KEY is not configured in production environment.');
      } else {
        this.logger.warn('⚠️ [MailService] BREVO_API_KEY is not configured. Outbound transactional emails will not be dispatched.');
      }
    } else {
      this.logger.log(`✅ [MailService] Brevo Transactional Email Service initialized with sender: ${this.senderName} <${this.senderEmail}>`);
    }
  }

  /**
   * Reusable private Brevo REST API dispatcher
   * Endpoint: POST https://api.brevo.com/v3/smtp/email
   */
  async sendBrevoEmail(params: {
    to: { email: string; name?: string }[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailDeliveryResult> {
    if (!this.brevoApiKey || !this.brevoApiKey.trim()) {
      this.logger.warn(
        `[MailService] BREVO_API_KEY is not configured. Email was not sent to: ${params.to.map((t) => t.email).join(', ')} | Subject: "${params.subject}"`,
      );
      return { status: 'NOT_CONFIGURED', error: 'BREVO_API_KEY is not configured.' };
    }

    if (!this.senderEmail || !this.senderEmail.trim()) {
      this.logger.warn(`[MailService] MAIL_FROM_EMAIL is not configured. Email was not sent.`);
      return { status: 'NOT_CONFIGURED', error: 'MAIL_FROM_EMAIL is not configured.' };
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.brevoApiKey.trim(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail.trim(),
          },
          to: params.to.map((r) => ({
            email: r.email.trim(),
            ...(r.name ? { name: r.name } : {}),
          })),
          subject: params.subject,
          htmlContent: params.html,
          ...(params.text ? { textContent: params.text } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const messageId = data?.messageId || 'brevo-dispatched';
        this.logger.log(
          `[MailService] Email successfully sent via Brevo to ${params.to.map((t) => t.email).join(', ')} | Subject: "${params.subject}" | MessageId: ${messageId}`,
        );
        return { status: 'SENT', messageId };
      } else {
        const errBody = await res.text();
        this.logger.warn(
          `[MailService] Brevo API Error (HTTP ${res.status}) for recipient ${params.to.map((t) => t.email).join(', ')} | Subject: "${params.subject}" | Response: ${errBody}`,
        );
        return { status: 'FAILED', error: `Brevo HTTP ${res.status}: ${errBody}` };
      }
    } catch (err: any) {
      this.logger.error(
        `[MailService] Network exception sending email via Brevo to ${params.to.map((t) => t.email).join(', ')}: ${err.message}`,
      );
      return { status: 'FAILED', error: err.message };
    }
  }

  /**
   * Alert a Research Supervisor about a new scholar supervision request
   */
  async sendScholarSupervisionRequestAlert(data: {
    supervisorEmail: string;
    supervisorName: string;
    scholarName: string;
    scholarEmail: string;
    department: string;
    campus?: string;
    researchArea?: string;
    message?: string | null;
    requestId: string;
    createdAt?: Date;
  }): Promise<EmailDeliveryResult> {
    const reviewUrl = `${this.frontendUrl}/supervisor/requests/${data.requestId}`;
    const supervisorPanelUrl = `${this.frontendUrl}/supervisor`;
    const formattedDate = (data.createdAt ? new Date(data.createdAt) : new Date()).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Supervision Request</title>
</head>
<body style="margin:0;padding:0;background:#03152d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#03152d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);max-width:600px;width:100%;">
          <!-- Institutional Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0C4DA2 0%, #042654 100%);padding:36px 40px;text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">🐝 CuriousBees</span>
                    <span style="display:inline-block;background:#FFC828;color:#042654;font-size:10px;font-weight:900;text-transform:uppercase;padding:2px 8px;border-radius:20px;margin-left:8px;vertical-align:middle;letter-spacing:0.5px;">SRMIST</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px;">
                    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;font-weight:500;">Research & Academic Governance Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <div style="display:inline-block;padding:4px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:30px;font-size:11px;font-weight:800;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">
                Action Required • Supervision Request
              </div>
              
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;line-height:1.3;">
                New Research Supervision Request
              </h1>
              
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Dear <strong>Dr. ${data.supervisorName}</strong>,<br/><br/>
                A Research Scholar at SRMIST has designated you as their prospective research supervisor on the CuriousBees Research Platform.
              </p>

              <!-- Scholar Academic Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:24px;overflow:hidden;">
                <tr>
                  <td style="background:#F1F5F9;padding:12px 20px;border-bottom:1px solid #E2E8F0;">
                    <span style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Applicant Profile Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="35%" style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Scholar Name:</td>
                        <td width="65%" style="padding-bottom:10px;font-size:13px;font-weight:800;color:#0F172A;">${data.scholarName}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Scholar Email:</td>
                        <td style="padding-bottom:10px;font-size:13px;font-weight:600;color:#0C4DA2;">${data.scholarEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Department:</td>
                        <td style="padding-bottom:10px;font-size:13px;font-weight:600;color:#334155;">${data.department}</td>
                      </tr>
                      ${data.campus ? `
                      <tr>
                        <td style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Campus / Faculty:</td>
                        <td style="padding-bottom:10px;font-size:13px;font-weight:600;color:#334155;">${data.campus}</td>
                      </tr>` : ''}
                      ${data.researchArea ? `
                      <tr>
                        <td style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Research Area:</td>
                        <td style="padding-bottom:10px;font-size:13px;font-weight:700;color:#0C4DA2;">${data.researchArea}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding-bottom:10px;font-size:12px;font-weight:700;color:#64748B;">Submission Date:</td>
                        <td style="padding-bottom:10px;font-size:13px;font-weight:600;color:#334155;">${formattedDate}</td>
                      </tr>
                      ${data.message ? `
                      <tr>
                        <td colspan="2" style="padding-top:8px;border-top:1px dashed #CBD5E1;">
                          <span style="display:block;font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;margin-bottom:4px;">Message from Scholar:</span>
                          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;font-size:13px;color:#1E293B;font-style:italic;">
                            "${data.message}"
                          </div>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Please review this request at your earliest convenience. Once accepted, the scholar will gain full access to your research group workspaces, publications, and milestone trackers.
              </p>

              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <a href="${reviewUrl}" style="display:inline-block;background:#0C4DA2;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;box-shadow:0 6px 20px rgba(12,77,162,0.3);letter-spacing:0.2px;">
                      Review Supervision Request →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${supervisorPanelUrl}" style="display:inline-block;color:#0C4DA2;font-size:13px;font-weight:700;text-decoration:underline;">
                      Or open your Supervisor Governance Panel
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#F8FAFC;border-radius:10px;padding:12px 16px;border:1px dashed #CBD5E1;margin-top:20px;">
                <p style="margin:0;font-size:11px;color:#64748B;line-height:1.5;word-break:break-all;">
                  <strong>Direct Link:</strong> <a href="${reviewUrl}" style="color:#0C4DA2;">${reviewUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:24px 40px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#334155;">CuriousBees Research & Academic Governance</p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">SRM Institute of Science and Technology • Kattankulathur, Chennai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendBrevoEmail({
      to: [{ email: data.supervisorEmail, name: data.supervisorName }],
      subject: 'New Supervision Request — Review Now | CuriousBees',
      html,
    });
  }

  /**
   * Alert a Research Scholar that their supervision request has been accepted
   */
  async sendScholarSupervisionApprovedAlert(data: {
    scholarEmail: string;
    scholarName: string;
    supervisorName: string;
    department?: string;
    researchArea?: string;
  }): Promise<EmailDeliveryResult> {
    const profileUrl = `${this.frontendUrl}/profile`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Supervisor Request Accepted</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f6fb;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#0C4DA2 0%,#042654 100%);padding:32px 40px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;">🐝 CuriousBees</span>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">SRMIST Research Collaboration Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <div style="display:inline-block;padding:4px 12px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:30px;font-size:11px;font-weight:800;color:#047857;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">
                Request Approved
              </div>
              <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Your Supervision Request Has Been Accepted 🎉</h2>
              <p style="font-size:14px;color:#4b5563;line-height:1.6;">
                Dear <strong>${data.scholarName}</strong>,<br/><br/>
                Good news! <strong>Dr. ${data.supervisorName}</strong> (${data.department || 'Department Faculty'}) has accepted your research supervision request on CuriousBees.
              </p>
              <p style="font-size:14px;color:#4b5563;line-height:1.6;">
                You now have full access to your research workspace, milestones, and direct guidance collaboration.
              </p>
              <div style="text-align:center;margin-top:28px;margin-bottom:16px;">
                <a href="${profileUrl}" style="display:inline-block;background:#0C4DA2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(12,77,162,0.25);">
                  Open CuriousBees →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;">
              CuriousBees • SRMIST Research Collaboration Platform
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendBrevoEmail({
      to: [{ email: data.scholarEmail, name: data.scholarName }],
      subject: 'Your Supervision Request Has Been Accepted | CuriousBees',
      html,
    });
  }

  /**
   * Alert a Research Scholar that their supervision request has been declined
   */
  async sendScholarSupervisionRejectedAlert(data: {
    scholarEmail: string;
    scholarName: string;
    supervisorName: string;
    rejectionReason?: string | null;
  }): Promise<EmailDeliveryResult> {
    const findSupervisorUrl = `${this.frontendUrl}/researchers`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Supervision Request Update</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f6fb;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#0C4DA2 0%,#042654 100%);padding:32px 40px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;">🐝 CuriousBees</span>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">SRMIST Research Collaboration Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <div style="display:inline-block;padding:4px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:30px;font-size:11px;font-weight:800;color:#B91C1C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">
                Status Update
              </div>
              <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Update on Your Supervision Request</h2>
              <p style="font-size:14px;color:#4b5563;line-height:1.6;">
                Dear <strong>${data.scholarName}</strong>,<br/><br/>
                Your supervision request to <strong>Dr. ${data.supervisorName}</strong> was not accepted at this time.
              </p>
              ${
                data.rejectionReason
                  ? `<div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:10px;padding:14px 18px;margin:18px 0;font-size:13px;color:#991b1b;"><strong>Reason provided:</strong> ${data.rejectionReason}</div>`
                  : ''
              }
              <p style="font-size:14px;color:#4b5563;line-height:1.6;">
                You can return to CuriousBees to explore other available research supervisors matching your research domain.
              </p>
              <div style="text-align:center;margin-top:28px;margin-bottom:16px;">
                <a href="${findSupervisorUrl}" style="display:inline-block;background:#0C4DA2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(12,77,162,0.25);">
                  Find Another Supervisor →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;">
              CuriousBees • SRMIST Research Collaboration Platform
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendBrevoEmail({
      to: [{ email: data.scholarEmail, name: data.scholarName }],
      subject: 'Update on Your Supervision Request | CuriousBees',
      html,
    });
  }

  /**
   * Alert Institute Admin of a new Research Supervisor registration
   */
  async sendSupervisorRegistrationAlert(supervisor: {
    name: string;
    email: string;
    department: string;
    employeeId: string;
  }): Promise<EmailDeliveryResult> {
    const adminDashboardUrl = `${this.frontendUrl}/admin/approval-requests`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Supervisor Registration</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0C4DA2 0%,#042654 100%);padding:32px 40px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;">🐝 CuriousBees</span>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">SRMIST Research Portal — Admin Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">New Supervisor Registration Pending Review</h2>
              <p style="font-size:14px;color:#4b5563;line-height:1.6;">
                A new faculty member has registered as a <strong>Research Supervisor</strong> and is awaiting institutional validation:
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:20px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#334155;"><strong>Name:</strong> ${supervisor.name}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#334155;"><strong>Email:</strong> ${supervisor.email}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#334155;"><strong>Department:</strong> ${supervisor.department}</p>
                <p style="margin:0;font-size:13px;color:#334155;"><strong>Employee ID:</strong> ${supervisor.employeeId}</p>
              </div>
              <div style="text-align:center;margin-top:28px;">
                <a href="${adminDashboardUrl}" style="display:inline-block;background:#0C4DA2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  Review in Admin Dashboard →
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (!this.mainAdminEmail) {
      this.logger.warn('MAIN_ADMIN_EMAIL is not configured; skipping supervisor registration alert email.');
      return { status: 'NOT_CONFIGURED', error: 'MAIN_ADMIN_EMAIL is not configured.' };
    }
    return this.sendBrevoEmail({
      to: [{ email: this.mainAdminEmail, name: 'CuriousBees Admin' }],
      subject: `New Supervisor Registration: ${supervisor.name} — CuriousBees`,
      html,
    });
  }
}
