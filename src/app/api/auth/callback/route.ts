import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/chapters?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/chapters?error=no_code", request.url));
  }

  try {
    const configResult = await db.execute({
      sql: "SELECT google_client_id FROM admin_config WHERE id = 'default'",
    });

    if (configResult.rows.length === 0) {
      return NextResponse.redirect(new URL("/chapters?error=no_config", request.url));
    }

    const clientId = configResult.rows[0].google_client_id as string;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${request.nextUrl.origin}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/chapters?error=token_failed", request.url));
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    const adminResult = await db.execute({
      sql: "SELECT admin_email, two_factor_enabled FROM admin_config WHERE id = 'default'",
    });

    if (adminResult.rows.length === 0) {
      return NextResponse.redirect(new URL("/chapters?error=no_admin", request.url));
    }

    const adminEmail = adminResult.rows[0].admin_email as string;
    const twoFactorEnabled = adminResult.rows[0].two_factor_enabled as number;

    if (userEmail !== adminEmail) {
      return NextResponse.redirect(new URL("/chapters?error=wrong_email", request.url));
    }

    const response = NextResponse.redirect(new URL("/chapters", request.url));
    
    response.cookies.set("auth_email", userEmail, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60,
    });

    response.cookies.set("auth_pending", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 5,
    });

    if (twoFactorEnabled === 1) {
      response.cookies.set("require_2fa", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 5,
      });
    }

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/chapters?error=server_error", request.url));
  }
}