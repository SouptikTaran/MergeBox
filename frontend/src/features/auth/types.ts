export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    plan: string;
  };
  csrfToken: string;
}

export type SessionState =
  | { status: "loading"; session: null }
  | { status: "authenticated"; session: Session }
  | { status: "anonymous"; session: null }
  | { status: "error"; session: null; message: string };
