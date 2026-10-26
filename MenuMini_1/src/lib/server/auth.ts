import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import pg from 'pg';
import type { PoolClient } from 'pg';
import { env } from '$env/dynamic/private';
import type { MerchantPrincipal } from './merchant-catalog';
import startingSections from '../onboarding/starting-sections.json';

export interface UserSession {
  userId: string;
  businessId: string;
  venueId: string;
  venueSlug: string;
  displayName: string;
  email: string;
  csrfToken: string;
}

let pool: pg.Pool | undefined;

function getAdminPool(): pg.Pool {
  if (!pool) {
    const connectionString = env.DATABASE_URL || 'postgres://menu_admin@127.0.0.1:5434/menumini';
    pool = new pg.Pool({ connectionString, max: 4, idleTimeoutMillis: 10000 });
  }
  return pool;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const testHash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSlug(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'venue-' + randomBytes(3).toString('hex');
}

/**
 * Registers a new business, owner, venue, and creates initial session.
 */
export async function registerMerchant(input: {
  email: string;
  password: string;
  displayName: string;
  businessName: string;
  businessTypeId: string;
  branchName?: string;
  city?: string;
  area?: string;
  phone?: string;
}): Promise<{ session: UserSession; token: string }> {
  const pool = getAdminPool();
  const client = await pool.connect();

  try {
    await client.query('begin');

    const email = input.email.toLowerCase().trim();
    const existing = await client.query('select id from menumini.app_users where email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = hashPassword(input.password);
    const userRes = await client.query<{ id: string }>(
      `insert into menumini.app_users (email, display_name, password_hash)
       values ($1, $2, $3) returning id`,
      [email, input.displayName.trim(), passwordHash]
    );
    const userId = userRes.rows[0].id;

    // Create Merchant
    let slug = generateSlug(input.businessName);
    const slugCheck = await client.query('select id from menumini.merchants where slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    const merchantRes = await client.query<{ id: string }>(
      `insert into menumini.merchants (name, slug, plan)
       values ($1, $2, 'MINI') returning id`,
      [input.businessName.trim(), slug]
    );
    const merchantId = merchantRes.rows[0].id;

    // Create Membership
    await client.query(
      `insert into menumini.merchant_memberships (merchant_id, user_id, role)
       values ($1, $2, 'OWNER')`,
      [merchantId, userId]
    );

    // Create Primary Venue
    let venueSlug = slug;
    const venueCheck = await client.query('select id from menumini.venues where public_slug = $1', [venueSlug]);
    if (venueCheck.rows.length > 0) {
      venueSlug = `${venueSlug}-${randomBytes(2).toString('hex')}`;
    }

    const branchName = input.branchName?.trim() || 'Main Branch';
    const venueRes = await client.query<{ id: string }>(
      `insert into menumini.venues (merchant_id, name, public_slug, timezone, currency, ordering_enabled)
       values ($1, $2, $3, 'Africa/Addis_Ababa', 'ETB', false) returning id`,
      [merchantId, branchName, venueSlug]
    );
    const venueId = venueRes.rows[0].id;

    // Create initial branch profile draft & menu draft
    const sectionNames = ((startingSections as Record<string, string[]>)[input.businessTypeId] || ['Main Menu']).slice(0, 15);
    const initialSections = sectionNames.map(name => ({
      id: crypto.randomUUID(),
      nameEn: name,
      items: []
    }));

    const initialProfile = {
      businessTypeId: input.businessTypeId,
      branch: {
        publicName: input.businessName.trim(),
        name: branchName,
        city: input.city?.trim() || 'Addis Ababa',
        area: input.area?.trim() || '',
        landmark: '',
        publicPhone: input.phone?.trim() || '',
        serviceMode: 'MENU_ONLY',
        currency: 'ETB',
        timezone: 'Africa/Addis_Ababa',
        hours: [
          { day: 0, status: 'UNSPECIFIED' },
          { day: 1, status: 'UNSPECIFIED' },
          { day: 2, status: 'UNSPECIFIED' },
          { day: 3, status: 'UNSPECIFIED' },
          { day: 4, status: 'UNSPECIFIED' },
          { day: 5, status: 'UNSPECIFIED' },
          { day: 6, status: 'UNSPECIFIED' }
        ]
      }
    };

    const initialMenu = {
      themeId: 'mini-minimal-slate',
      primaryColor: '#38BDF8',
      sections: initialSections
    };

    await client.query(
      `insert into menumini.branch_profile_drafts (merchant_id, venue_id, version, content, updated_by)
       values ($1, $2, 1, $3::jsonb, $4)`,
      [merchantId, venueId, JSON.stringify(initialProfile), userId]
    );

    await client.query(
      `insert into menumini.menu_drafts (merchant_id, venue_id, version, content, updated_by)
       values ($1, $2, 1, $3::jsonb, $4)`,
      [merchantId, venueId, JSON.stringify(initialMenu), userId]
    );

    // Create Session
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await client.query(
      `insert into menumini.staff_sessions (user_id, token_hash, expires_at)
       values ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    await client.query('commit');

    const csrfToken = generateToken();
    const session: UserSession = {
      userId,
      businessId: merchantId,
      venueId,
      venueSlug,
      displayName: input.displayName.trim(),
      email,
      csrfToken
    };

    return { session, token };
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Log in with email and password.
 */
export async function loginMerchant(
  emailInput: string,
  passwordInput: string
): Promise<{ session: UserSession; token: string }> {
  const pool = getAdminPool();
  const email = emailInput.toLowerCase().trim();

  const userRes = await pool.query<{
    id: string;
    display_name: string;
    email: string;
    password_hash: string | null;
    is_active: boolean;
  }>(
    `select id, display_name, email, password_hash, is_active
     from menumini.app_users where email = $1`,
    [email]
  );

  const user = userRes.rows[0];
  if (!user || !user.is_active || !user.password_hash) {
    throw new Error('Invalid email or password.');
  }

  const valid = verifyPassword(passwordInput, user.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  // Get merchant and primary venue
  const membershipRes = await pool.query<{ merchant_id: string; venue_id: string; public_slug: string }>(
    `select m.merchant_id, v.id as venue_id, v.public_slug
     from menumini.merchant_memberships m
     join menumini.venues v on v.merchant_id = m.merchant_id and v.archived_at is null
     where m.user_id = $1 and m.is_active = true
     order by v.created_at asc limit 1`,
    [user.id]
  );

  if (membershipRes.rows.length === 0) {
    throw new Error('No active business found for this account.');
  }

  const membership = membershipRes.rows[0];
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `insert into menumini.staff_sessions (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  const csrfToken = generateToken();
  const session: UserSession = {
    userId: user.id,
    businessId: membership.merchant_id,
    venueId: membership.venue_id,
    venueSlug: membership.public_slug,
    displayName: user.display_name,
    email: user.email,
    csrfToken
  };

  return { session, token };
}

/**
 * Validate a session token from request cookies.
 */
export async function getSessionFromToken(token: string): Promise<UserSession | null> {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return null;
  }

  const pool = getAdminPool();
  const tokenHash = hashToken(token);

  const res = await pool.query<{
    user_id: string;
    display_name: string;
    email: string;
    merchant_id: string;
    venue_id: string;
    public_slug: string;
  }>(
    `select s.user_id, u.display_name, u.email, m.merchant_id, v.id as venue_id, v.public_slug
     from menumini.staff_sessions s
     join menumini.app_users u on u.id = s.user_id and u.is_active = true
     join menumini.merchant_memberships m on m.user_id = u.id and m.is_active = true
     join menumini.venues v on v.merchant_id = m.merchant_id and v.archived_at is null
     where s.token_hash = $1 and s.expires_at > now() and s.revoked_at is null
     order by v.created_at asc limit 1`,
    [tokenHash]
  );

  const row = res.rows[0];
  if (!row) return null;

  // Derive stable CSRF token from the session token hash
  const csrfToken = createHash('sha256').update(tokenHash + '_csrf_salt').digest('hex');

  return {
    userId: row.user_id,
    businessId: row.merchant_id,
    venueId: row.venue_id,
    venueSlug: row.public_slug,
    displayName: row.display_name,
    email: row.email,
    csrfToken
  };
}

export async function revokeToken(token: string): Promise<void> {
  if (!token) return;
  const pool = getAdminPool();
  const tokenHash = hashToken(token);
  await pool.query('update menumini.staff_sessions set revoked_at = now() where token_hash = $1', [tokenHash]);
}
