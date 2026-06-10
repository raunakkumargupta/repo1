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

    res.cookies.set('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
