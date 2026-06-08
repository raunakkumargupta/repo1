import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  
  // Explicitly clear the jwt cookie
  res.cookies.set('jwt', '', {
    httpOnly: true,
    expires: new Date(0), // expire immediately
    path: '/',
  });

  return res;
}
