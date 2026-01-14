import { Resend } from 'resend';
import { getStageByScore } from './stages';

// Initialize Resend only if API key is available (lazy initialization)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface ResultsEmailData {
  email: string;
  score: number;
  stage: {
    name: string;
    emoji: string;
    description: string;
  };
  bookingLink?: string;
}

export async function sendResultsEmail(data: ResultsEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL] RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    if (!data.bookingLink) {
      data.bookingLink = process.env.BOOKING_LINK || 'https://calendly.com/your-link';
    }

    const stage = getStageByScore(data.score);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Founder Leverage Assessment Results</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #536878 0%, #2c3e50 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #EDDF00; margin: 0; font-size: 32px; letter-spacing: 0.05em;">
              YOUR RESULTS ARE IN
            </h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 64px; margin-bottom: 10px;">${stage.emoji}</div>
              <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 28px;">
                ${stage.name}
              </h2>
              <div style="font-size: 48px; font-weight: bold; color: #EDDF00; margin: 20px 0;">
                ${data.score}/100
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; color: #555; font-size: 16px; line-height: 1.8;">
                ${stage.description}
              </p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${data.bookingLink}" 
                 style="display: inline-block; background-color: #EDDF00; color: #000000; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; letter-spacing: 0.05em;">
                BOOK YOUR STRATEGY SESSION
              </a>
            </div>
            
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 40px; text-align: center; color: #888; font-size: 14px;">
              <p style="margin: 0;">
                Want to see your full breakdown? <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/results" style="color: #EDDF00; text-decoration: none;">View detailed results</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
YOUR RESULTS ARE IN

${stage.emoji} ${stage.name}
Score: ${data.score}/100

${stage.description}

Book your strategy session: ${data.bookingLink}

View detailed results: ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/results
    `;

    const resendClient = getResendClient();
    if (!resendClient) {
      return { success: false, error: 'Email service not configured' };
    }

    const result = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Founder Leverage <results@results.katzventures.co>',
      to: data.email,
      subject: `Your Founder Leverage Score: ${data.score}/100 - ${stage.name}`,
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('[EMAIL] Error sending email:', result.error);
      return { success: false, error: result.error.message || 'Failed to send email' };
    }

    console.log('[EMAIL] Results email sent successfully to:', data.email);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Exception sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
