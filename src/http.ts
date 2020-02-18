import { Container } from 'inversify';
import { IConfig, ILog, LogFactory, Runnable } from 'lib-host';
import { clone, flatten, isFunction, isNil } from 'lodash';
import {
  HTTPServerType,
  HTTPServerTypeString,
  IHttpServer,
  MountPointConfigurator,
  ServerStarted
} from './i.http';
import { HttpContext } from './internals/context';
import { HttpRunConfiguration } from './internals/http.run.configuration';
import { MountPoint } from './internals/mount.point';
import { NodeHttpServer } from './internals/node.server';

export class HttpRunnable extends Runnable implements IHttpServer {
  private readonly _log: ILog;
  private readonly _server: NodeHttpServer;
  private readonly _data: Map<string, any> = new Map();
  public readonly rootMountPoint: MountPoint;
  public mountPoints: MountPoint[] = [];
  public container: Container;

  public runConfiguration: HttpRunConfiguration = new HttpRunConfiguration();

  constructor(public config: IConfig, private readonly _rootContainer: Container) {
    super();
    // Create a separate container for this http host
    this.container = this._rootContainer.createChild();
    // Get the log for this server
    const serverName = config ? config.get<string>('name', 'Unknown') : '';
    const logFactory = this._rootContainer.get<LogFactory>(LogFactory);
    this._log = logFactory.createLog('HttpServer_' + serverName);
    // Create the actual Node HTTP server wrapper
    this._server = new NodeHttpServer(this.container);
    // Read the configuration if available
    this._readConfig();
    this.rootMountPoint = new MountPoint(this, this._log);
    this.mountPoints.push(this.rootMountPoint);
  }

  public configure(configurator: MountPointConfigurator): IHttpServer {
    if (!isFunction(configurator)) {
      this._log.error('Error configurating server. Argument is not a function.');
      return this;
    }
    configurator(this, this.rootMountPoint);
    return this;
  }

  public addModule(app: Function | Record<string, any>): IHttpServer {
    this.rootMountPoint.addModule(app);
    return this;
  }

  public addGlobalInterceptor(interceptor: any): IHttpServer {
    this.rootMountPoint.addGlobalInterceptor(interceptor);
    return this;
  }

  public onStarted(started: ServerStarted): IHttpServer {
    this.runConfiguration.startedCallbacks.push(started);
    return this;
  }

  public async allStarted(): Promise<void> {
    // Create the server and bind it to the runconfiguration
    this._server.create(this.runConfiguration.options, this.runConfiguration.router.listen(this));
    // Expose the native http server
    this.runConfiguration.server = this._server.server;
    // Initialize modules after all 'Runnables' have started,
    //  this is so all modules have access to anything the runnables registered in the root container
    const apps = flatten(this.mountPoints.map(m => m.applications));
    for (const app of apps) {
      if (app.initialized) {
        continue;
      }
      app.initialized = true;
      let instance: any = app.target;
      if (isFunction(instance)) {
        // Create a temporary container in which we can create the HttpModule
        const temporaryContainer = app.container.createChild();
        // Create instance and initialize the module
        temporaryContainer.bind(instance).toSelf();
        instance = temporaryContainer.get(instance);
        // Detach from parent so it can be more easily collected by GC
        temporaryContainer.parent = null;
      }

      // If we have an initialization function then call it
      if (isFunction(instance.init)) {
        const result = instance.init(
          app.container,
          app.mountPoint.container,
          this.container,
          this._rootContainer
        );
        if (result instanceof Promise) {
          // Don't try catch this, if anything happens during initialization of a module just fail
          //    The 'host' will take care of shutting us down and marking us as failed
          await result;
        }
      }
    }

    // Generate the routes for all modules and register them in the router
    this._mountModules();

    await this._server.listen();

    // Tell everyone listening that we started
    this.runConfiguration.startedCallbacks.forEach((startedCallback: ServerStarted) => {
      startedCallback(this);
    });

    return Promise.resolve();
  }

  public stop(): Promise<void> {
    return this._server.stop();
  }

  private _readConfig(): void {
    const options = this.runConfiguration.options;
    if (isNil(this.config)) {
      options.type = HTTPServerType.HTTP;
      options.port = 0;
      return;
    }

    options.type = HTTPServerTypeString[this.config.get<string>('type', 'http').toLowerCase()];
    options.host = this.config.get<string>('env.NODE_HOST', this.config.get<string>('host'));
    options.port = this.config.get<number>('env.PORT', this.config.get<number>('port', 80));
    options.privateKey = this.config.get<string>('private_key');
    options.certificate = this.config.get<string>('certificate');
  }

  // TODO: Split _mountApplications method into multiple
  //    One to get the endpoints for one application
  //    One to get all endpoints from all applications
  private _mountModules(): void {
    // Gather all routes from all mountpoints
    let routes = flatten(this.mountPoints.map(mp => mp.getRoutes()));
    // Final processing of routes
    routes = this.runConfiguration.routeProcessing(routes, null, this);
    // Register the route endpoints and the handler for the endpoints
    this.runConfiguration.router.route(this, routes, (routeEndpoint, req, resp) => {
      const ctx = new HttpContext(this, routeEndpoint, req, resp);
      return routeEndpoint.activation.execute(ctx);
    });
  }

  public setMountPoint(mountPoint: string): IHttpServer {
    this.rootMountPoint.configuration.mountPoint = mountPoint || '/';
    return this;
  }

  public addMountPoint(point: string, callback: MountPointConfigurator): IHttpServer {
    const mountPoint = new MountPoint(this, this._log);
    mountPoint.configuration = clone(this.rootMountPoint.configuration);
    mountPoint.configuration.mountPoint = point;
    this.mountPoints.push(mountPoint);
    if (isFunction(callback)) {
      callback(this, mountPoint);
    }
    return this;
  }

  public setData(key: string, data: any): IHttpServer {
    this._data.set(key, data);
    return this;
  }

  public getData<T>(key: string, defaults?: T): T {
    if (this._data.has(key)) {
      return this._data.get(key) as T;
    }
    return defaults;
  }
}
