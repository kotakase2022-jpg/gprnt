import "server-only";

import { ApiTerrastConnector, type TerrastApiTransport } from "./api-connector";

/**
 * Server-only environment boundary for TERRAST credentials. The verified API
 * adapter remains mandatory because no real endpoint or auth contract was
 * supplied for this MVP.
 */
export function createApiTerrastConnectorFromEnvironment(
  transport?: TerrastApiTransport,
): ApiTerrastConnector {
  return new ApiTerrastConnector({
    baseUrl: process.env.TERRAST_API_BASE_URL,
    apiKey: process.env.TERRAST_API_KEY,
    ...(transport ? { transport } : {}),
  });
}
