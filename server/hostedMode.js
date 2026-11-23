const truthyEnvironmentValue = (value) => ['1', 'true'].includes(String(value || '').toLowerCase());

// Render and Vercel host the API away from the user's machine. Never expose
// routes that inspect or execute against the server's local filesystem there.
export const isHostedEnvironment = () =>
  truthyEnvironmentValue(process.env.RENDER) || truthyEnvironmentValue(process.env.VERCEL);

export function localMachineOnly(req, res, next) {
  if (isHostedEnvironment()) {
    return res.status(403).json({
      success: false,
      error: 'This local-machine feature is unavailable on the hosted service.',
    });
  }
  return next();
}
