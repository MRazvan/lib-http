import { isEmpty, trim, trimEnd } from 'lodash';
import { IHttpServer, IMountPoint, RouteEndpoint } from '../i.http';

export function routeCalculator(
  routeEndpoint: RouteEndpoint,
  mntPoint: IMountPoint,
  srv: IHttpServer
): string {
  // Start with the server mount point
  let result = trim(mntPoint.configuration.mountPoint || '', '/');

  const controller = trim(routeEndpoint.controllerAttribute.path, '/');
  const path = trim(routeEndpoint.apiAttribute.path, '/');

  if (!isEmpty(controller)) {
    result += `/${controller}`;
  }
  if (!isEmpty(path)) {
    result += `/${path}`;
  }
  if (isEmpty(result)) {
    result = '/';
  }
  result = result !== '/' ? trimEnd(result, '/') : result;
  if (!result.startsWith('/')) {
    result = '/' + result;
  }
  return result;
}
