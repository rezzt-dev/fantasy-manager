import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ session }) => {
  if (session) {
    session.destroy();
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': 'fantasy_tokens=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
      'Content-Type': 'application/json',
    },
  });
};
