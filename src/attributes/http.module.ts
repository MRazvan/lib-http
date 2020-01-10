import { injectable } from 'inversify';
import { IAfterActivation, IBeforeActivation } from 'lib-intercept';
import { ClassData, ClassDecoratorFactory } from 'lib-reflect';

export class HttpModuleData {
  public controllers: Function[];
  public interceptors: (Function | IBeforeActivation | IAfterActivation)[];
  public name: string;

  constructor(data: Partial<HttpModuleData>) {
    Object.assign(this, data);
    this.interceptors = this.interceptors || [];
    this.controllers = this.controllers || [];
  }
}

export const HttpModule = (data: Partial<HttpModuleData>): ClassDecorator =>
  ClassDecoratorFactory((classData: ClassData) => {
    injectable()(classData.target);
    classData.attributeData.push(new HttpModuleData(data));
  });
