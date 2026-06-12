import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080";
    const apiUrl = `${backendUrl}/api`;
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = 'Authentication failed';
      try {
        const errorData = JSON.parse(text);
        errorMsg = errorData.message || errorMsg;
      } catch (e) {
        errorMsg = text || errorMsg;
      }
      return NextResponse.json(
        { message: errorMsg.trim() },
        { status: response.status }
      );
    }

    const data = await response.json();
    const token = data.token;

    // We don't send the raw token to the client. We send user info and set the cookie.
    const res = NextResponse.json({ user: data.user }, { status: 200 });

    // Determine if we should set secure flag:
    // - Check x-forwarded-proto (reliable behind most proxies/LBs)
    // - Check actual request URL protocol
    // - Default to false so HTTP deployments work out of the box
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const requestUrl = new URL(request.url);
    const isHttps = forwardedProto === "https" || requestUrl.protocol === "https:";
    
    res.cookies.set('jwt', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
