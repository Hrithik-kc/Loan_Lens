import bcrypt from 'bcryptjs';

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateLoanNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `LL-${year}-${rand}`;
}

export function paginate(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
