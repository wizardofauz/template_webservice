const env = process.env.NODE_ENV;
const release = process.env.RELEASE;

const SENTRY_URL = process.env.SENTRY_URL;
if (!SENTRY_URL) {
  console.warn('Sentry ULR not provided - tracing and exception recording disabled');
}

// TODO: File handling for config

export default {
  release,
  env,
  SENTRY_URL,
};
