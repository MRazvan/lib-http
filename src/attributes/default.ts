import { ClassData, MethodData, MethodDecoratorFactory } from 'lib-reflect';

export class DefaultRouteHandlerAttributeData {
  constructor(public type: string, public path: string) {}
}

export const DefaultRouteHandler = (type = '*', path?: string): MethodDecorator => {
  return MethodDecoratorFactory((classData: ClassData, md: MethodData, d: any) => {
    md.attributesData.push(new DefaultRouteHandlerAttributeData(type, path));
  });
};
