/* eslint-disable @typescript-eslint/no-empty-function */
import * as fmy from 'find-my-way';
import { IncomingMessage, ServerResponse } from 'http';
import { ILog } from 'lib-host';
import { defaultsDeep } from 'lodash';
import * as url from 'url';
import { IHttpServer, IRouter, RouteCallback, RouteEndpoint } from '../i.http';

export class FindMyWayRouter implements IRouter {
  private _log: ILog;
  private readonly _router: fmy.Instance<fmy.HTTPVersion.V1>;
  private readonly _defaultRoutes: RouteEndpoint[] = [];
  private _routeCallback: RouteCallback;

  constructor(private readonly _config: Record<string, any>) {
    this._router = fmy(
      defaultsDeep(this._config || {}, {
        defaultRoute: this.handleDefault.bind(this)
      })
    );
  }

  public async handleDefault(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      for (const handler of this._defaultRoutes) {
        const canHandle =
          handler.apiAttribute.type === req.method || handler.apiAttribute.type === '*';
        if (canHandle) {
          await this._routeCallback(handler, req, res);
        }
      }
      if (res.finished || res.headersSent) {
        return;
      }
    } catch (err) {
      this._log &&
        this._log.error(`Error handling default request ${req.method}  - ${req.url}`, err);
    }
    if (res.finished || res.headersSent) {
      return;
    }
    this._log && this._log.warn(`Default handler for route ${req.method}  - ${req.url} not found`);

    res.statusCode = 404;
    res.end(null, null, null);
  }

  public setLog(log: ILog): void {
    this._log = log;
  }

  private _routeHandler(req: any, resp: any, params: any, re: RouteEndpoint): void {
    req.params = params;
    if (req.url.indexOf('?') > 0) {
      req.query = url.parse(req.url, true).query;
    }
    this._routeCallback(re, req, resp);
  }

  public route(
    httpserver: IHttpServer,
    routeEndpoints: RouteEndpoint[],
    callback: RouteCallback
  ): void {
    this._routeCallback = callback;
    const handler = this._routeHandler.bind(this);
    routeEndpoints.forEach(re => {
      if (re.isDefault) {
        this._defaultRoutes.push(re);
      } else {
        this._router.on(re.type as fmy.HTTPMethod, re.calculatedPath, handler, re);
      }
    });
  }

  public listen(server: IHttpServer): (req: any, resp: any) => any {
    return this._router.lookup.bind(this._router);
  }
}
