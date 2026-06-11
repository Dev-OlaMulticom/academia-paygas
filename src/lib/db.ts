// Simple localStorage-based database for CRUD operations
// This is a temporary solution. For production, use a real database.

const DB_PREFIX = 'academia_paygas_'

interface DBRecord {
  id: string
  [key: string]: any
}

class LocalDB {
  private getCollectionKey(collection: string): string {
    return `${DB_PREFIX}${collection}`
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Get all records from a collection
  getAll(collection: string): DBRecord[] {
    const key = this.getCollectionKey(collection)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  // Get a single record by id
  getById(collection: string, id: string): DBRecord | null {
    const records = this.getAll(collection)
    return records.find(r => r.id === id) || null
  }

  // Create a new record
  create(collection: string, data: Omit<DBRecord, 'id'>): DBRecord {
    const records = this.getAll(collection)
    const newRecord = { ...data, id: this.generateId() }
    records.push(newRecord)
    localStorage.setItem(this.getCollectionKey(collection), JSON.stringify(records))
    return newRecord
  }

  // Update a record
  update(collection: string, id: string, data: Partial<DBRecord>): DBRecord | null {
    const records = this.getAll(collection)
    const index = records.findIndex(r => r.id === id)
    if (index === -1) return null
    records[index] = { ...records[index], ...data }
    localStorage.setItem(this.getCollectionKey(collection), JSON.stringify(records))
    return records[index]
  }

  // Delete a record
  delete(collection: string, id: string): boolean {
    const records = this.getAll(collection)
    const filtered = records.filter(r => r.id !== id)
    if (filtered.length === records.length) return false
    localStorage.setItem(this.getCollectionKey(collection), JSON.stringify(filtered))
    return true
  }

  // Find records by filter
  find(collection: string, filter: (record: DBRecord) => boolean): DBRecord[] {
    const records = this.getAll(collection)
    return records.filter(filter)
  }

  // Clear a collection
  clear(collection: string): void {
    localStorage.removeItem(this.getCollectionKey(collection))
  }

  // Initialize with seed data
  seed(collection: string, data: DBRecord[]): void {
    const existing = this.getAll(collection)
    if (existing.length === 0) {
      localStorage.setItem(this.getCollectionKey(collection), JSON.stringify(data))
    }
  }
}

export const db = new LocalDB()

// Initialize seed data
export function initSeedData() {
  // Seed users if empty
  db.seed('users', [
    { id: '1', nome: 'Admin PayGas', email: 'admin@paygas.com.br', senha: '123456', role: 'ADMIN', xp: 8500, lastLogin: new Date().toISOString() },
    { id: '2', nome: 'Gestor de Posto', email: 'gestor@paygas.com.br', senha: '123456', role: 'GESTOR', xp: 4100, lastLogin: new Date().toISOString() },
    { id: '3', nome: 'Atendente', email: 'atendente@paygas.com.br', senha: '123456', role: 'ATENDENTE', xp: 2400, lastLogin: new Date().toISOString() },
  ])

  // Seed tracks if empty
  db.seed('tracks', [])

  // Seed modules if empty
  db.seed('modules', [])

  // Seed lessons if empty
  db.seed('lessons', [])

  // Seed notifications if empty
  db.seed('notifications', [])

  // Seed certificates if empty
  db.seed('certificates', [])

  // Seed progress if empty
  db.seed('progress', [])
}
