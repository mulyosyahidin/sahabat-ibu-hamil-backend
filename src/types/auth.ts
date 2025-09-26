export interface AuthPayload {
  user: {
    id: number;
    email: string;
    name: string;
  };
  iat?: number;
  exp?: number;
}
