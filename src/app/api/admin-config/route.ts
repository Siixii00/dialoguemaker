import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";

const DEFAULT_ADMIN_EMAIL = "yaninlin@gmail.com";
const DEFAULT_GOOGLE_CLIENT_ID = "807013160344-ircr1f9gmb9gv7617ilc7asfecv737d5.apps.googleusercontent.com";

export async function GET() {
  try {
    await initDatabase();
    
    const result = await db.execute({
      sql: "SELECT admin_email, google_client_id, two_factor_enabled FROM admin_config WHERE id = 'default'",
    });

    if (result.rows.length === 0) {
      return NextResponse.json({
        adminEmail: DEFAULT_ADMIN_EMAIL,
        googleClientId: DEFAULT_GOOGLE_CLIENT_ID,
        twoFactorEnabled: false,
      });
    }

    return NextResponse.json({
      adminEmail: result.rows[0].admin_email,
      googleClientId: result.rows[0].google_client_id,
      twoFactorEnabled: result.rows[0].two_factor_enabled === 1,
    });
  } catch (error) {
    console.error("Error fetching admin config:", error);
    return NextResponse.json({
      adminEmail: DEFAULT_ADMIN_EMAIL,
      googleClientId: DEFAULT_GOOGLE_CLIENT_ID,
      twoFactorEnabled: false,
    });
  }
}