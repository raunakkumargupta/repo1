import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session retrieval failed:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
