import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix querySrv ECONNREFUSED on environments (such as Windows local DNS 127.0.0.1 or restricted router resolvers)
// where DNS SRV records cannot be resolved.
if (typeof dns.setServers === 'function') {
  try {
    const servers = dns.getServers();
    if (servers.includes('127.0.0.1') || servers.length === 0) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
  } catch {
    // Ignore in environments where setting DNS servers is not permitted
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = (async () => {
      try {
        const mongooseInstance = await mongoose.connect(MONGODB_URI, opts);
        console.log('[DB] Connected to MongoDB Atlas');
        return mongooseInstance;
      } catch (err: unknown) {
        const dnsErr = err as { code?: string; syscall?: string };
        if (dnsErr?.code === 'ECONNREFUSED' || dnsErr?.syscall === 'querySrv') {
          console.warn('[DB] MongoDB SRV DNS lookup failed. Retrying with Google/Cloudflare DNS...');
          try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
            const retryInstance = await mongoose.connect(MONGODB_URI, opts);
            console.log('[DB] Connected to MongoDB Atlas (via public DNS fallback)');
            return retryInstance;
          } catch (retryErr) {
            throw retryErr;
          }
        }
        throw err;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
