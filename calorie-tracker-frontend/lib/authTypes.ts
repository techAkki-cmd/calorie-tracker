export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
};

export type AuthStatus = "hydrating" | "anonymous" | "authenticated";

export type AuthFieldErrors = {
  email?: string;
  password?: string;
};
