import crypto from "crypto";
import { db } from "../../database/database.js";

export function createUser(
  email,
  passwordHash
) {
  const id =
    crypto.randomUUID();

  const createdAt =
    new Date().toISOString();

  db.prepare(`
    INSERT INTO users (
      id,
      email,
      password_hash,
      created_at
    )
    VALUES (?, ?, ?, ?)
  `).run(
    id,
    email,
    passwordHash,
    createdAt
  );

  return {
    id,
    email,
    createdAt,
  };
}

export function findUserByEmail(
  email
) {
  return db.prepare(`
    SELECT *
    FROM users
    WHERE email = ?
  `).get(email);
}

export function findUserById(
  id
) {
  return db.prepare(`
    SELECT
      id,
      email,
      created_at
    FROM users
    WHERE id = ?
  `).get(id);
}

export function updateUserPassword(
  id,
  passwordHash
) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(passwordHash, id);
}
