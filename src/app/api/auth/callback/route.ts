import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";

const DEFAULT_ADMIN_EMAIL = "yaninlin@gmail.com";
const DEFAULT_GOOGLE_CLIENT_ID = "807013160344-ircr1f9gmb9gv7617ilc7asfecv737d5.apps.googleusercontent.com";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = request.nextUrl.origin;

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${baseUrl}/chapters?auth_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/chapters?auth_error=no_code`);
  }

  try {
    await initDatabase();

    let clientId = DEFAULT_GOOGLE_CLIENT_ID;
    let adminEmail = DEFAULT_ADMIN_EMAIL;
    let twoFactorEnabled = false;

    try {
      const configResult = await db.execute({
        sql: "SELECT google_client_id, admin_email, two_factor_enabled FROM admin_config WHERE id = 'default'",
      });

      if (configResult.rows.length > 0) {
        clientId = configResult.rows[0].google_client_id as string || DEFAULT_GOOGLE_CLIENT_ID;
        adminEmail = configResult.rows[0].admin_email as string || DEFAULT_ADMIN_EMAIL;
        twoFactorEnabled = configResult.rows[0].two_factor_enabled === 1;
      }
    } catch (dbError) {
      console.log("Using default config");
    }

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      console.error("Missing GOOGLE_CLIENT_SECRET");
      return NextResponse.redirect(`${baseUrl}/chapters?auth_error=missing_secret`);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      return NextResponse.redirect(`${baseUrl}/chapters?auth_error=token_failed`);
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    if (userEmail !== adminEmail) {
      return NextResponse.redirect(`${baseUrl}/chapters?auth_error=wrong_email`);
    }

    const response = NextResponse.redirect(`${baseUrl}/chapters?auth_success=true&email=${encodeURIComponent(userEmail)}&require_2fa=${twoFactorEnabled}`);
    
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${baseUrl}/chapters?auth_error=server_error`);
  }
}