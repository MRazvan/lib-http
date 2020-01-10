import { HTTPServerType, IHttpServerOptions } from '../i.http';

export class HttpServerOptions implements IHttpServerOptions {
  public type: HTTPServerType;
  public port: number;
  public host: string;
  public privateKey: string;
  public certificate: string;
  public mountPoint: string;

  public setMountPoint(mountPoint: string): HttpServerOptions {
    this.mountPoint = mountPoint || '';
    return this;
  }

  public setPort(port: number): HttpServerOptions {
    this.port = port;
    return this;
  }

  public setHost(host: string): HttpServerOptions {
    this.host = host;
    return this;
  }

  public setType(type: HTTPServerType): HttpServerOptions {
    this.type = type;
    return this;
  }

  public setCertificates(cert: string, pvk: string): HttpServerOptions {
    this.certificate = cert;
    this.privateKey = pvk;
    return this;
  }
}
