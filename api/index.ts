import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../dist/server/index'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
