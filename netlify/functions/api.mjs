import serverless from "serverless-http";

if (!process.env.SERVE_FRONTEND) {
  process.env.SERVE_FRONTEND = "false";
}

const { app } = await import("../../backend/src/app.js");
const expressHandler = serverless(app, {
  basePath: "/.netlify/functions/api"
});

export const handler = async (event, context) => {
  return expressHandler(event, context);
};
