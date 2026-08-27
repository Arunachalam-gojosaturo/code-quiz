import type { Request, Response } from 'express';
import app from '../server.ts';

process.env.VERCEL = '1';

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
