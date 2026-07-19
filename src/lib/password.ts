import bcrypt from 'bcryptjs'

const DEFAULT_PASSWORD_HASH_ROUNDS = 10

export function getPasswordHashRounds() {
  const configuredRounds = Number(process.env.PASSWORD_HASH_ROUNDS)

  if (Number.isInteger(configuredRounds) && configuredRounds >= 8 && configuredRounds <= 14) {
    return configuredRounds
  }

  return DEFAULT_PASSWORD_HASH_ROUNDS
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, getPasswordHashRounds())
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function passwordHashNeedsUpgrade(passwordHash: string) {
  try {
    return bcrypt.getRounds(passwordHash) !== getPasswordHashRounds()
  } catch {
    return true
  }
}
