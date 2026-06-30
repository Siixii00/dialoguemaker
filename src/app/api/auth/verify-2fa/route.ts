import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    const configResult = await db.execute({
      sql: "SELECT admin_email, two_factor_secret, two_factor_enabled FROM admin_config WHERE id = 'default'",
    });

    if (configResult.rows.length === 0) {
      return NextResponse.json({ error: "尚未設定管理員" }, { status: 404 });
    }

    const config = configResult.rows[0];
    const adminEmail = config.admin_email as string;
    const secret = config.two_factor_secret as string;
    const twoFactorEnabled = config.two_factor_enabled as number;

    if (email !== adminEmail) {
      return NextResponse.json({ error: "Email 不符合管理員設定" }, { status: 403 });
    }

    if (!secret) {
      return NextResponse.json({ error: "尚未設定 2FA" }, { status: 400 });
    }

    const totp = new OTPAuth.TOTP({
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const expectedCode = totp.generate();
    const delta = totp.validate({
      token: code,
      window: 1,
    });

    if (delta === null) {
      return NextResponse.json({ error: "驗證碼錯誤" }, { status: 401 });
    }

    if (twoFactorEnabled === 0) {
      await db.execute({
        sql: "UPDATE admin_config SET two_factor_enabled = 1 WHERE id = 'default'",
      });
    }

    return NextResponse.json({
      success: true,
      message: "驗證成功",
      isNewSetup: twoFactorEnabled === 0,
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return NextResponse.json({ error: "驗證失敗" }, { status: 500 });
  }
}