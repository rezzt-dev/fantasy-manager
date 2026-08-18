import type { APIRoute } from 'astro';
import type { AuthTokens } from '../../../types/fantasy';

function parseFullTokens(input: string): AuthTokens | null {
  let t = input.trim();

  // Remove surrounding quotes if the whole pasted value is a JSON string literal
  if (t.startsWith('"') && t.endsWith('"') && t.length > 2) {
    try {
      t = JSON.parse(t) as string;
      t = t.trim();
    } catch {
      t = t.slice(1, -1).trim();
    }
  }

  // If it's a JSON object, try to extract full token details
  if (t.startsWith('{') && t.endsWith('}')) {
    try {
      const obj = JSON.parse(t);
      const accessToken = (obj.access_token || obj.id_token || obj.token || '').trim();
      if (accessToken) {
        return {
          access_token: accessToken,
          refresh_token: (obj.refresh_token || '').trim(),
          id_token: (obj.id_token || '').trim(),
          token_type: (obj.token_type || 'Bearer').trim(),
          expires_in: obj.expires_in || obj.id_token_expires_in || 86400,
        };
      }
    } catch {
      // ignore
    }
  }

  // Accept any non-empty token that the API might use (JWT, v1|..., etc.)
  if (t.length > 10) {
    return {
      access_token: t,
      refresh_token: '',
      id_token: '',
      token_type: 'Bearer',
      expires_in: 86400,
    };
  }

  return null;
}

export const POST: APIRoute = async ({ request, session }) => {
  try {
    const body = (await request.json()) as { token?: string };
    const tokens = body.token ? parseFullTokens(body.token) : null;

    if (!tokens) {
      return new Response(JSON.stringify({ error: 'Token inválido. Pega el access_token JWT completo o el JSON de OAuth de LaLiga.' }), { status: 400 });
    }

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
