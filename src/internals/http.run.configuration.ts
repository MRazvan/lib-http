import { IAfterActivation, IBeforeActivation } from 'lib-intercept';
import {
  IHttpRunConfiguration,
  IRouter,
  RequestWrapper,
  ResponseWrapper,
  RouteCalculation,
  RouteProcessing,
  ServerStarted
} from '../i.http';
import { HttpServerOptions } from './http.server.options';

export class HttpRunConfiguration implements IHttpRunConfiguration {
  public requestInterceptor: Function | IBeforeActivation;
  public responseInterceptor: Function | IAfterActivation;
  public server: any;
  public interceptors: (Function | IBeforeActivation | IAfterActivation)[];
  public options: HttpServerOptions;
  public routeCalculation: RouteCalculation;
  public requestWrapper: RequestWrapper;
  public responseWrapper: ResponseWrapper;
  public router: IRouter;
  public startedCallbacks: ServerStarted[];
  public routeProcessing: RouteProcessing;

  constructor() {
    this.routeProcessing = null;
    this.requestInterceptor = null;
    this.responseInterceptor = null;
    this.server = null;
    this.interceptors = [];
    this.options = new HttpServerOptions();
    this.routeCalculation = null;
    this.responseWrapper = null;
    this.requestWrapper = null;
    this.router = null;
    this.startedCallbacks = [];
  }
}
