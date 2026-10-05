import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Player, Group, Session } from './domain';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'fifazugot';
declare global { var mongoPromise: Promise<MongoClient> | undefined; }
export function databaseConfigured() { return Boolean(uri); }
export async function getDb(): Promise<Db> {
  if (!uri) throw new Error('חסר MONGODB_URI. הגדירו חיבור ל-MongoDB Atlas בקובץ הסביבה.');
  if (!global.mongoPromise) global.mongoPromise = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 7000 }).connect();
  try { return (await global.mongoPromise).db(dbName); }
  catch (error) { global.mongoPromise = undefined; throw error; }
}
export async function collections(): Promise<{ players: Collection<Player>; groups: Collection<Group>; sessions: Collection<Session> }> {
  const db=await getDb();
  return {players:db.collection<Player>('players'),groups:db.collection<Group>('groups'),sessions:db.collection<Session>('sessions')};
}
export async function ensureIndexes() {
  const {players,groups,sessions}=await collections();
  await Promise.all([
    players.createIndex({id:1},{unique:true}),
    groups.createIndex({id:1},{unique:true}),
    sessions.createIndex({id:1},{unique:true}),
    sessions.createIndex({status:1,startedAt:-1}),
    sessions.createIndex({status:1},{unique:true,partialFilterExpression:{status:'active'}}),
    sessions.createIndex({date:-1})
  ]);
}
