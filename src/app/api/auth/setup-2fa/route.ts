import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const configResult = await db.execute({
      sql: "SELECT admin_email FROM admin_config WHERE id = 'default'",
    });

    if (configResult.rows.length === 0) {
      return NextResponse.json({ error: "尚未設定管理員" }, { status: 404 });
    }

    const adminEmail = configResult.rows[0].admin_email as string;

    if (email !== adminEmail) {
      return NextResponse.json({ error: "Email 不符合管理員設定" }, { status: 403 });
    }

    const existing2FA = await db.execute({
      sql: "SELECT two_factor_secret, two_factor_enabled FROM admin_config WHERE id = 'default'",
    });

    if (existing2FA.rows[0].two_factor_enabled === 1) {
      return NextResponse.json({ error: "2FA 已設定，請使用驗證碼登入" }, { status: 400 });
    }

    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
      secret: secret.base32,
      label: adminEmail,
      issuer: "對話編輯器",
    });

    const otpauthUrl = totp.toString();
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    await db.execute({
      sql: "UPDATE admin_config SET two_factor_secret = ? WHERE id = 'default'",
      args: [secret.base32],
    });

    return NextResponse.json({
      qrCodeUrl,
      secret: secret.base32,
      message: "請使用 Google Authenticator 或其他 TOTP App 掃描 QR Code",
    });
  } catch (error) {
    console.error("Error generating 2FA:", error);
    return NextResponse.json({ error: "產生 2FA 失敗" }, { status: 500 });
  }
}