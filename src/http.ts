import { Container } from 'inversify';
import { IConfig, ILog, LogFactory, Runnable } from 'lib-host';
import { ReflectHelper } from 'lib-reflect';
import { isEmpty, isFunction, isNil } from 'lodash';
import { HttpModuleData } from './attributes/http.module';
import { HttpApplicationData, HttpServerConfigurator, HTTPServerType, HTTPServerTypeString, IHttpServer, RouteEndpoint, RouteScanner, ServerStarted } from './i.http';
import { HttpContext } from './internals/context';
import { HttpRunConfiguration } from './internals/http.run.configuration';
import { NodeHttpServer } from './internals/node.server';

function EmptyWrap(val?: any): any {
  return val;
}
export class HttpRunnable extends Runnable implements IHttpServer {
  private readonly _log: ILog;
  private readonly _server: NodeHttpServer;

  public container: Container;
  public runConfiguration: HttpRunConfiguration = new HttpRunConfiguration();
  public applications: HttpApplicationData[] = [];

  constructor(public config: IConfig, private readonly _rootContainer: Container) {
    super();
    // Create a separate container for this http host
    this.container = this._rootContainer.createChild();
    // Get the log for this server
    const serverName = config ? config.get<string>('name', 'Unknown') : '';
    this._log = this._rootContainer
      .get<LogFactory>(LogFactory)
      .createLog('HttpServer_' + serverName);
    // Create the actual Node HTTP server wrapper
    this._server = new NodeHttpServer(this.container);
    this.runConfiguration.server = this._server;
    // Read the configuration if available
    this._readConfig();
  }

  public configure(configurator: HttpServerConfigurator): IHttpServer {
    if (!isFunction(configurator)) {
      this._log.error('Error configurating server. Argument is not a function.');
      return this;
    }
    configurator(this);
    return this;
  }

  public addModule(app: Function): IHttpServer {
    // Check if it has HttpModuleData
    const classData = ReflectHelper.getClass(app);
    if (isNil(classData)) {
      throw new Error(`Application '${app.name}' was not found in the reflection repository`);
    }

    const httpModulesData = classData.getAttributesOfType<HttpModuleData>(HttpModuleData);
    if (isEmpty(httpModulesData)) {
      throw new Error(`Application '${app.name}' is not decorated to be an HTTP module`);
    }
    if (httpModulesData.length > 1) {
      throw new Error(`Application '${app.name}' is decorated multiple times with HTPP Module.`);
    }

    const moduleData = httpModulesData[0];
    this._log.info(`Registering http module '${app.name}'`);
    // Setup the container for the application
    this.applications.push(
      new HttpApplicationData(
        this.container.createChild(),
        // Target module
        app,
        // Module data (attribute data set when the module was decorated)
        moduleData
      )
    );
    return this;
  }

  public addGlobalInterceptor(interceptor: any): IHttpServer {
    this.runConfiguration.interceptors.push(interceptor);
    return this;
  }

  public onStarted(started: ServerStarted): IHttpServer {
    this.runConfiguration.startedCallbacks.push(started);
    return this;
  }

  public start(): Promise<void> {
    // Generate the routes for all modules and register them in the router
    this._mountModules();

    this._server.create(this.runConfiguration.options, this.runConfiguration.router.listen(this));
    return this._server.listen();
  }

  public async allStarted(): Promise<void> {
    // Initialize modules after all 'Runnables' have started,
    //  this is so all modules have access to anything the runnables registered in the root container
    for (const app of this.applications) {
      if (app.initialized) {
        continue;
      }
      app.initialized = true;
      // Create a temporary container in which we can create the HttpModule
      const temporaryContainer = app.container.createChild();
      // Create instance and initialize the module
      temporaryContainer.bind(app.target).toSelf();
      const instance = temporaryContainer.get(app.target);
      // Detach from parent so it can be more easily collected by GC
      temporaryContainer.parent = null;
      // If we have an initialization function then call it
      if (isFunction(instance.init)) {
        const result = instance.init(app.container, this.container, this._rootContainer);
        if (result instanceof Promise) {
          // Don't try catch this, if anything happens during initialization of a module just fail
          //    The 'host' will take care of shutting us down and marking us as failed
          await result;
        }
      }
    }

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
    options.host = this.config.get<string>('host', this.config.get<string>('env.NODE_HOST'));
    options.port = this.config.get<number>('port', this.config.get<number>('env.PORT', 80));
    options.privateKey = this.config.get<string>('private_key');
    options.certificate = this.config.get<string>('certificate');
  }

  // TODO: Split _mountApplications method into multiple
  //    One to get the endpoints for one application
  //    One to get all endpoints from all applications
  private _mountModules(): void {
    // Insert the result interceptor so it is the last one called
    if (this.runConfiguration.responseInterceptor !== null) {
      this.runConfiguration.interceptors.unshift(this.runConfiguration.responseInterceptor);
    }
    if (this.runConfiguration.requestInterceptor !== null) {
      this.runConfiguration.interceptors.unshift(this.runConfiguration.requestInterceptor);
    }

    const allEndpoints: RouteEndpoint[] = [];
    this.applications.forEach((app: HttpApplicationData) => {
      const controllerScanner = this.container.get<RouteScanner>(RouteScanner);
      controllerScanner.setServer(this);
      this._log.verbose(`Registering application ${app.target.name}`);
      // Add global interceptors
      this.runConfiguration.interceptors.forEach(i => controllerScanner.addInterceptor(i));
      // Add the middlewares defined in the module
      app.module.interceptors.forEach(i => controllerScanner.addInterceptor(i));
      // For each controller add to the module scanner
      app.module.controllers.forEach(c => controllerScanner.addClass(c));
      // Finally generate all endpoints
      app.routes = controllerScanner.generateRoutes(app.container);
      app.routes.forEach((routeEndpoint: RouteEndpoint) => {
        routeEndpoint.app = app;
        routeEndpoint.calculatedPath = this.runConfiguration.routeCalculation(routeEndpoint, this);
        allEndpoints.push(routeEndpoint);
      });
    });
    // Process the routes
    const processedEnpoints = isFunction(this.runConfiguration.routeProcessing)
      ? this.runConfiguration.routeProcessing(allEndpoints, this)
      : allEndpoints;

    // Prepare the request / response wrappers
    const requestWrapper = this.runConfiguration.requestWrapper;
    const responseWrapper = this.runConfiguration.responseWrapper;
    // Register the route endpoints and the handler for the endpoints
    this.runConfiguration.router.route(this, processedEnpoints, (endpoint, req, resp, next) => {
      const ctx = new HttpContext(this, endpoint, requestWrapper(req), responseWrapper(resp));
      const nextCallback = isFunction(next) ? next : EmptyWrap;
      return ctx
        .execute()
        .then(() => nextCallback())
        .catch(err => nextCallback(err));
    });
  }
}
