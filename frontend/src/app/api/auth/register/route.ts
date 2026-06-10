import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080";
    const apiUrl = `${backendUrl}/api`;

    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = "Registration failed";
      try {
        const jsonError = JSON.parse(errorData);
        errorMessage = jsonError.message || errorMessage;
      } catch {
        errorMessage = errorData || errorMessage;
      }
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Registration proxy failed:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
