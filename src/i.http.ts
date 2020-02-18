/* eslint-disable @typescript-eslint/no-empty-function */
import { Container } from 'inversify';
import { IConfig } from 'lib-host';
import { Activation, IAfterActivation, IBeforeActivation, IContext } from 'lib-intercept';
import { ApiAttributeData, HTTPRequestType } from './attributes/api';
import { ControllerAttributeData } from './attributes/controller';
import { HttpModuleData } from './attributes/http.module';

export type RequestWrapper = (request: any) => IRequest;
export type ResponseWrapper = (response: any) => IResponse;
export type RouteCalculation = (
  routeEndpoint: RouteEndpoint,
  mntPoint: IMountPoint,
  srv: IHttpServer
) => string;
export type ServerStarted = (server: Readonly<IHttpServer>) => void;
export type HttpServerConfigurator = (server: Readonly<IHttpServer>) => void;
export type MountPointConfigurator = (
  server: Readonly<IHttpServer>,
  mountPoint: Readonly<IMountPoint>
) => void | Promise<void>;
export type RouteProcessing = (
  routes: RouteEndpoint[],
  mntPoint: IMountPoint,
  srv: IHttpServer
) => RouteEndpoint[];

export enum HTTPServerType {
  HTTP,
  HTTP2
}
export const HTTPServerTypeString: { [id: string]: HTTPServerType } = {
  http: HTTPServerType.HTTP,
  http2: HTTPServerType.HTTP2
};

export interface IMountPointConfiguration {
  requestInterceptor: Function | IBeforeActivation;
  responseInterceptor: Function | IAfterActivation;
  interceptors: (Function | IBeforeActivation | IAfterActivation)[];
  routeCalculation: RouteCalculation;
  requestWrapper: RequestWrapper;
  responseWrapper: ResponseWrapper;
  routeProcessing: RouteProcessing;
  mountPoint: string;
}

export class RouteEndpoint {
  public type: HTTPRequestType;
  public controllerAttribute: ControllerAttributeData;
  public apiAttribute: ApiAttributeData;
  public activation: Activation;
  public calculatedPath: string;
  public app: HttpApplicationData;
  public isDefault: boolean;
  public mountPoint: IMountPoint;
  public mountPointConfig: IMountPointConfiguration;
  // Data stored by interceptors specific for this route and kept during / between activations
  public routeData: { [key: string]: any };
  constructor(data: Partial<RouteEndpoint>) {
    Object.assign(this, data);
  }
}

export class RouteScanner {
  protected server: IHttpServer;
  protected mountPoint: IMountPoint;
  public setServer(srv: IHttpServer): void {
    this.server = srv;
  }
  public setMountPoint(mp: IMountPoint): void {
    this.mountPoint = mp;
  }
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
  end(data?: any): void;
  headers(): IHeaders;
  sendHeaders(): void;
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
  setCertificates(cert: string, pvk: string): IHttpServerOptions;
}

export class HttpApplicationData {
  public routes: RouteEndpoint[];
  public initialized = false;
  constructor(
    public container: Container,
    public target: Function | Record<string, any>,
    public module: HttpModuleData,
    public mountPoint: IMountPoint
  ) {
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
  getMountPoint(): IMountPoint;
}

export declare type RouteCallback = (
  endpoint: RouteEndpoint,
  req: any,
  resp: any
) => Promise<IContext>;
export interface IRouter {
  route(server: IHttpServer, routeEndpoints: RouteEndpoint[], callback: RouteCallback): void;
  listen(server: IHttpServer): (req: any, resp: any) => void;
}

export interface IHttpRunConfiguration {
  router: IRouter; // For routing
  startedCallbacks: ServerStarted[];
  server: any;
  options: IHttpServerOptions;
  routeProcessing: RouteProcessing;
}

export interface IMountPoint {
  configuration: IMountPointConfiguration;
  applications: HttpApplicationData[];
  container: Container;
  configure(configurator: MountPointConfigurator): IMountPoint;
  addModule(app: Function | Record<string, any>, config?: Record<string, any>): IMountPoint;
  addGlobalInterceptor(interceptor: Function | IBeforeActivation | IAfterActivation): IMountPoint;
  setMountPoint(mountPoint: string): IMountPoint;
  clearInterceptors(): IMountPoint;
  setData(key: string, data: any): IMountPoint;
  getData<T>(key: string, defaults?: any): T;
}

export interface IHttpServer {
  runConfiguration: IHttpRunConfiguration;
  config: IConfig;
  container: Container;
  rootMountPoint: IMountPoint;
  mountPoints: IMountPoint[];
  configure(configurator: MountPointConfigurator): IHttpServer;
  addModule(app: Function | Record<string, any>, config?: Record<string, any>): IHttpServer;
  addGlobalInterceptor(interceptor: Function | IBeforeActivation | IAfterActivation): IHttpServer;
  onStarted(started: ServerStarted): IHttpServer;
  setMountPoint(point: string): IHttpServer;
  addMountPoint(point: string, configurator: MountPointConfigurator): IHttpServer;
  setData(key: string, data: any): IHttpServer;
  getData<T>(key: string, defaults?: any): T;
}
