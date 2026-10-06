import type { Collection } from 'mongodb';
import { getDb } from '@/lib/db';
import type { BanterMemory, BanterTrigger } from '@/lib/banter-memory';

export interface StoredBanterMemory {
  id: string;
  text: string;
  speaker: string;
  date: string;
  trigger: BanterTrigger;
  context: string;
  source: 'whatsapp' | 'app';
  sessionId?: string;
  playerId?: string;
  matchNumber?: number;
  createdAt: string;
}

export async function banterCollection(): Promise<Collection<StoredBanterMemory>> {
  const db = await getDb();
  return db.collection<StoredBanterMemory>('banter_memories');
}

export async function getBanterArchive(limit = 250): Promise<StoredBanterMemory[]> {
  const collection = await banterCollection();
  return collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function seedWhatsAppMemories(memories: readonly BanterMemory[]) {
  const collection = await banterCollection();
  if (!memories.length) return { upserted: 0 };
  const result = await collection.bulkWrite(memories.map(memory => ({
    updateOne: {
      filter: { id: memory.id },
      update: { $setOnInsert: { ...memory, source: 'whatsapp' as const, createdAt: new Date().toISOString() } },
      upsert: true,
    },
  })));
  return { upserted: result.upsertedCount };
}
