import type { APIRoute } from 'astro';
import type { AuthTokens } from '../../../types/fantasy';

function parseToken(input: string): string | null {
  let t = input.trim();

  // Remove surrounding quotes if the whole pasted value is a JSON string literal
  if (t.startsWith('"') && t.endsWith('"') && t.length > 2) {
    try {
      t = JSON.parse(t) as string;
    } catch {
      t = t.slice(1, -1);
    }
  }

  // If it's a JSON object, try to extract access_token
  if (t.startsWith('{') && t.endsWith('}')) {
    try {
      const obj = JSON.parse(t) as { access_token?: string; token?: string };
      if (obj.access_token) return obj.access_token.trim();
      if (obj.token) return obj.token.trim();
    } catch {
      // ignore
    }
  }

  // Accept any non-empty token that the API might use (JWT, v1|..., etc.)
  if (t.length > 10) return t;

  return null;
}

export const POST: APIRoute = async ({ request, session }) => {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token ? parseToken(body.token) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token inválido. Pega el access_token JWT completo.' }), { status: 400 });
    }

    const tokens: AuthTokens = {
      access_token: token,
      refresh_token: '',
      id_token: '',
      token_type: 'Bearer',
      expires_in: 86400,
    };

    if (session) {
      session.set('fantasy_tokens', tokens);
    } else {
      // Fallback: set a lightweight cookie if sessions are unavailable
      const tokenCookie = `fantasy_tokens=${encodeURIComponent(JSON.stringify(tokens))}; HttpOnly; Path=/; Max-Age=${tokens.expires_in}; SameSite=Lax`;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Set-Cookie': tokenCookie,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ session }) => {
  const tokens = session ? await session.get('fantasy_tokens') : undefined;
  return new Response(JSON.stringify({ hasToken: Boolean(tokens?.access_token) }), { status: 200 });
};
