import { Context } from 'koa';
import { getStats } from './utils/health';

export const status = async (ctx: Context) => {
  ctx.body = {
    validAt: new Date().getTime(),
    status: 'OK',
    stats: getStats(),
  };
  return ctx.status = 200;
};
