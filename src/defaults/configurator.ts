import { LogFactory } from 'lib-host';
import { IHttpServer, RouteScanner } from '../i.http';
import { BeforeRouting } from './before.routing';
import { ControllerScanner } from './controller.scanner';
import { FindMyWayRouter } from './fmy.router';
import { ResultInterceptor } from './result.interceptor';
import { routeCalculator } from './route.calculator';
import { RequestWrapper } from './wrapper.request';
import { ResponseWrapper } from './wrapper.response';

export function DefaultConfigurator(server: Readonly<IHttpServer>): void {
  const container = server.container;
  const routerConfig = server.config ? server.config.get<Record<string, any>>('router_config') : {};
  const router = new FindMyWayRouter(routerConfig);
  router.setLog(container.get<LogFactory>(LogFactory).createLog('FindMyWayRouter'));
  server.runConfiguration.router = router;
  server.runConfiguration.routeProcessing = (routes, mountPoint, srv) => routes;
  server.rootMountPoint.configuration.routeCalculation = routeCalculator;
  server.rootMountPoint.configuration.responseInterceptor = new ResultInterceptor();
  server.rootMountPoint.configuration.requestWrapper = RequestWrapper;
  server.rootMountPoint.configuration.responseWrapper = ResponseWrapper;
  server.rootMountPoint.configuration.routeProcessing = BeforeRouting;

  // Register the default controller scanner
  if (!container.isBound(RouteScanner)) {
    container.bind(RouteScanner).to(ControllerScanner);
  }
}
