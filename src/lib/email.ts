const EMAILJS_URL =
  'https://api.emailjs.com/api/v1.0/email/send';

type EmailResult = {
  sent: boolean;
  configured: boolean;
};

async function sendEmail(
  templateId: string | undefined,
  templateParams: Record<string, string>
): Promise<EmailResult> {
  const serviceId =
    import.meta.env.VITE_EMAILJS_SERVICE_ID;

  const publicKey =
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.error(
      'EmailJS is not fully configured.'
    );

    return {
      sent: false,
      configured: false,
    };
  }

  const response = await fetch(
    EMAILJS_URL,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,

        template_params: {
          from_name: 'VoiceCart AI',
          reply_to:
            import.meta.env
              .VITE_SUPPORT_EMAIL ||
            'support@voicecart.ai',

          ...templateParams,
        },
      }),
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `EmailJS error ${response.status}: ${responseText}`
    );
  }

  return {
    sent: true,
    configured: true,
  };
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<EmailResult> {
  const templateId =
    import.meta.env
      .VITE_EMAILJS_WELCOME_TEMPLATE_ID;

  const customerName =
    name?.trim() || 'Customer';

  return sendEmail(
    templateId,
    {
      to_email: email,
      to_name: customerName,

      email,

      name: customerName,

      subject:
        `Welcome to VoiceCart AI, ${customerName}!`,

      message:
        `Welcome to VoiceCart AI, ${customerName}! We're excited to have you on board. Search, speak, and build your grocery cart naturally in English, Hindi, or Hinglish.`,
    }
  );
}

export async function sendAutoReplyEmail(
  email: string,
  name: string,
  title: string
): Promise<EmailResult> {
  const templateId =
    import.meta.env
      .VITE_EMAILJS_AUTO_REPLY_TEMPLATE_ID;

  const customerName =
    name?.trim() || 'Customer';

  return sendEmail(
    templateId,
    {
      to_email: email,
      to_name: customerName,

      email,

      name: customerName,

      title,

      subject:
        `We received your message — VoiceCart AI`,

      message:
        `Hi ${customerName}, we received your message regarding "${title}". Our team will get back to you as soon as possible.`,
    }
  );
}