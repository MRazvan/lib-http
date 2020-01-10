import { get, isNil } from 'lodash';
import { IRequest } from '../i.http';

export class HttpRequestWrapper implements IRequest {
  constructor(private readonly _req: any) {}

  public param(name?: string): any {
    return isNil(name) ? this._req.params : get(this._req.params || {}, name);
  }

  public query(name?: string): any {
    return isNil(name) ? this._req.query : get(this._req.query || {}, name);
  }

  public body(name?: string): any {
    return isNil(name) ? this._req.body : get(this._req.body || {}, name);
  }

  public header(name?: string): any {
    return this._req.headers[name];
  }

  public cookies(): Map<string, string> {
    return this._req.cookies;
  }

  public getRaw(): any {
    return this._req;
  }
}

export function RequestWrapper(req: any): IRequest {
  return new HttpRequestWrapper(req);
}
