import { DefaultContext } from 'lib-intercept';
import {
  IHttpContext,
  IHttpServer,
  IMountPoint,
  IRequest,
  IResponse,
  RouteEndpoint
} from '../i.http';

export class HttpContext extends DefaultContext implements IHttpContext {
  private readonly _req: IRequest;
  private readonly _resp: IResponse;
  constructor(
    private readonly _srv: IHttpServer,
    private readonly _route: RouteEndpoint,
    req: IRequest,
    resp: IResponse
  ) {
    super(_route.app.container, _route.activation);
    this._req = _route.mountPointConfig.requestWrapper(req);
    this._resp = _route.mountPointConfig.responseWrapper(resp);
  }

  public getRoute(): RouteEndpoint {
    return this._route;
  }
  public getHost(): IHttpServer {
    return this._srv;
  }
  public getRequest(): IRequest {
    return this._req;
  }
  public getResponse(): IResponse {
    return this._resp;
  }

  public getMountPoint(): IMountPoint {
    return this._route.mountPoint;
  }
}
