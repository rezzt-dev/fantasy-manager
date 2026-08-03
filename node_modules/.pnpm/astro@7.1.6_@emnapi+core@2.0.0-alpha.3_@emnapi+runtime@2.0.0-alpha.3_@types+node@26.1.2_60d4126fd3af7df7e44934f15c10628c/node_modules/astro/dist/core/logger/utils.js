import { fileURLToPath } from "node:url";
const COMPOSE_LOGGER_ENTRYPOINT = "astro/logger/compose";
function normalizeLoggerConfig(logger) {
  const entrypoint = normalizeEntrypoint(logger.entrypoint);
  if (entrypoint === COMPOSE_LOGGER_ENTRYPOINT) {
    const loggers = logger.config?.loggers ?? [];
    return {
      entrypoint,
      loggers: loggers.map((nested) => normalizeLoggerConfig(nested))
    };
  }
  return { entrypoint, config: logger.config };
}
function normalizeEntrypoint(entrypoint) {
  return entrypoint instanceof URL ? fileURLToPath(entrypoint) : entrypoint;
}
export {
  COMPOSE_LOGGER_ENTRYPOINT,
  normalizeLoggerConfig
};
