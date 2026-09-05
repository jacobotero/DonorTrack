import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({});

// Maps the *_PARAM env var (holding an SSM parameter name, set by CDK) to
// the plain env var the rest of the app already reads.
const SECRET_ENV_MAP: Record<string, string> = {
  DATABASE_URL_PARAM: "DATABASE_URL",
  JWT_SECRET_PARAM: "JWT_SECRET",
  RESEND_API_KEY_PARAM: "RESEND_API_KEY",
  SENTRY_DSN_PARAM: "SENTRY_DSN",
};

let loaded = false;

/**
 * Fetches each configured secret from SSM Parameter Store once per Lambda
 * execution environment (cached across warm invocations via the `loaded`
 * flag at module scope), and assigns it to the plain env var name the rest
 * of the app reads. Only parameters whose *_PARAM env var is actually set
 * are fetched, so this is a no-op for anything not wired up in CDK yet.
 */
export async function loadSecrets(): Promise<void> {
  if (loaded) return;

  const entries = Object.entries(SECRET_ENV_MAP).filter(
    ([paramEnvVar]) => process.env[paramEnvVar],
  );

  await Promise.all(
    entries.map(async ([paramEnvVar, targetEnvVar]) => {
      const parameterName = process.env[paramEnvVar]!;
      const result = await client.send(
        new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
      );
      if (result.Parameter?.Value) {
        process.env[targetEnvVar] = result.Parameter.Value;
      }
    }),
  );

  loaded = true;
}
