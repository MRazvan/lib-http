import * as http from 'http';
import { isNil } from 'lodash';
import { IHeaders, IResponse } from '../i.http';

export class HttpResponseWrapper implements IResponse {
  private readonly _headers: Record<string, any> = {};
  private _cookies: Map<string, string> = null;

  constructor(private readonly _resp: http.ServerResponse) {}

  public isFinished(): boolean {
    return this._resp.headersSent || this._resp.finished;
  }

  public setStatus(statusCode: number, statusMessage: string): void {
    this._resp.statusMessage = statusMessage;
    this._resp.statusCode = statusCode;
  }

  public sendStatus(statuscode: number, text?: string): void {
    this._sendHeaders(statuscode, this._headers);
    return this._resp.end(text);
  }

  public end(data?: any): void {
    const strData = this._serializeData(data);
    if (!this._resp.headersSent) {
      if (!this._headers['Content-Length']) {
        this._headers['Content-Length'] = isNil(strData) ? 0 : Buffer.byteLength(strData);
      }
      this._sendHeaders(this._resp.statusCode, this._headers);
    }
    this._resp.end(strData, null, null);
  }

  public send(data?: any): void {
    const strData = this._serializeData(data);
    this._resp.write(strData, null, null);
  }

  public sendHeaders(statusCode?: number): void {
    this._sendHeaders(statusCode || this._resp.statusCode, this._headers);
  }

  public headers(): IHeaders {
    return this._headers;
  }

  public cookies(): Map<string, string> {
    if (this._cookies === null) {
      this._cookies = new Map();
    }
    return this._cookies;
  }

  public getRaw(): any {
    return this._resp;
  }

  private _sendHeaders(statusCode: number, headers: Record<string, any>): void {
    this._setCookies();
    this._resp.writeHead(statusCode, headers);
  }

  private _setCookies(): void {
    if (this._cookies === null) {
      return;
    }

    if (this._cookies.size === 0) {
      return;
    }
    const cookiesList: string[] = [];
    this._cookies.forEach((val: string, key: string) => {
      cookiesList.push(`${key}=${encodeURIComponent(val)}`);
    });
    this._headers['Set-Cookie'] = cookiesList.join(';');
  }

  private _serializeData(data: any): string {
    // String is the most used payload so check that first
    if (typeof data === 'string') {
      if (!this._headers['Content-Type']) {
        this._headers['Content-Type'] = 'text/plain; charset=utf-8';
      }
      return data;
      // JSON next
    } else if (typeof data === 'object' || typeof data === 'function') {
      if (!this._headers['Content-Type']) {
        this._headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      return JSON.stringify(data);
    }
    if (!this._headers['Content-Type']) {
      this._headers['Content-Type'] = 'text/plain; charset=utf-8';
    }
    return Object.toString.apply(data);
  }
}

export function ResponseWrapper(response: any): IResponse {
  return new HttpResponseWrapper(response);
}
