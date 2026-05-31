import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Páginas de estaciones
  route("/biopetrol", "./routes/bioPetrol.tsx"),
  route("/genex", "./routes/genex.tsx"),
  route("/electrico", "./routes/evCharging.tsx"),
  route("/agencias", "./routes/agencias.tsx"),
  // APIs internas (server-side scraping)
  route("/api/biopetrol", "./routes/api/getBioPetrol.ts"),
  route("/api/genex", "./routes/api/getGenex.ts"),
  route("/api/evcharging", "./routes/api/getEvCharging.ts"),
  route("/api/tts", "./routes/api/tts.ts"),
] satisfies RouteConfig;
