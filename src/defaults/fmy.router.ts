/* eslint-disable @typescript-eslint/no-empty-function */
import * as fmy from 'find-my-way';
import { ILog } from 'lib-host';
import { defaultsDeep, isEmpty } from 'lodash';
import * as url from 'url';
import { IHttpContext, IHttpServer, IRouter, RouteCallback, RouteEndpoint } from '../i.http';

export class FindMyWayRouter implements IRouter {
  private readonly _router: fmy.Instance<fmy.HTTPVersion.V1>;
  private readonly _defaultRoutes: RouteEndpoint[] = [];
  private _routeCallback: RouteCallback;

  constructor(private readonly _config: Record<string, any>) {
    this._router = fmy(
      defaultsDeep(this._config || {}, {
        caseSensitive: false,
        ignoreTrailingSlash: true,
        defaultRoute: (req: any, res: any) => {
          this.handleDefault(req, res);
        }
      })
    );
  }

  public handleRoutes(req: any, res: any, idx: number): Promise<void> {
    if (idx > this._defaultRoutes.length) {
      // TODO: Throw a custom exception so we can handle it better
      throw new Error('Cannot handle route.');
    }
    return this._routeCallback(this._defaultRoutes[idx], req, res).then((ctx: IHttpContext) => {
      if (!(res.finished || res.headersSent)) {
        return this.handleRoutes(req, res, idx + 1);
      }
    });
  }

  public handleDefault(req: any, res: any): void {
    if (!isEmpty(this._defaultRoutes)) {
      this.handleRoutes(req, res, 0)
        .then(() => {
          if (!res.headersSent && !res.finished) {
            res.statusCode = 500;
            res.statusMessage = 'Cannot find requested route.';
            res.end();
          }
        })
        .catch(err => {
          res.statusCode = 500;
          res.statusMessage = 'Cannot find requested route.';
          res.end(err);
        });
    } else {
      res.statusCode = 500;
      res.statusMessage = 'Cannot find requested route.';
      res.end();
    }
  }

  public setLog(log: ILog): void {}

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
          (req: any, res: any, params: any) => {
            req.params = params;
            req.query = url.parse(req.url, true).query;
            process.nextTick(() => {
              callback(re, req, res);
            });
          }
        );
      }
    });
  }

  public listen(server: IHttpServer): (req: any, resp: any) => any {
    return (req, res) => this._router.lookup(req, res);
  }
}
