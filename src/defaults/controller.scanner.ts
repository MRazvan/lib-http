import { Container, injectable } from 'inversify';
import {
  Activation,
  ActivationsGenerator,
  IAfterActivation,
  IBeforeActivation
} from 'lib-intercept';
import { ReflectHelper } from 'lib-reflect';
import { cloneDeep, head, isEmpty, isNil } from 'lodash';
import { ApiAttributeData } from '../attributes/api';
import { ControllerAttributeData } from '../attributes/controller';
import { DefaultRouteHandlerAttributeData } from '../attributes/default';
import { RouteEndpoint, RouteScanner } from '../i.http';

@injectable()
export class ControllerScanner extends RouteScanner {
  protected readonly activations: ActivationsGenerator;
  protected readonly routeEndpoints: RouteEndpoint[];

  constructor() {
    super();
    this.activations = new ActivationsGenerator();
    this.routeEndpoints = [];
  }

  public addClass(controller: Function): void {
    const classData = ReflectHelper.getClass(controller);
    if (isNil(classData)) {
      throw new Error(
        `Controller '${controller.name}' must be decorated with @Controller() attribute.`
      );
    }
    // Check if we have the controller attribute
    // TODO : Use method on controller
    const controllerAttributeData = classData.getAttributesOfType<ControllerAttributeData>(
      ControllerAttributeData
    );
    if (isEmpty(controllerAttributeData)) {
      throw new Error(
        `Controller '${controller.name}' must be decorated with @Controller() attribute.`
      );
    }
    this.activations.register(controller);
  }

  public addInterceptor(interceptor: Function | IBeforeActivation | IAfterActivation): void {
    this.activations.addActivations(interceptor);
  }

  public generateRoutes(container: Container): RouteEndpoint[] {
    const activations = this.activations.generateActivations(container);
    // Now for each controller data attribute
    // for each api generate the route endpoints
    activations.forEach((activation: Activation) => {
      // TODO : Use method on class
      const controllerAttributes = activation.class.getAttributesOfType(ControllerAttributeData);
      // TODO : Use method on method
      const apiAttributes = activation.method.getAttributesOfType<ApiAttributeData>(
        ApiAttributeData
      );
      const defaultAttribute = head(
        activation.method.getAttributesOfType<DefaultRouteHandlerAttributeData>(
          DefaultRouteHandlerAttributeData
        )
      );
      if (!isNil(defaultAttribute) && !isEmpty(apiAttributes)) {
        throw new Error(
          `Method ${activation.class.name}.${activation.method.name} is decorated with @DefaultRouteInterceptor and @Api, choose one.`
        );
      }

      // If we have a default route interceptor attribute, add a custom route and continue with the next method
      if (!isNil(defaultAttribute)) {
        this.routeEndpoints.push(
          new RouteEndpoint({
            type: '*',
            controllerAttribute: new ControllerAttributeData({ path: '' }),
            apiAttribute: new ApiAttributeData({ type: '*', path: '' }),
            activation: cloneDeep(activation),
            isDefault: true
          })
        );
        return;
      }

      // CROSS JOIN ON ATTRIBUTES
      const product = [].concat(
        ...controllerAttributes.map(ca => apiAttributes.map(aa => [ca, aa]))
      );
      product.forEach((crossJoin: any[]) => {
        // The first entry is a controller attribute
        // The second entry is an api attribute
        this.routeEndpoints.push(
          new RouteEndpoint({
            type: (crossJoin[1] as ApiAttributeData).type,
            controllerAttribute: crossJoin[0] as ControllerAttributeData,
            apiAttribute: crossJoin[1] as ApiAttributeData,
            activation: cloneDeep(activation),
            isDefault: false
          })
        );
      });
    });
    return this.routeEndpoints;
  }
}
