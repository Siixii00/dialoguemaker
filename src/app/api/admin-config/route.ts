import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute({
      sql: "SELECT admin_email, google_client_id, two_factor_enabled FROM admin_config WHERE id = 'default'",
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "尚未設定管理員" }, { status: 404 });
    }

    return NextResponse.json({
      adminEmail: result.rows[0].admin_email,
      googleClientId: result.rows[0].google_client_id,
      twoFactorEnabled: result.rows[0].two_factor_enabled,
    });
  } catch (error) {
    console.error("Error fetching admin config:", error);
    return NextResponse.json({ error: "取得設定失敗" }, { status: 500 });
  }
}