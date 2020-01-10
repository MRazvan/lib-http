import { DefaultContext } from 'lib-intercept';
import { IHttpContext, IHttpServer, IRequest, IResponse, RouteEndpoint } from '../i.http';

export class HttpContext extends DefaultContext implements IHttpContext {
  constructor(
    private readonly _srv: IHttpServer,
    private readonly _route: RouteEndpoint,
    private readonly _req: IRequest,
    private readonly _resp: IResponse
  ) {
    super(_route.app.container, _route.activation);
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
}
