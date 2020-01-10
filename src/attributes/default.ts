import { ClassData, MethodData, MethodDecoratorFactory } from 'lib-reflect';

export class DefaultRouteHandlerAttributeData {}

export const DefaultRouteHandler = (): MethodDecorator => {
  return MethodDecoratorFactory((classData: ClassData, md: MethodData, d: any) => {
    md.attributesData.push(new DefaultRouteHandlerAttributeData());
  });
};
