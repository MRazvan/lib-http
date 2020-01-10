import { LogFactory, LogLevel } from 'lib-host';
import { differenceBy, uniqBy } from 'lodash';
import { IHttpServer, RouteEndpoint } from '../i.http';

export function BeforeRouting(allEndpoints: RouteEndpoint[], srv: IHttpServer): RouteEndpoint[] {
  const log = srv.container.get<LogFactory>(LogFactory).createLog('RoutesProcessing');
  // First check to see if we have duplicate routes
  const filteredEndpoints = uniqBy(
    allEndpoints,
    (endpoint: RouteEndpoint) => `${endpoint.type}_${endpoint.calculatedPath}`
  );
  if (log.willLog(LogLevel.Debug)) {
    // If we are in debug log all the duplicate endpoints
    const duplicates = differenceBy(
      allEndpoints,
      filteredEndpoints,
      (endpoint: RouteEndpoint) => `${endpoint.type}_${endpoint.calculatedPath}`
    );
    // Log the duplicates
    duplicates.forEach((endpoint: RouteEndpoint) => {
      log.debug(
        `DUPLICATE ROUTE: [${endpoint.type}] - ${endpoint.calculatedPath} - TARGET : ${endpoint.activation.class.name}.${endpoint.activation.method.name}`
      );
    });
  }
  return filteredEndpoints;
}
