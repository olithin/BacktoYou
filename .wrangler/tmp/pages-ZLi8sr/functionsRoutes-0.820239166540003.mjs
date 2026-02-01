import { onRequest as __api_content_ts_onRequest } from "C:\\Repo\\Fix_Lada\\functions\\api\\content.ts"

export const routes = [
    {
      routePath: "/api/content",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_content_ts_onRequest],
    },
  ]