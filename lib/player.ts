const COOKIE = 'magic-player';
export function deviceId(request: Request) {
  const value = request.headers.get('Cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9-]{36}$/.test(value) ? value : null;
}
export function playerCookie(id: string, request: Request) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
