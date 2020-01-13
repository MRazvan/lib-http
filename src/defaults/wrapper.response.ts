import * as http from 'http';
import { isNil, isObjectLike } from 'lodash';
import { IHeaders, IResponse } from '../i.http';

export class HttpResponseWrapper implements IResponse {
  private readonly _headers: Record<string, any> = {};
  private readonly _cookies: Map<string, string> = new Map();

  constructor(private readonly _resp: http.ServerResponse) {}
  public isFinished(): boolean {
    return this._resp.headersSent || this._resp.finished;
  }

  public setStatus(statusCode: number, statusMessage: string): void {
    this._resp.statusMessage = statusMessage;
    this._resp.statusCode = statusCode;
  }

  public sendStatus(statuscode: number, text?: string): void {
    this._resp.statusCode = statuscode;
    this._setHeaders();
    this._setCookies();
    return this._resp.end(text);
  }

  public send(data?: any): void {
    if (isNil(data)) {
      this._setCookies();
      this._setHeaders();
      this._resp.end();
    } else if (isObjectLike(data)) {
      if (!this._headers['Content-Type']) {
        this._headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      this._setHeaders();
      this._setCookies();
      this._resp.end(JSON.stringify(data));
    } else {
      if (!this._headers['Content-Type']) {
        this._headers['Content-Type'] = 'text/plain; charset=utf-8';
      }
      this._setHeaders();
      this._setCookies();
      this._resp.end(String(data));
    }
  }

  public setHeaders(): void {
    this._setHeaders();
  }

  public headers(): IHeaders {
    return this._headers;
  }

  public cookies(): Map<string, string> {
    return this._cookies;
  }

  public getRaw(): any {
    return this._resp;
  }

  private _setHeaders(): void {
    for (const headerKey in this._headers) {
      if (this._headers.hasOwnProperty(headerKey)) {
        this._resp.setHeader(headerKey, this._headers[headerKey]);
      }
    }
  }

  private _setCookies(): void {
    if (this._cookies.size === 0) {
      return;
    }
    const cookiesList: string[] = [];
    this._cookies.forEach((val: string, key: string) => {
      cookiesList.push(`${key}=${encodeURIComponent(val)}`);
    });
    this._resp.setHeader('Set-Cookie', cookiesList.join(';'));
  }
}

export function ResponseWrapper(response: any): IResponse {
  return new HttpResponseWrapper(response);
}
