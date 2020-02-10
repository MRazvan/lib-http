/* eslint-disable @typescript-eslint/no-empty-function */
import * as fmy from 'find-my-way';
import { IncomingMessage, ServerResponse } from 'http';
import { ILog } from 'lib-host';
import { defaultsDeep } from 'lodash';
import * as url from 'url';
import { IHttpServer, IRouter, RouteCallback, RouteEndpoint } from '../i.http';
import { EmptyWrap } from '../utils';

export class FindMyWayRouter implements IRouter {
  private _log: ILog;
  private readonly _router: fmy.Instance<fmy.HTTPVersion.V1>;
  private readonly _defaultRoutes: RouteEndpoint[] = [];
  private _routeCallback: RouteCallback;

  constructor(private readonly _config: Record<string, any>) {
    this._router = fmy(
      defaultsDeep(this._config || {}, {
        defaultRoute: (req: any, res: any) => {
          this.handleDefault(req, res);
        }
      })
    );
  }

  public async handleDefault(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      for (const handler of this._defaultRoutes) {
        const shouldHandle =
          handler.apiAttribute.type === req.method || handler.apiAttribute.type === '*';
        if (shouldHandle) {
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

    res.statusCode = 500;
    res.end();
  }

  public setLog(log: ILog): void {
    this._log = log;
  }

  private _routeHandler(req: any, resp: any, params: any, re: RouteEndpoint): void {
    req.params = params;
    if (req.url.indexOf('?') > 0) {
      req.query = url.parse(req.url, true).query;
    }
    this._routeCallback(re, req, resp, EmptyWrap);
  }

  public route(
    httpserver: IHttpServer,
    routeEndpoints: RouteEndpoint[],
    callback: RouteCallback
  ): void {
    this._routeCallback = callback;

    routeEndpoints.forEach(re => {
      if (re.isDefault) {
        this._defaultRoutes.push(re);
      } else {
        this._router.on(
          re.type as fmy.HTTPMethod,
          re.calculatedPath,
          this._routeHandler.bind(this),
          re
        );
      }
    });
  }

  public listen(server: IHttpServer): (req: any, resp: any) => any {
    return this._router.lookup.bind(this._router);
  }
}
