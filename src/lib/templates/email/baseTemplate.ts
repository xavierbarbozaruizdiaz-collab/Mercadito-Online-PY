// ============================================
// EMAIL BASE TEMPLATE
// Template base para todos los emails
// ============================================

export interface EmailTemplateData {
  title: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
  logoUrl?: string;
}

export function getBaseEmailTemplate(data: EmailTemplateData): string {
  const logo = data.logoUrl || 'https://mercadito-online-py.vercel.app/logo.png';
  const buttonHtml = data.buttonText && data.buttonUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
      <tr>
        <td style="border-radius: 6px; background: #3b82f6; text-align: center;">
          <a href="${data.buttonUrl}" style="display: inline-block; padding: 12px 24px; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${data.buttonText}</a>
        </td>
      </tr>
    </table>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${data.title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media only screen and (min-width: 620px) {
      .u-row {
        width: 600px !important;
      }
      .u-row .u-col {
        vertical-align: top;
      }
      .u-row .u-col-100 {
        width: 600px !important;
      }
    }
    @media (max-width: 620px) {
      .u-row-container {
        max-width: 100% !important;
        padding-left: 0px !important;
        padding-right: 0px !important;
      }
      .u-row .u-col {
        min-width: 320px !important;
        max-width: 100% !important;
        display: block !important;
      }
      .u-row .u-col-100 {
        width: 100% !important;
      }
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body class="clean-body" style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; min-width: 320px; max-width: 600px;" width="100%">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
        <img src="${logo}" alt="Mercadito Online PY" style="max-width: 200px; height: auto;">
      </td>
    </tr>
    <tr>
      <td style="background-color: #ffffff; padding: 40px 30px;">
        <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.4;">
          ${data.title}
        </h1>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          ${data.content}
        </div>
        ${buttonHtml}
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
          ${data.footerText || 'Mercadito Online PY - El mejor marketplace de Paraguay'}
        </p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Este es un email automático, por favor no responder.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://mercadito-online-py.vercel.app'}" style="color: #3b82f6; text-decoration: underline;">Visitar sitio web</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}








