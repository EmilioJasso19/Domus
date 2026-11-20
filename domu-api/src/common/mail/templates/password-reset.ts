// Plantilla del correo con el código de recuperación de contraseña. Solo CSS
// inline: la mayoría de clientes de correo ignoran <style> y hojas externas.
// Colores tomados de domus-front/DESIGN.md (primario #3A63FA, fondo #FAFAF8).

export interface PasswordResetTemplateInput {
  name: string;
  code: string;
  expiresInMinutes: number;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function passwordResetTemplate({
  name,
  code,
  expiresInMinutes,
}: PasswordResetTemplateInput): EmailContent {
  const subject = 'Tu código para restablecer la contraseña de Domus';
  const safeName = escapeHtml(name);

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#FAFAF8;font-family:'Nunito',Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border-radius:16px;padding:32px;">
            <tr>
              <td style="font-size:22px;font-weight:800;color:#111827;padding-bottom:8px;">
                Hola, ${safeName}
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:22px;color:#374151;padding-bottom:24px;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta de Domus. Usa este código en la app:
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <div style="display:inline-block;background-color:#EEF2FF;border-radius:12px;padding:16px 24px;font-size:32px;font-weight:800;letter-spacing:8px;color:#3A63FA;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:20px;color:#6B7280;padding-bottom:8px;">
                El código expira en ${expiresInMinutes} minutos.
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:20px;color:#6B7280;">
                Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hola, ${name}`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Domus. Usa este código en la app:',
    '',
    code,
    '',
    `El código expira en ${expiresInMinutes} minutos.`,
    'Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');

  return { subject, html, text };
}
