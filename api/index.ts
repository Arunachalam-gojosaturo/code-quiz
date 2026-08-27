import type { Request, Response } from 'express';

process.env.VERCEL = '1';

export default async function handler(req: Request, res: Response) {
  const { default: app } = await import('../server.ts');
  return app(req, res);
}
