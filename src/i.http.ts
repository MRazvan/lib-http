/* eslint-disable @typescript-eslint/no-empty-function */
import { Container } from 'inversify';
import { IConfig } from 'lib-host';
import { Activation, IAfterActivation, IBeforeActivation, IContext } from 'lib-intercept';
import { ApiAttributeData, HTTPRequestType } from './attributes/api';
import { ControllerAttributeData } from './attributes/controller';
import { HttpModuleData } from './attributes/http.module';

export type RequestWrapper = (request: any) => IRequest;
export type ResponseWrapper = (response: any) => IResponse;
export type RouteCalculation = (routeEndpoint: RouteEndpoint, srv: IHttpServer) => string;
export type ServerStarted = (server: Readonly<IHttpServer>) => void;
export type HttpServerConfigurator = (server: Readonly<IHttpServer>) => void;
export type RouteProcessing = (routes: RouteEndpoint[], srv: IHttpServer) => RouteEndpoint[];

export enum HTTPServerType {
  HTTP,
  HTTP2
}
export const HTTPServerTypeString: { [id: string]: HTTPServerType } = {
  http: HTTPServerType.HTTP,
  http2: HTTPServerType.HTTP2
};

export class RouteEndpoint {
  public type: HTTPRequestType;
  public controllerAttribute: ControllerAttributeData;
  public apiAttribute: ApiAttributeData;
  public activation: Activation;
  public calculatedPath: string;
  public app: HttpApplicationData;
  public isDefault: boolean;
  // Data stored by interceptors specific for this route and kept during / between activations
  public routeData: { [key: string]: any };
  constructor(data: Partial<RouteEndpoint>) {
    Object.assign(this, data);
  }
}

export class RouteScanner {
  public addInterceptor(interceptor: Function | IBeforeActivation | IAfterActivation): void {}
  public addClass(target: Function): void {}
  public generateRoutes(container: Container): RouteEndpoint[] {
    return [];
  }
}

export interface IHeaders {
  [header: string]: number | string | string[] | undefined;
}

export interface IHttpMethodInterceptor {
  method: string;
  handler: (req: any, resp: any) => Promise<any>;
}

export interface IRequest {
  param(name?: string): any;
  query(name?: string): any;
  body(name?: string): any;
  header(name?: string): any;
  cookies(): Map<string, string>;
  getRaw(): any;
}

export interface IResponse {
  isFinished(): boolean;
  setStatus(statusCode: number, statusMessage: string): void;
  sendStatus(statuscode: number, text?: string): void;
  send(data?: any): void;
  headers(): IHeaders;
  setHeaders(): void;
  cookies(): Map<string, string>;
  getRaw(): any;
}

export interface IHttpServerOptions {
  type: HTTPServerType;
  port: number;
  host: string;
  mountPoint: string;
  privateKey: string;
  certificate: string;
  setMountPoint(mountPoint: string): IHttpServerOptions;
  setPort(port: number): IHttpServerOptions;
  setHost(host: string): IHttpServerOptions;
  setType(type: HTTPServerType): IHttpServerOptions;
  setCertificates(cert: string, pvk: string): IHttpServerOptions;
}

export class HttpApplicationData {
  public routes: RouteEndpoint[];
  public initialized = false;
  constructor(public container: Container, public target: Function, public module: HttpModuleData) {
    this.routes = [];
  }
}

export type Headers = {
  [header: string]: number | string | string[] | undefined;
};

export interface IHttpContext extends IContext {
  getRoute(): RouteEndpoint;
  getHost(): IHttpServer;
  getRequest(): IRequest;
  getResponse(): IResponse;
}

export declare type RouteCallback = (
  endpoint: RouteEndpoint,
  req: any,
  resp: any,
  next?: any
) => Promise<IHttpContext>;
export interface IRouter {
  route(server: IHttpServer, routeEndpoints: RouteEndpoint[], callback: RouteCallback): void;
  listen(server: IHttpServer): (req: any, resp: any) => void;
}

export interface IHttpRunConfiguration {
  routeCalculation: RouteCalculation;
  requestInterceptor: Function | IBeforeActivation; // First interceptor to execute (different from the list of interceptors)
  responseInterceptor: Function | IAfterActivation; // Last interceptor to execute (different from the list of interceptors)
  requestWrapper: RequestWrapper; // For wrapping http requests
  responseWrapper: ResponseWrapper; // For wrapping http responses
  router: IRouter; // For routing
  startedCallbacks: ServerStarted[];
  server: any;
  interceptors: (Function | IBeforeActivation | IAfterActivation)[];
  options: IHttpServerOptions;
  routeProcessing: RouteProcessing;
}

export interface IHttpServer {
  container: Container;
  runConfiguration: IHttpRunConfiguration;
  applications: HttpApplicationData[];
  config: IConfig;

  configure(configurator: HttpServerConfigurator): IHttpServer;
  addModule(app: Function, config?: Record<string, any>): IHttpServer;
  addGlobalInterceptor(interceptor: Function | IBeforeActivation | IAfterActivation): IHttpServer;
  setStartedCallback(started: ServerStarted): IHttpServer;
}
