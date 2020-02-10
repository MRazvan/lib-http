import { IAfterActivation, IBeforeActivation } from 'lib-intercept';
import {
  IHttpRunConfiguration,
  IMountPointConfiguration,
  IRouter,
  RequestWrapper,
  ResponseWrapper,
  RouteCalculation,
  RouteProcessing,
  ServerStarted
} from '../i.http';
import { HttpServerOptions } from './http.server.options';

export class MountPointConfiguration implements IMountPointConfiguration {
  public requestInterceptor: Function | IBeforeActivation;
  public responseInterceptor: Function | IAfterActivation;
  public interceptors: (Function | IBeforeActivation | IAfterActivation)[];
  public routeCalculation: RouteCalculation;
  public requestWrapper: RequestWrapper;
  public responseWrapper: ResponseWrapper;
  public routeProcessing: RouteProcessing;
  public mountPoint: string;

  constructor() {
    this.mountPoint = '/';
    this.routeProcessing = null;
    this.requestInterceptor = null;
    this.responseInterceptor = null;
    this.interceptors = [];
    this.routeCalculation = null;
    this.responseWrapper = null;
    this.requestWrapper = null;
  }
}

export class HttpRunConfiguration implements IHttpRunConfiguration {
  public server: any;
  public options: HttpServerOptions;
  public router: IRouter;
  public startedCallbacks: ServerStarted[];
  public routeProcessing: RouteProcessing;

  constructor() {
    this.routeProcessing = null;
    this.server = null;
    this.options = new HttpServerOptions();
    this.router = null;
    this.startedCallbacks = [];
  }
}
