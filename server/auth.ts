import crypto from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import type {AdminAuthStatus} from '../src/types/domain.ts';
import {getSetting, setSettingIfAbsent} from './db.ts';

const ADMIN_HASH_KEY = 'admin_password_hash';
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function timingSafeStringCompare(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

export async function getAdminAuthStatus(): Promise<AdminAuthStatus> {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    return {configured: true, mode: 'env'};
  }
  const storedHash = await getSetting(ADMIN_HASH_KEY);
  if (storedHash) {
    return {configured: true, mode: 'db'};
  }
  return {configured: false, mode: 'setup'};
}

export async function setupInitialAdminPasscode(passcode: string): Promise<{ok: boolean; error?: string}> {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    return {ok: false, error: 'A senha administrativa já está definida via variável de ambiente.'};
  }
  const trimmed = passcode.trim();
  if (trimmed.length < 8) {
    return {ok: false, error: 'A senha administrativa deve conter no mínimo 8 caracteres.'};
  }
  const hash = hashPasscode(trimmed);
  const inserted = await setSettingIfAbsent(ADMIN_HASH_KEY, hash);
  if (!inserted) {
    return {ok: false, error: 'O acesso administrativo inicial já foi configurado anteriormente.'};
  }
  return {ok: true};
}

export async function verifyAdminLogin(passcode: string): Promise<boolean> {
  const trimmed = passcode.trim();
  if (!trimmed) return false;

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode && envPasscode.length > 0) {
    return timingSafeStringCompare(trimmed, envPasscode);
  }

  const storedHash = await getSetting(ADMIN_HASH_KEY);
  if (!storedHash) return false;
  return verifyPasscodeHash(trimmed, storedHash);
}

export function issueAdminToken(): {token: string; expiresAt: number} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({role: 'admin', exp: expiresAt})).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return {token: `${payload}.${sig}`, expiresAt};
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {role?: string; exp?: number};
    if (parsed.role !== 'admin' || typeof parsed.exp !== 'number') return false;
    return Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({error: 'Autenticação administrativa necessária.'});
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({error: 'Sessão administrativa expirada ou inválida.'});
    return;
  }
  next();
}
