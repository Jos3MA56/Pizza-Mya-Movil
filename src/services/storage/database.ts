
import type * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'pizza_mya.db';
const DATABASE_VERSION = 2;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrirBaseDatos(): Promise<SQLite.SQLiteDatabase> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const version = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  const versionActual = version?.user_version ?? 0;

  if (versionActual > DATABASE_VERSION) {
    throw new Error('La base de datos utiliza una versión más reciente.');
  }

  if (versionActual < 1) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS comandas_locales (
          id_local TEXT PRIMARY KEY NOT NULL,
          id_servidor TEXT,
          mesa_id TEXT NOT NULL,
          mesero_id TEXT NOT NULL,
          estado_sync TEXT NOT NULL DEFAULT 'BORRADOR',
          version_servidor INTEGER,
          creada_en TEXT NOT NULL,
          actualizada_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS comanda_items_locales (
          id_local TEXT PRIMARY KEY NOT NULL,
          comanda_id TEXT NOT NULL,
          producto_id TEXT NOT NULL,
          variante_id TEXT,
          nombre_producto TEXT NOT NULL,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio_centavos INTEGER NOT NULL,
          personalizacion_json TEXT,
          notas TEXT,
          FOREIGN KEY (comanda_id)
            REFERENCES comandas_locales(id_local)
        );

        CREATE TABLE IF NOT EXISTS operaciones_pendientes (
          id_operacion TEXT PRIMARY KEY NOT NULL,
          comanda_id TEXT NOT NULL,
          mesero_id TEXT NOT NULL,
          tipo TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'PENDIENTE',
          intentos INTEGER NOT NULL DEFAULT 0,
          proximo_intento_en TEXT,
          ultimo_error TEXT,
          creada_en TEXT NOT NULL,
          FOREIGN KEY (comanda_id)
            REFERENCES comandas_locales(id_local)
        );

        CREATE INDEX IF NOT EXISTS idx_operaciones_estado
          ON operaciones_pendientes(estado, proximo_intento_en);
      `);

      await tx.execAsync('PRAGMA user_version = 1;');
    });
  }

  if (versionActual < 2) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(`
        ALTER TABLE comandas_locales ADD COLUMN folio_confirmado TEXT;
        ALTER TABLE comandas_locales ADD COLUMN total_confirmado_centavos INTEGER;
        CREATE TABLE pedidos_mvvm (
          id TEXT PRIMARY KEY NOT NULL, mesa INTEGER NOT NULL,
          usuario TEXT NOT NULL, estado TEXT NOT NULL, documento TEXT NOT NULL
        );
        CREATE UNIQUE INDEX pedido_mesa_abierta ON pedidos_mvvm(mesa) WHERE estado != 'cancelado';
        CREATE TABLE catalogo_cache (id INTEGER PRIMARY KEY CHECK(id = 1), documento TEXT NOT NULL, fecha TEXT NOT NULL);
        CREATE TABLE cocina_demo (id TEXT PRIMARY KEY NOT NULL, documento TEXT NOT NULL, estado TEXT NOT NULL CHECK(estado IN ('pendiente','en_preparacion','listo')));
        CREATE TABLE preparaciones_mvvm (pedido_id TEXT PRIMARY KEY NOT NULL REFERENCES pedidos_mvvm(id), request_id TEXT UNIQUE NOT NULL, documento TEXT NOT NULL, motivo TEXT NOT NULL);
        CREATE TABLE demo_envios (id TEXT PRIMARY KEY NOT NULL, origen TEXT UNIQUE NOT NULL, usuario TEXT NOT NULL, documento TEXT NOT NULL, estado TEXT NOT NULL, intentos INTEGER NOT NULL DEFAULT 0, siguiente INTEGER NOT NULL DEFAULT 0, remoto TEXT);
        CREATE TABLE demo_recibos (id TEXT PRIMARY KEY NOT NULL, documento TEXT NOT NULL);
        PRAGMA user_version = 2;
      `);
    });
  }
  return db;
}

export function obtenerBaseDatos(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = abrirBaseDatos().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

// Expo abre conexiones exclusivas para escribir. Serializar las transacciones de
// la app evita SQLITE_BUSY al pulsar dos veces o competir con el procesador LAN.
let escrituraAnterior: Promise<void> = Promise.resolve();
export async function transaccionLocal(
  db: SQLite.SQLiteDatabase,
  trabajo: Parameters<SQLite.SQLiteDatabase['withExclusiveTransactionAsync']>[0],
): Promise<void> {
  const anterior = escrituraAnterior;
  let liberar!: () => void;
  escrituraAnterior = new Promise<void>(resolve => { liberar = resolve; });
  await anterior;
  try { await db.withExclusiveTransactionAsync(trabajo); }
  finally { liberar(); }
}
