import { v4 as uuidv4 } from 'uuid';
import { Context } from 'koa';
import v8 from 'node:v8';

// Store in DB across nodejs processes for full picture in a cluster
let requestCount = 0;
let completedRequests = 0;
const pendingRequests = new Map();

export const getStats = () => {
  return {
    pending: requestCount - completedRequests,
    completed: completedRequests,
    heap: v8.getHeapStatistics(),
  };
};

export const mapRequest = (ctx: Context) => {
  const requestId = uuidv4();
  ctx.state.internalRequestId = requestId;
  pendingRequests.set(requestId, { path: ctx.request.path, at: new Date().getTime() });
  requestCount++;
};

export const unmapRequest = (ctx: Context) => {
  pendingRequests.delete(ctx.state.internalRequestId);
  completedRequests++;
};
