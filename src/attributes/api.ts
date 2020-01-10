import { ClassData, MethodData, MethodDecoratorFactory } from 'lib-reflect';
import { defaults, isNil } from 'lodash';

export declare type HTTPRequestType = 'GET' | 'POST' | 'PUT' | 'DELETE' | string;

export class ApiAttributeData {
  public path: string;
  public type: HTTPRequestType;
  constructor(data: Partial<ApiAttributeData>) {
    Object.assign(this, data);
  }
}

export const Api = (options?: ApiAttributeData): MethodDecorator => {
  return MethodDecoratorFactory((classData: ClassData, md: MethodData, descriptor: any) => {
    const methodOptions = new ApiAttributeData(
      defaults(options || {}, {
        path: md.name,
        type: 'GET'
      })
    );

    const existingAttribute = md
      .getAttributesOfType<ApiAttributeData>(ApiAttributeData)
      .find(
        (apiAttr: ApiAttributeData) =>
          apiAttr.type === methodOptions.type && apiAttr.path === methodOptions.path
      );

    if (!isNil(existingAttribute)) {
      throw new Error(
        `Cannot add multiple API endpoints on method '${md.name}' on type '${classData.name}' with the same Request Type '${methodOptions.type}'`
      );
    }
    md.attributesData.push(methodOptions);
  });
};

export const Get = (path?: string): MethodDecorator => Api({ path: path, type: 'GET' });
export const Post = (path?: string): MethodDecorator => Api({ path: path, type: 'POST' });
export const Put = (path?: string): MethodDecorator => Api({ path: path, type: 'PUT' });
export const Delete = (path?: string): MethodDecorator => Api({ path: path, type: 'DELETE' });
