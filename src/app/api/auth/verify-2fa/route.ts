import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";

const DEFAULT_ADMIN_EMAIL = "yaninlin@gmail.com";

function verifyTOTP(secret: string, code: string): boolean {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let key = "";
  for (const c of secret) {
    const val = chars.indexOf(c.toUpperCase());
    if (val === -1) continue;
    key += val.toString(2).padStart(5, "0");
  }

  const keyBytes = [];
  for (let i = 0; i < key.length; i += 8) {
    keyBytes.push(parseInt(key.slice(i, i + 8), 2));
  }

  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);

  for (let offset = -1; offset <= 1; offset++) {
    const currentStep = timeStep + offset;
    const timeBytes = new ArrayBuffer(8);
    const timeView = new DataView(timeBytes);
    timeView.setUint32(4, currentStep, false);

    const hmac = computeHMAC(new Uint8Array(timeBytes), keyBytes);
    const offsetIndex = hmac[hmac.length - 1] & 0x0f;
    const binaryCode =
      ((hmac[offsetIndex] & 0x7f) << 24) |
      ((hmac[offsetIndex + 1] & 0xff) << 16) |
      ((hmac[offsetIndex + 2] & 0xff) << 8) |
      (hmac[offsetIndex + 3] & 0xff);

    const generatedCode = (binaryCode % 1000000).toString().padStart(6, "0");

    if (generatedCode === code) {
      return true;
    }
  }

  return false;
}

function computeHMAC(message: Uint8Array, key: number[]): number[] {
  const blockSize = 64;
  const outputSize = 20;

  let paddedKey = key.slice();
  if (paddedKey.length > blockSize) {
    paddedKey = sha1(paddedKey);
  }
  while (paddedKey.length < blockSize) {
    paddedKey.push(0);
  }

  const oKeyPad = paddedKey.map((b) => b ^ 0x5c);
  const iKeyPad = paddedKey.map((b) => b ^ 0x36);

  const innerHash = sha1([...iKeyPad, ...Array.from(message)]);
  const outerHash = sha1([...oKeyPad, ...innerHash]);

  return outerHash;
}

function sha1(data: number[]): number[] {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const originalLength = data.length;
  const paddedLength = Math.ceil((originalLength + 9) / 64) * 64;
  const padded = [...data, 0x80];
  while (padded.length < paddedLength - 8) {
    padded.push(0);
  }
  const lengthBits = originalLength * 8;
  padded.push(0, 0, 0, 0);
  padded.push((lengthBits >> 24) & 0xff);
  padded.push((lengthBits >> 16) & 0xff);
  padded.push((lengthBits >> 8) & 0xff);
  padded.push(lengthBits & 0xff);

  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.slice(i, i + 64);
    const w = chunk.slice();

    for (let j = 16; j < 80; j++) {
      const val = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w.push(rol(val, 1));
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;

      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rol(a, 5) + f + e + k + w[j]) & 0xffffffff;
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) & 0xffffffff;
    h1 = (h1 + b) & 0xffffffff;
    h2 = (h2 + c) & 0xffffffff;
    h3 = (h3 + d) & 0xffffffff;
    h4 = (h4 + e) & 0xffffffff;
  }

  return [
    (h0 >> 24) & 0xff,
    (h0 >> 16) & 0xff,
    (h0 >> 8) & 0xff,
    h0 & 0xff,
    (h1 >> 24) & 0xff,
    (h1 >> 16) & 0xff,
    (h1 >> 8) & 0xff,
    h1 & 0xff,
    (h2 >> 24) & 0xff,
    (h2 >> 16) & 0xff,
    (h2 >> 8) & 0xff,
    h2 & 0xff,
    (h3 >> 24) & 0xff,
    (h3 >> 16) & 0xff,
    (h3 >> 8) & 0xff,
    h3 & 0xff,
    (h4 >> 24) & 0xff,
    (h4 >> 16) & 0xff,
    (h4 >> 8) & 0xff,
    h4 & 0xff,
  ];
}

function rol(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) & 0xffffffff;
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

    const isValid = verifyTOTP(secret as string, code);

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