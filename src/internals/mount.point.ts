import { Container } from 'inversify';
import { ILog, LogFactory } from 'lib-host';
import { ReflectHelper } from 'lib-reflect';
import { isEmpty, isFunction, isNil } from 'lodash';
import { HttpModuleData } from '../attributes/http.module';
import { HttpApplicationData, IHttpServer, IMountPoint, RouteEndpoint, RouteScanner } from '../i.http';
import { MountPointConfiguration } from './http.run.configuration';

export class MountPoint implements IMountPoint {
  public applications: HttpApplicationData[] = [];
  public configuration: MountPointConfiguration;
  public container: Container;
  private readonly _data: Map<string, any> = new Map();

  constructor(private readonly _server: IHttpServer, private readonly _log: ILog) {
    // Create a separate container for this http host
    // Get the log for this server
    this._log = this._server.container.get<LogFactory>(LogFactory).createLog(`MountPoint`);
    this.configuration = new MountPointConfiguration();
    this.container = this._server.container.createChild();
  }

  public addGlobalInterceptor(interceptor: any): IMountPoint {
    this.configuration.interceptors.push(interceptor);
    return this;
  }

  public addModule(mod: Function | Record<string, any>): IMountPoint {
    const app = isFunction(mod) ? mod : mod.constructor;
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
    this._log.info(
      `Path: '${this.configuration.mountPoint}'. Registering http module '${app.name}'`
    );
    // Setup the container for the application
    this.applications.push(
      new HttpApplicationData(
        this.container.createChild(),
        // Target module
        mod,
        // Module data (attribute data set when the module was decorated)
        moduleData,
        this
      )
    );
    return this;
  }

  public configure(configurator: any): IMountPoint {
    if (!isFunction(configurator)) {
      this._log.error('Error configurating server. Argument is not a function.');
      return this;
    }
    configurator(this._server, this);
    return this;
  }

  public getRoutes(): RouteEndpoint[] {
    // Insert the result interceptor so it is the last one called
    if (this.configuration.responseInterceptor !== null) {
      this.configuration.interceptors.unshift(this.configuration.responseInterceptor);
    }
    if (this.configuration.requestInterceptor !== null) {
      this.configuration.interceptors.unshift(this.configuration.requestInterceptor);
    }

    const allEndpoints: RouteEndpoint[] = [];
    this.applications.forEach((app: HttpApplicationData) => {
      const controllerScanner = this.container.get<RouteScanner>(RouteScanner);
      controllerScanner.setServer(this._server);
      controllerScanner.setMountPoint(this);
      this._log.verbose(`Registering application ${app.target.name}`);
      // Add global interceptors
      this.configuration.interceptors.forEach(i => controllerScanner.addInterceptor(i));
      // Add the middlewares defined in the module
      app.module.interceptors.forEach(i => controllerScanner.addInterceptor(i));
      // For each controller add to the module scanner
      app.module.controllers.forEach(c => controllerScanner.addClass(c));
      // Finally generate all endpoints
      app.routes = controllerScanner.generateRoutes(app.container);
      app.routes.forEach((routeEndpoint: RouteEndpoint) => {
        routeEndpoint.app = app;
        routeEndpoint.mountPoint = this;
        routeEndpoint.mountPointConfig = this.configuration;
        routeEndpoint.calculatedPath = this.configuration.routeCalculation(
          routeEndpoint,
          this,
          this._server
        );
        allEndpoints.push(routeEndpoint);
      });
    });

    // Process the routes
    const processedEnpoints = isFunction(this.configuration.routeProcessing)
      ? this.configuration.routeProcessing(allEndpoints, this, this._server)
      : allEndpoints;

    return processedEnpoints;
  }

  public setMountPoint(mountPoint: string): IMountPoint {
    this.configuration.mountPoint = mountPoint || '/';
    return this;
  }

  public clearInterceptors(): IMountPoint {
    this.configuration.interceptors = [];
    return this;
  }

  public setData(key: string, data: any): IMountPoint {
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
