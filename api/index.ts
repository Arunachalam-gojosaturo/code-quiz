import type { Request, Response } from 'express';

process.env.VERCEL = '1';
const { default: app } = await import('../server');

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
