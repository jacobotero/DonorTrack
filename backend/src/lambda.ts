import serverlessHttp from "serverless-http";
import app from "./app";
import { loadSecrets } from "./loadSecrets";

const serverlessApp = serverlessHttp(app, {
  binary: ["application/json"],
});

export const handler = async (event: any, context: any) => {
  await loadSecrets();
  return serverlessApp(event, context);
};
