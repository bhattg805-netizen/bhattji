import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

// Function to normalize and sanitize database connection string
export function normalizeDatabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();

  // 1. Remove bracket placeholders e.g. postgres:[mukulbhatt@123]@... -> postgres:mukulbhatt%40123@...
  url = url.replace(/:\[([^\]]+)\]@/, (m, p) => ':' + encodeURIComponent(p) + '@');

  // 2. If password contains unescaped special characters (e.g. '@' or '#'), encode it properly
  const match = url.match(/^(postgres(?:ql)?:\/\/[^:]+):([^@]+)@(.+)$/);
  if (match) {
    const [, protocolAndUser, rawPassword, rest] = match;
    if (rawPassword.includes('@') || rawPassword.includes('#') || rawPassword.includes('[') || rawPassword.includes(']')) {
      const decoded = decodeURIComponent(rawPassword);
      url = `${protocolAndUser}:${encodeURIComponent(decoded)}@${rest}`;
    }
  }

  // 3. Supabase IPv4 compatibility:
  // Supabase direct connection (db.<ref>.supabase.co:5432) is IPv6-only.
  // When running on Cloud Run, Vercel, or IPv4 networks, route through pooler.
  if (url.includes('db.esyfiidahljvwjqcvskg.supabase.co')) {
    url = url
      .replace('postgresql://postgres:', 'postgresql://postgres.esyfiidahljvwjqcvskg:')
      .replace('postgres://postgres:', 'postgres://postgres.esyfiidahljvwjqcvskg:')
      .replace('db.esyfiidahljvwjqcvskg.supabase.co:5432', 'aws-0-ap-northeast-2.pooler.supabase.com:6543')
      .replace('db.esyfiidahljvwjqcvskg.supabase.co', 'aws-0-ap-northeast-2.pooler.supabase.com:6543');
  } else if (url.includes('supabase.co:5432')) {
    url = url.replace(':5432', ':6543');
  }

  return url;
}

// Check if external or Cloud SQL database credentials are provided
export const isDatabaseConfigured = Boolean(
  (process.env.SQL_HOST && process.env.SQL_HOST !== 'localhost' && process.env.SQL_HOST !== '127.0.0.1') ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL
);

// In-Memory Database Store for robust offline operation / local development
const now = new Date();
const defaultSettingsList = [
  { key: 'websiteName', value: 'YouthSMM' },
  { key: 'defaultLanguage', value: 'en' },
  { key: 'whatsappNumber', value: '8795005604' },
  { key: 'telegramUsername', value: '@securesmmtursted' },
  { key: 'activeTheme', value: 'candid' },
  { key: 'allUpiStatus', value: 'enabled' },
  { key: 'googleLoginStatus', value: 'enabled' },
  { key: 'bharatpeStatus', value: 'linked' },
  { key: 'bharatpeMerchantName', value: 'PRIYA' },
  { key: 'bharatpeVpa', value: 'BHARATPE2H0D0Q1Y4T29351@unitype' },
  { key: 'bharatpePhone', value: '8795005604' },
  { key: 'inrToUsdRate', value: '0.012' },
  { key: 'inrToEurRate', value: '0.011' },
  { key: 'inrToPkrRate', value: '3.32' },
];

let nextEntityId = 100;

export const memoryStore: Record<string, any[]> = {
  settings: defaultSettingsList.map((s, idx) => ({
    id: idx + 1,
    key: s.key,
    value: s.value,
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
  })),
  users: [
    {
      id: 1,
      uid: 'admin-bhattg805',
      email: 'bhattg805@gmail.com',
      name: 'Bhatt Admin',
      role: 'admin',
      balance: 1000.0,
      status: 'active',
      customRate: 1.0,
      custom_rate: 1.0,
      customProviderUrl: null,
      custom_provider_url: null,
      customProviderKey: null,
      custom_provider_key: null,
      apiKey: 'ADMIN_TEST_API_KEY_805',
      api_key: 'ADMIN_TEST_API_KEY_805',
      password: '',
      createdAt: now,
      created_at: now,
    },
  ],
  categories: [
    { id: 1, name: 'Instagram Followers', status: 'active', sortOrder: 1, sort_order: 1, icon: 'instagram', createdAt: now, created_at: now },
    { id: 2, name: 'Instagram Likes & Views', status: 'active', sortOrder: 2, sort_order: 2, icon: 'instagram', createdAt: now, created_at: now },
    { id: 3, name: 'Telegram Members & Channel', status: 'active', sortOrder: 3, sort_order: 3, icon: 'telegram', createdAt: now, created_at: now },
    { id: 4, name: 'YouTube Views & Subscribers', status: 'active', sortOrder: 4, sort_order: 4, icon: 'youtube', createdAt: now, created_at: now },
    { id: 5, name: 'Facebook Likes & Followers', status: 'active', sortOrder: 5, sort_order: 5, icon: 'facebook', createdAt: now, created_at: now },
  ],
  services: [],
  orders: [],
  providers: [],
  payments: [],
  coupons: [],
  tickets: [],
  ticketMessages: [],
  announcements: [],
  activityLogs: [],
  blogs: [],
  appointments: [],
  affiliates: [],
  referrals: [],
  favoriteServices: [],
  childPanels: [],
  refillRequests: [],
};

function extractSelectedColumns(queryText: string): Array<{ table?: string; col: string }> {
  let rawColsStr = '';
  const selectMatch = queryText.match(/select\s+([\s\S]+?)\s+from/i);
  if (selectMatch) {
    rawColsStr = selectMatch[1];
  } else {
    const returningMatch = queryText.match(/returning\s+([\s\S]+?)(?:$|;)/i);
    if (returningMatch) {
      rawColsStr = returningMatch[1];
    }
  }
  if (!rawColsStr) return [];
  const rawCols = rawColsStr.split(',');
  return rawCols.map((c) => {
    const trimmed = c.trim();
    const parts = trimmed.split('.');
    if (parts.length > 1) {
      const table = parts[0].replace(/["\s]/g, '');
      const col = parts[1].replace(/["\s]/g, '');
      return { table, col };
    }
    return { col: trimmed.replace(/["\s]/g, '') };
  });
}

function getValueForCol(r: any, target: { table?: string; col: string }): any {
  const { table, col } = target;
  if (table === 'categories') {
    if (col === 'name') return r.categoryName || r.category_name || r.name;
    if (col === 'icon') return r.categoryIcon || r.category_icon || r.icon;
    if (col === 'id') return r.categoryId || r.category_id || 1;
    if (col === 'sort_order' || col === 'sortOrder') return r.sortOrder || r.sort_order || 1;
  }
  if (r[col] !== undefined && r[col] !== null) return r[col];
  const camel = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  if (r[camel] !== undefined && r[camel] !== null) return r[camel];
  const snake = col.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
  if (r[snake] !== undefined && r[snake] !== null) return r[snake];
  return null;
}

// Robust In-Memory SQL Query Emulator
export function executeInMemoryQuery(queryText: string, params: any[] = [], isArrayMode = false) {
  const norm = queryText.toLowerCase().trim();
  const command = norm.startsWith('insert')
    ? 'INSERT'
    : norm.startsWith('update')
    ? 'UPDATE'
    : norm.startsWith('delete')
    ? 'DELETE'
    : 'SELECT';

  // 1. SELECT QUERIES
  if (command === 'SELECT') {
    let rows: any[] = [];

    if (norm.includes('from "settings"') || norm.includes('from settings')) {
      if (norm.includes('where') && norm.includes('key')) {
        const targetKey = String(params[0] || '').trim();
        rows = memoryStore.settings.filter((s) => s.key === targetKey);
      } else {
        rows = [...memoryStore.settings];
      }
    } else if (norm.includes('from "orders"') || norm.includes('from orders')) {
      rows = [...memoryStore.orders];

      // Handle query for pending undispatched orders
      if (norm.includes('where') && norm.includes('is null') && norm.includes('provider_order_id')) {
        const targetStatus = String(params[0] || 'pending').toLowerCase();
        rows = rows.filter(
          (o) =>
            (!o.providerOrderId || o.providerOrderId === '' || !o.provider_order_id || o.provider_order_id === '') &&
            String(o.status || '').toLowerCase() === targetStatus
        );
      } else if (norm.includes('where') && (norm.includes('"id" = $') || norm.includes('id = $') || norm.includes('."id" = $'))) {
        const idVal = Number(params[0]);
        rows = rows.filter((o) => o.id === idVal);
      } else if (norm.includes('where') && (norm.includes('user_id') || norm.includes('"userId"'))) {
        const uidVal = Number(params[0]);
        rows = rows.filter((o) => o.userId === uidVal || o.user_id === uidVal);
      }

      // Handle limit
      const limitMatch = norm.match(/limit\s+\$?(\d+)/);
      if (limitMatch) {
        const limitNum = parseInt(limitMatch[1], 10) || 50;
        rows = rows.slice(0, limitNum);
      }
    } else if (norm.includes('from "services"') || norm.includes('from services')) {
      rows = memoryStore.services.map((s) => {
        const cat = memoryStore.categories.find((c) => c.id === (s.categoryId || s.category_id));
        return {
          ...s,
          categoryName: cat?.name || s.categoryName || 'General',
          category_name: cat?.name || s.categoryName || 'General',
          categoryIcon: cat?.icon || s.categoryIcon || 'globe',
          category_icon: cat?.icon || s.categoryIcon || 'globe',
        };
      });
      if (norm.includes('where') && (norm.includes('"id" = $') || norm.includes('id = $'))) {
        const idVal = Number(params[0]);
        rows = rows.filter((s) => s.id === idVal);
      }
    } else if (norm.includes('from "categories"') || norm.includes('from categories')) {
      rows = [...memoryStore.categories];
    } else if (norm.includes('from "users"') || norm.includes('from users')) {
      rows = [...memoryStore.users];
      if (norm.includes('email')) {
        const emailVal = String(params[0] || '').toLowerCase().trim();
        rows = rows.filter((u) => String(u.email || '').toLowerCase().trim() === emailVal);
      } else if (norm.includes('"id" = $') || norm.includes('id = $')) {
        const idVal = Number(params[0]);
        rows = rows.filter((u) => u.id === idVal);
      }
    } else if (norm.includes('from "providers"') || norm.includes('from providers')) {
      rows = [...memoryStore.providers];
    } else if (norm.includes('from "payments"') || norm.includes('from payments')) {
      rows = [...memoryStore.payments];
    } else if (norm.includes('from "tickets"') || norm.includes('from tickets')) {
      rows = [...memoryStore.tickets];
    } else if (norm.includes('from "ticket_messages"') || norm.includes('from ticket_messages')) {
      rows = [...memoryStore.ticketMessages];
    } else if (norm.includes('from "appointments"') || norm.includes('from appointments')) {
      rows = [...memoryStore.appointments];
    } else {
      // General fallback table
      const match = norm.match(/from\s+"?([a-zA-Z0-9_]+)"?/);
      const tableName = match ? match[1] : '';
      rows = memoryStore[tableName] ? [...memoryStore[tableName]] : [];
    }

    const selectedCols = extractSelectedColumns(queryText);
    let outputRows: any[];
    if (isArrayMode) {
      if (selectedCols.length > 0) {
        outputRows = rows.map((r) => selectedCols.map((c) => getValueForCol(r, c)));
      } else {
        outputRows = rows.map((r) => Object.values(r));
      }
    } else {
      if (selectedCols.length > 0) {
        outputRows = rows.map((r) => {
          const obj: any = {};
          selectedCols.forEach((c) => {
            obj[c.col] = getValueForCol(r, c);
          });
          return obj;
        });
      } else {
        outputRows = rows;
      }
    }

    return {
      command: 'SELECT',
      rowCount: outputRows.length,
      rows: outputRows,
      fields: [],
    };
  }

  // 2. INSERT QUERIES
  if (command === 'INSERT') {
    const tableMatch = norm.match(/into\s+"?([a-zA-Z0-9_]+)"?/);
    const tableName = tableMatch ? tableMatch[1] : 'records';
    const insertMatch = queryText.match(/into\s+"?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);

    const record: any = { id: nextEntityId++ };
    if (insertMatch) {
      const cols = insertMatch[2].split(',').map((c) => c.replace(/["\s]/g, ''));
      const valTokens = insertMatch[3].split(',').map((v) => v.trim());
      cols.forEach((col, idx) => {
        const valToken = valTokens[idx];
        if (valToken && valToken.startsWith('$')) {
          const paramIdx = parseInt(valToken.slice(1), 10) - 1;
          if (paramIdx >= 0 && paramIdx < params.length) {
            record[col] = params[paramIdx];
            const camel = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
            record[camel] = params[paramIdx];
          }
        } else if (valToken === 'default' && col === 'id') {
          // Keep existing generated record.id
        }
      });
    } else {
      const colsMatch = queryText.match(/into\s+"?[a-zA-Z0-9_]+"?\s*\(([^)]+)\)/i);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map((c) => c.replace(/["\s]/g, ''));
        cols.forEach((col, idx) => {
          if (idx < params.length) {
            record[col] = params[idx];
            const camel = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
            record[camel] = params[idx];
          }
        });
      }
    }

    if (!record.createdAt) record.createdAt = new Date();
    if (!record.created_at) record.created_at = record.createdAt;

    if (!memoryStore[tableName]) {
      memoryStore[tableName] = [];
    }

    // Special handling for settings insert/upsert
    if (tableName === 'settings' && record.key) {
      const existingIdx = memoryStore.settings.findIndex((s) => s.key === record.key);
      if (existingIdx >= 0) {
        memoryStore.settings[existingIdx] = {
          ...memoryStore.settings[existingIdx],
          ...record,
          updatedAt: new Date(),
          updated_at: new Date(),
        };
      } else {
        memoryStore.settings.push(record);
      }
    } else {
      memoryStore[tableName].push(record);
    }

    const selectedCols = extractSelectedColumns(queryText);
    let outputRows: any[];
    if (isArrayMode) {
      if (selectedCols.length > 0) {
        outputRows = [selectedCols.map((c) => getValueForCol(record, c))];
      } else {
        outputRows = [Object.values(record)];
      }
    } else {
      if (selectedCols.length > 0) {
        const obj: any = {};
        selectedCols.forEach((c) => {
          obj[c.col] = getValueForCol(record, c);
        });
        outputRows = [obj];
      } else {
        outputRows = [record];
      }
    }
    return {
      command: 'INSERT',
      rowCount: 1,
      rows: outputRows,
      fields: [],
    };
  }

  // 3. UPDATE QUERIES
  if (command === 'UPDATE') {
    const tableMatch = norm.match(/update\s+"?([a-zA-Z0-9_]+)"?/);
    const tableName = tableMatch ? tableMatch[1] : '';
    const tableData = memoryStore[tableName] || [];

    let updatedRecord: any = null;
    if (tableName === 'settings' && norm.includes('where') && norm.includes('key')) {
      const targetKey = String(params[params.length - 1] || '').trim();
      const idx = tableData.findIndex((s) => s.key === targetKey);
      if (idx >= 0) {
        tableData[idx].value = String(params[0] ?? '');
        tableData[idx].updatedAt = new Date();
        tableData[idx].updated_at = new Date();
        updatedRecord = tableData[idx];
      } else {
        const newSetting = {
          id: nextEntityId++,
          key: targetKey,
          value: String(params[0] ?? ''),
          createdAt: new Date(),
          created_at: new Date(),
          updatedAt: new Date(),
          updated_at: new Date(),
        };
        tableData.push(newSetting);
        updatedRecord = newSetting;
      }
    } else if (norm.includes('where')) {
      let targetIdx = -1;
      const whereIdMatch = queryText.match(/where\s+.*?"?id"?\s*=\s*\$(\d+)/i);
      if (whereIdMatch) {
        const idParamIdx = parseInt(whereIdMatch[1], 10) - 1;
        const idVal = Number(params[idParamIdx]);
        targetIdx = tableData.findIndex((r) => r.id === idVal);
      } else if (norm.includes('email = $') || norm.includes('"email" = $')) {
        const emailMatch = queryText.match(/where\s+.*?"?email"?\s*=\s*\$(\d+)/i);
        const emailParamIdx = emailMatch ? parseInt(emailMatch[1], 10) - 1 : params.length - 1;
        const emailVal = String(params[emailParamIdx] || '').toLowerCase().trim();
        targetIdx = tableData.findIndex((r) => String(r.email || '').toLowerCase().trim() === emailVal);
      } else if (norm.includes('id = $') || norm.includes('"id" = $')) {
        const idVal = Number(params[params.length - 1]);
        targetIdx = tableData.findIndex((r) => r.id === idVal);
      }

      if (targetIdx >= 0) {
        const setMatch = queryText.match(/set\s+(.*?)(?:\s+where|$)/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const regex = /"?([a-zA-Z0-9_]+)"?\s*=\s*(?:\$(\d+)|([^\s,]+))/g;
          let m: RegExpExecArray | null;
          while ((m = regex.exec(setClause)) !== null) {
            const col = m[1];
            if (m[2]) {
              const pIdx = parseInt(m[2], 10) - 1;
              if (pIdx >= 0 && pIdx < params.length) {
                const val = params[pIdx];
                tableData[targetIdx][col] = val;
                const camel = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
                tableData[targetIdx][camel] = val;
              }
            } else if (m[3] && m[3].includes('+')) {
              const currentVal = Number(tableData[targetIdx][col]) || 0;
              tableData[targetIdx][col] = currentVal + 1;
              const camel = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
              tableData[targetIdx][camel] = currentVal + 1;
            }
          }
        }
        tableData[targetIdx].updatedAt = new Date();
        tableData[targetIdx].updated_at = new Date();
        updatedRecord = tableData[targetIdx];
      }
    }

    const selectedCols = extractSelectedColumns(queryText);
    let outputRows: any[] = [];
    if (updatedRecord) {
      if (isArrayMode) {
        if (selectedCols.length > 0) {
          outputRows = [selectedCols.map((c) => getValueForCol(updatedRecord, c))];
        } else {
          outputRows = [Object.values(updatedRecord)];
        }
      } else {
        if (selectedCols.length > 0) {
          const obj: any = {};
          selectedCols.forEach((c) => {
            obj[c.col] = getValueForCol(updatedRecord, c);
          });
          outputRows = [obj];
        } else {
          outputRows = [updatedRecord];
        }
      }
    }
    return {
      command: 'UPDATE',
      rowCount: outputRows.length,
      rows: outputRows,
      fields: [],
    };
  }

  // 4. DELETE QUERIES
  if (command === 'DELETE') {
    const tableMatch = norm.match(/from\s+"?([a-zA-Z0-9_]+)"?/);
    const tableName = tableMatch ? tableMatch[1] : '';
    if (memoryStore[tableName] && norm.includes('where')) {
      const idVal = Number(params[0]);
      memoryStore[tableName] = memoryStore[tableName].filter((r) => r.id !== idVal);
    }
    return {
      command: 'DELETE',
      rowCount: 1,
      rows: [],
      fields: [],
    };
  }

  return {
    command: 'SELECT',
    rowCount: 0,
    rows: [],
    fields: [],
  };
}

let dbOfflineWarned = false;

// Function to create a connection pool supporting Cloud SQL (SQL_*), DATABASE_URL, or in-memory fallback
export const createPool = () => {
  // If no external database credentials provided, return lightweight in-memory pool immediately
  if (!isDatabaseConfigured) {
    console.log('[DB Pool] No external DATABASE_URL or Cloud SQL credentials configured. Operating with in-memory database store.');
    const mockPool: any = {
      query: async (queryConfig: any, values?: any[]) => {
        const text = typeof queryConfig === 'string' ? queryConfig : queryConfig.text;
        const params = typeof queryConfig === 'string' ? (values || []) : (queryConfig.values || values || []);
        const isArrayMode = typeof queryConfig === 'object' && queryConfig.rowMode === 'array';
        return executeInMemoryQuery(text, params, isArrayMode);
      },
      connect: async () => {
        return {
          query: async (queryConfig: any, values?: any[]) => {
            const text = typeof queryConfig === 'string' ? queryConfig : queryConfig.text;
            const params = typeof queryConfig === 'string' ? (values || []) : (queryConfig.values || values || []);
            const isArrayMode = typeof queryConfig === 'object' && queryConfig.rowMode === 'array';
            return executeInMemoryQuery(text, params, isArrayMode);
          },
          release: () => {},
          on: () => {},
          removeListener: () => {},
        };
      },
      on: () => {},
      end: async () => {},
    };
    return mockPool;
  }

  // 1. Cloud SQL
  if (process.env.SQL_HOST && (process.env.SQL_USER || process.env.SQL_ADMIN_USER) && (process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD)) {
    const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'ai_studio_app_user';
    const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '';
    const host = process.env.SQL_HOST;
    const database = process.env.SQL_DB_NAME || 'cloud_sql_development_database';
    const isSocket = host.startsWith('/');

    const realPool = new Pool({
      host,
      port: parseInt(process.env.SQL_PORT || '5432', 10),
      user,
      password,
      database,
      ssl: isSocket || process.env.SQL_SSL === 'false' ? false : (process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : false),
      connectionTimeoutMillis: 10000,
      max: 10,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    wrapPoolWithInMemoryFallback(realPool);
    return realPool;
  }

  // 2. DATABASE_URL or POSTGRES_URL
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const connectionString = normalizeDatabaseUrl(rawUrl);

  if (connectionString) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const realPool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    wrapPoolWithInMemoryFallback(realPool);
    return realPool;
  }

  // Fallback to local pool wrapped with in-memory fallback
  const realPool = new Pool({
    host: process.env.SQL_HOST || 'localhost',
    port: parseInt(process.env.SQL_PORT || '5432', 10),
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '',
    database: process.env.SQL_DB_NAME || 'youthsmm',
    ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    max: 5,
    idleTimeoutMillis: 30000,
  });
  wrapPoolWithInMemoryFallback(realPool);
  return realPool;
};

// Intercept pool queries so that if external DB is offline or refused, in-memory store serves the request cleanly
function wrapPoolWithInMemoryFallback(poolInstance: any) {
  poolInstance.on('error', (err: any) => {
    if (!dbOfflineWarned) {
      dbOfflineWarned = true;
      console.warn('[DB Pool] External database connection event note:', err?.message || err);
    }
  });

  const originalQuery = poolInstance.query;
  poolInstance.query = (async function (this: any, ...args: any[]) {
    try {
      return await originalQuery.apply(this, args as any);
    } catch (err: any) {
      const isConnectionError =
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === '28P01' ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('Connection terminated unexpectedly') ||
        err?.message?.includes('Client has encountered a connection error');

      if (isConnectionError) {
        if (!dbOfflineWarned) {
          dbOfflineWarned = true;
          console.warn(`[DB Pool] Database is unreachable (${err?.code || err?.message}). Seamlessly serving request via in-memory database store.`);
        }
        const queryConfig = args[0];
        const values = args[1];
        const text = typeof queryConfig === 'string' ? queryConfig : queryConfig.text;
        const params = typeof queryConfig === 'string' ? (values || []) : (queryConfig.values || values || []);
        const isArrayMode = typeof queryConfig === 'object' && queryConfig.rowMode === 'array';
        return executeInMemoryQuery(text, params, isArrayMode);
      }
      throw err;
    }
  } as any);

  const originalConnect = poolInstance.connect;
  poolInstance.connect = (async function (this: any, ...args: any[]) {
    try {
      return await originalConnect.apply(this, args as any);
    } catch (err: any) {
      const isConnectionError =
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ETIMEDOUT' ||
        err?.message?.includes('ECONNREFUSED');

      if (isConnectionError) {
        if (!dbOfflineWarned) {
          dbOfflineWarned = true;
          console.warn(`[DB Pool] Database connection refused. Using in-memory client session.`);
        }
        return {
          query: poolInstance.query,
          release: () => {},
          on: () => {},
          removeListener: () => {},
        };
      }
      throw err;
    }
  } as any);
}

// Create singleton pool instance
const pool = createPool();

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });
