import * as fs from 'fs';
import * as Http from 'http';
import * as Https from 'https';
import { Container } from 'inversify';
import { ILog, LogFactory } from 'lib-host';
import { isNil } from 'lodash';
import { HTTPServerType, IHttpServerOptions } from '../i.http';

export class NodeHttpServer {
  public server: any;
  private _options: IHttpServerOptions;
  private readonly _log: ILog;
  constructor(container: Container) {
    const logFactory = container.get<LogFactory>(LogFactory);
    this._log = logFactory.createLog('NodeHTTPServerFactory');
  }
  public create(options: IHttpServerOptions, listener: Http.RequestListener): void {
    this._options = options;
    this._log.verbose('Creating server.', options);
    if (this._options.type === HTTPServerType.HTTP) {
      // Check if secure or not
      if (!isNil(this._options.privateKey) && !isNil(this._options.certificate)) {
        // We can create a secure server
        this.server = Https.createServer(
          {
            key: fs.readFileSync(this._options.privateKey),
            cert: fs.readFileSync(this._options.certificate)
          },
          listener
        );
      } else {
        this.server = Http.createServer(listener);
      }
    } else {
      this._log.error('Support for HTTP2 is not implemented yet');
      throw new Error('Support for HTTP2 is not implemented yet');
    }
  }
  public listen(): void {
    if (this._options.type === HTTPServerType.HTTP) {
      const srv = this.server as Http.Server;
      if (!isNil(this._options.host)) {
        srv.listen(this._options.host, this._options.port, () => {
          this._options.port = (srv.address() as any).port;
          this._options.host = this._options.host || (srv.address() as any).address;
          this._log.verbose(`'Started Server. On ${this._options.host}:${this._options.port}`);
        });
      } else {
        srv.listen(this._options.port, () => {
          this._options.port = (srv.address() as any).port;
          this._options.host = this._options.host || (srv.address() as any).address;
          this._log.verbose(`'Started Server. On ${this._options.host}:${this._options.port}`);
        });
      }
    } else {
      this._log.error('Support for HTTP2 is not implemented yet');
      throw new Error('Support for HTTP2 is not implemented yet');
    }
  }
  public stop(): Promise<any> {
    if (this._options.type === HTTPServerType.HTTP) {
      const srv = this.server as Http.Server;
      if (!srv.listening) {
        return Promise.resolve(true);
      }
      return new Promise((resolve, reject) =>
        srv.close((err: any) => {
          if (!isNil(err)) {
            this._log.error('Error stopping server.', err);
            reject(err);
          } else {
            this._log.verbose('Server stopped.');
            resolve();
          }
        })
      );
    }
    return Promise.resolve();
  }
}
