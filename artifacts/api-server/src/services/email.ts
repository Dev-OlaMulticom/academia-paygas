export async function sendVerificationEmail(to: string, userName: string, token: string): Promise<boolean> {
  const verifyUrl = `${process.env.APP_URL || ''}/verificar-email?token=${token}`
  console.log(`[EMAIL STUB] Verification email to ${to}: ${verifyUrl}`)
  return true
}

export async function sendNotificationAlertEmail(to: string, userName: string, titulo: string): Promise<boolean> {
  console.log(`[EMAIL STUB] Notification alert to ${to}: ${titulo}`)
  return true
}

export async function sendCertificateEmail(to: string, userName: string, moduloName: string): Promise<boolean> {
  console.log(`[EMAIL STUB] Certificate email to ${to}: ${moduloName}`)
  return true
}
