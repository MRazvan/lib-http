import * as http from 'http';
import { isNil } from 'lodash';
import { isFunction } from 'util';
import { IHeaders, IResponse } from '../i.http';
/* eslint-disable @typescript-eslint/member-naming */

class ContentType {
  public static readonly JSON: string = 'application/json; charset=utf-8';
  public static readonly TEXT: string = 'text/plain; charset=utf-8';
  public static readonly OCTET: string = 'application/octet-stream';
}

class HeadersType {
  public static readonly CONTENT_TYPE: string = 'Content-Type';
  public static readonly CONTENT_LENGTH: string = 'Content-Length';
  public static readonly SET_COOKIE: string = 'Set-Cookie';
}

class EncodingTypes {
  public static readonly UTF8: string = 'utf-8';
}

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
      if (!this._headers[HeadersType.CONTENT_LENGTH]) {
        this._headers[HeadersType.CONTENT_LENGTH] = isNil(strData)
          ? 0
          : Buffer.byteLength(strData, EncodingTypes.UTF8 as BufferEncoding);
      }
      this._sendHeaders(this._resp.statusCode, this._headers);
    }
    this._resp.end(strData, null, null);
  }

  public send(data?: any): void {
    // Stream
    if (data && isFunction(data.pipe)) {
      if (!this._resp.headersSent) {
        this.sendHeaders(null);
        data.pipe(this._resp);
      }
    } else {
      // Anything else
      const strData = this._serializeData(data);
      this._resp.write(strData, EncodingTypes.UTF8, null);
    }
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
    this._headers[HeadersType.SET_COOKIE] = cookiesList.join(';');
  }

  private _serializeData(data: any): string | Buffer {
    // If we sent the header don't bother with setting a content type
    const hasContentType =
      this._headers[HeadersType.CONTENT_TYPE] !== undefined || this._resp.headersSent;
    // String is the most used payload so check that first
    if (typeof data === 'string') {
      if (!hasContentType) {
        this._headers[HeadersType.CONTENT_TYPE] = ContentType.TEXT;
      }
      return data;
    } else if (typeof data === 'object') {
      if (!hasContentType) {
        this._headers[HeadersType.CONTENT_TYPE] = ContentType.JSON;
      }
      return JSON.stringify(data);
    } else if (Buffer.isBuffer(data)) {
      if (!hasContentType) {
        this._headers[HeadersType.CONTENT_TYPE] = ContentType.OCTET;
      }
      return data;
    }
    if (!hasContentType) {
      this._headers[HeadersType.CONTENT_TYPE] = ContentType.TEXT;
    }
    return Object.toString.apply(data);
  }
}

export function ResponseWrapper(response: any): IResponse {
  return new HttpResponseWrapper(response);
}
