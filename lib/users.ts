import bcrypt from "bcryptjs";
import { query, runMigrations } from "@/lib/db";

export type AuthUser = {
  id: string;
  email: string;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
};

export async function createUser(email: string, password: string): Promise<AuthUser> {
  await runMigrations();

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query<AuthUser>(
    `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
    `,
    [normalizedEmail, passwordHash]
  );

  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await runMigrations();

  const result = await query<UserRow>(
    `
      SELECT id, email, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] ?? null;
}

export async function verifyUserPassword(email: string, password: string): Promise<AuthUser | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email
  };
}
