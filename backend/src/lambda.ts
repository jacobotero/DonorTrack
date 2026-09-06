import serverlessHttp from "serverless-http";
import app from "./app";
import { loadSecrets } from "./loadSecrets";

// Tax letters (PDF/ZIP, tax-letters.ts) and report exports (PDF, reports.ts)
// stream binary responses through Express. Without this option,
// serverless-http's default binary-content-type list is empty, so it
// re-encodes the raw bytes as UTF-8 text instead of base64 — corrupting
// every PDF/ZIP download while leaving JSON responses (the common case)
// unaffected either way. Exported so lambda.test.ts can verify this list
// actually gets applied, not just hardcode its own copy.
export const binaryContentTypes = ["application/pdf", "application/zip", "application/octet-stream"];

const serverlessApp = serverlessHttp(app, { binary: binaryContentTypes });

export const handler = async (event: any, context: any) => {
  await loadSecrets();
  return serverlessApp(event, context);
};
