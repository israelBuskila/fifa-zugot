import { banterMemories } from '../src/lib/banter-memory';
import { getDb } from '../src/lib/db';

async function main() {
  const db = await getDb();
  const archive = db.collection('banter_memories');
  const sessions = db.collection('sessions');

  const whatsappOps = banterMemories.map(memory => ({
    updateOne: {
      filter: { id: memory.id },
      update: { $setOnInsert: { ...memory, source: 'whatsapp', createdAt: new Date().toISOString() } },
      upsert: true,
    },
  }));
  if (whatsappOps.length) await archive.bulkWrite(whatsappOps);

  const nights = await sessions.find({ 'quotes.0': { $exists: true } }).toArray();
  const quoteOps = nights.flatMap(night => (night.quotes ?? []).map((quote: any) => ({
    updateOne: {
      filter: { id: `app-${night.id}-${quote.id}` },
      update: { $setOnInsert: {
        id: `app-${night.id}-${quote.id}`,
        text: quote.text,
        speaker: quote.playerId,
        date: quote.createdAt,
        trigger: 'archive',
        context: `${night.title} · לפני משחק ${quote.matchNumber}`,
        source: 'app',
        sessionId: night.id,
        playerId: quote.playerId,
        matchNumber: quote.matchNumber,
        createdAt: quote.createdAt,
      }},
      upsert: true,
    },
  })));
  if (quoteOps.length) await archive.bulkWrite(quoteOps);

  await archive.createIndex({ id: 1 }, { unique: true });
  await archive.createIndex({ source: 1, createdAt: -1 });
  await archive.createIndex({ trigger: 1, createdAt: -1 });

  console.log(`Unified banter archive ready: ${await archive.countDocuments()} memories.`);
  process.exit(0);
}
main().catch(error => { console.error(error); process.exit(1); });
