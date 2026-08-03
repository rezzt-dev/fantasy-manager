import type { AuthTokens } from './fantasy';

declare global {
  namespace App {
    interface SessionData {
      fantasy_tokens?: AuthTokens;
    }
  }
}

export {};
