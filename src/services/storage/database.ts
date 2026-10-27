
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'pizza_mya.db';
const DATABASE_VERSION = 1;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrirBaseDatos(): Promise<SQLite.SQLiteDatabase> {
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
