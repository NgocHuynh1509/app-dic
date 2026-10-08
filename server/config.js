export const SERVER_CONFIG = {
  port: Number(process.env.PORT) || 8000,
  maxResultsRows: 100000,
  forceStep: 1.0,
  sensorBroadcastMs: 200,
};
