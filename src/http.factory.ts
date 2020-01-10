import { Container } from 'inversify';
import { IConfig, Runnable } from 'lib-host';
import { DefaultConfigurator } from './defaults/configurator';
import { HttpRunnable } from './http';
import { IHttpServer } from './i.http';

export class HTTPFactory {
  public static create(container: Container, _config?: IConfig): IHttpServer {
    const server = new HttpRunnable(_config, container);
    server.configure(DefaultConfigurator);
    container.bind<Runnable>(Runnable).toConstantValue(server);
    return server;
  }
}
