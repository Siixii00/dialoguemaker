import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";

const DEFAULT_ADMIN_EMAIL = "yaninlin@gmail.com";

function base32ToHex(base32: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of base32.toUpperCase()) {
    const val = chars.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  
  let hex = "";
  for (let i = 0; i < bits.length - 3; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

function hexToBytes(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return buffer;
}

async function sha1(message: Uint8Array): Promise<Uint8Array> {
  const arrayBuffer = new ArrayBuffer(message.length);
  new Uint8Array(arrayBuffer).set(message);
  const buffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
  return new Uint8Array(buffer);
}

function truncate(hmac: Uint8Array): number {
  const offset = hmac[hmac.length - 1] & 0x0f;
  return (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const keyHex = base32ToHex(secret);
  const keyBytes = hexToBytes(keyHex);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);

  for (let offset = -1; offset <= 1; offset++) {
    const currentStep = timeStep + offset;
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, currentStep, false);
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
    const hmac = new Uint8Array(signature);
    
    const generatedCode = truncate(hmac).toString().padStart(6, "0");
    
    if (generatedCode === code) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    await initDatabase();

    let adminEmail = DEFAULT_ADMIN_EMAIL;
    let secret = null;
    let twoFactorEnabled = false;

    try {
      const configResult = await db.execute({
        sql: "SELECT admin_email, two_factor_secret, two_factor_enabled FROM admin_config WHERE id = 'default'",
      });

      if (configResult.rows.length > 0) {
        adminEmail = configResult.rows[0].admin_email as string || DEFAULT_ADMIN_EMAIL;
        secret = configResult.rows[0].two_factor_secret;
        twoFactorEnabled = configResult.rows[0].two_factor_enabled === 1;
      }
    } catch (dbError) {
      console.log("Database error, using defaults");
    }

    if (email !== adminEmail) {
      return NextResponse.json({ error: "Email 不符合管理員設定" }, { status: 403 });
    }

    if (!secret) {
      return NextResponse.json({ error: "尚未設定 2FA" }, { status: 400 });
    }

    const isValid = await verifyTOTP(secret as string, code);

    if (!isValid) {
      return NextResponse.json({ error: "驗證碼錯誤" }, { status: 401 });
    }

    if (!twoFactorEnabled) {
      try {
        await db.execute({
          sql: "UPDATE admin_config SET two_factor_enabled = 1 WHERE id = 'default'",
        });
      } catch (dbError) {
        console.log("Could not update 2FA status");
      }
    }

    return NextResponse.json({
      success: true,
      message: "驗證成功",
      isNewSetup: !twoFactorEnabled,
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return NextResponse.json({ error: "驗證失敗" }, { status: 500 });
  }
}