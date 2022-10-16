import domain from 'domain';
import * as Sentry from '@sentry/node';
import { extractTraceparentData, stripUrlQueryAndFragment } from '@sentry/tracing';
import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import etag from 'koa-etag';
import helmet from 'koa-helmet';
import Router from 'koa-router';

import config from './config';

if (config.SENTRY_URL) {
  Sentry.init({
    dsn: config.SENTRY_URL,
    tracesSampleRate: 1.0,
  });
}

const eventRecordingMiddleware = (ctx, next) => {
  return new Promise<void>((resolve) => {
    const local = domain.create();
    local.add(ctx);
    local.on('error', (err) => {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
    });
    local.run(async () => {
      Sentry.getCurrentHub().configureScope((scope) =>
        scope.addEventProcessor((event) => Sentry.Handlers.parseRequest(event, ctx.request, { user: true }))
      );
      await next();
      resolve();
    });
  });
};

const tracingMiddleWare = async (ctx, next) => {
  const reqMethod = (ctx.method || '').toUpperCase();
  const reqUrl = ctx.url && stripUrlQueryAndFragment(ctx.url);

  // connect to trace of upstream app
  let traceparentData;
  if (ctx.request.get('sentry-trace')) {
    traceparentData = extractTraceparentData(ctx.request.get('sentry-trace'));
  }

  const transaction = Sentry.startTransaction({
    name: `${reqMethod} ${reqUrl}`,
    op: 'http.server',
    ...traceparentData,
  });

  ctx.__sentry_transaction = transaction;
  await next();

  // if using koa router, a nicer way to capture transaction using the matched route
  if (ctx._matchedRoute) {
    const mountPath = ctx.mountPath || '';
    transaction.setName(`${reqMethod} ${mountPath}${ctx._matchedRoute}`);
  }
  transaction.setHttpStatus(ctx.status);
  transaction.finish();
};

const cacheBustingMiddleware = async (ctx, next) => {
  await next();
  ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  ctx.set('Expires', 0);
};

const api = new Koa();
api.use(bodyParser());
api.use(etag());
api.use(eventRecordingMiddleware);
api.use(tracingMiddleWare);
api.use(cacheBustingMiddleware);
api.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'cdnjs.cloudflare.com',
          'cdn.jsdelivr.net',
          'www.google-analytics.com',
          'www.googletagmanager.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", '*.ingest.sentry.io'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        'frame-ancestors': "'none'",
        'form-action': "'self'",
        'worker-src': ['blob:'],
      },
    },
  })
);

const apiRouter = new Router();

// Request logging
api.use(function (ctx, next) {
  const user = ctx.state.user && ctx.state.user.sub ? ctx.state.user.sub : 'anonymous';
  console.log(`Serving route ${ctx.path} for user ${user}`);
  return next();
});

apiRouter.get('/config', async (ctx: Context) => {
  ctx.body = {
    validAt: new Date().toDateString(),
    ...config,
  };
});

// api.use((ctx, next) => {
//     if (ctx.request.path === '/config') return next();
//     const user = ctx.state.user;
//     if (!user) {
//         ctx.body = { error: 'Unauthorized' };
//         ctx.status = 403;
//         console.log(`JWT validation failed serving request to ${ctx.path} for user: ${JSON.stringify(user)}`);
//         return;
//     } else {
//         ctx.cookies.set(cookieName, ctx.state.rawToken, {
//             overwrite: true,
//             sameSite: 'strict',
//             secure: true,
//         });
//         return next();
//     }
// });

api.use(apiRouter.routes());

const port = process.env.PORT || 3000;
console.log('Running on', port);
api.listen(port, () => {
  console.log(`API Server listening on port ${port}`);
});
