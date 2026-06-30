import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";
import { randomBytes } from "crypto";

const DEFAULT_ADMIN_EMAIL = "yaninlin@gmail.com";

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(20);
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars[bytes[i] % chars.length];
  }
  return secret;
}

function generateQRCodeUrl(email: string, secret: string): string {
  const issuer = encodeURIComponent("對話編輯器");
  const label = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    await initDatabase();

    let adminEmail = DEFAULT_ADMIN_EMAIL;
    let existingSecret: string | null = null;
    let twoFactorEnabled = false;

    try {
      const configResult = await db.execute({
        sql: "SELECT admin_email, two_factor_secret, two_factor_enabled FROM admin_config WHERE id = 'default'",
      });

      if (configResult.rows.length > 0) {
        adminEmail = (configResult.rows[0].admin_email as string) || DEFAULT_ADMIN_EMAIL;
        existingSecret = configResult.rows[0].two_factor_secret as string | null;
        twoFactorEnabled = configResult.rows[0].two_factor_enabled === 1;
      }
    } catch (dbError) {
      console.log("Database not initialized, using defaults");
    }

    if (email !== adminEmail) {
      return NextResponse.json({ error: "Email 不符合管理員設定" }, { status: 403 });
    }

    if (twoFactorEnabled && existingSecret) {
      return NextResponse.json({ error: "2FA 已設定，請使用驗證碼登入" }, { status: 400 });
    }

    const secret = existingSecret || generateSecret();
    const otpauthUrl = generateQRCodeUrl(email, secret as string);

    try {
      await db.execute({
        sql: "UPDATE admin_config SET two_factor_secret = ? WHERE id = 'default'",
        args: [secret],
      });
    } catch (dbError) {
      console.log("Could not save secret to database");
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return NextResponse.json({
      qrCodeUrl,
      secret,
      message: "請使用 Google Authenticator 或其他 TOTP App 掃描 QR Code",
    });
  } catch (error) {
    console.error("Error generating 2FA:", error);
    return NextResponse.json({ error: "產生 2FA 失敗" }, { status: 500 });
  }
}