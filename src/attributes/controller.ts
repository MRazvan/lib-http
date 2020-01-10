import { ClassData, ClassDecoratorFactory } from 'lib-reflect';

export class ControllerAttributeData {
  public path?: string;

  constructor(data: Partial<ControllerAttributeData>) {
    Object.assign(this, data);
  }
}

export const Controller = (name?: string): ClassDecorator => {
  return ClassDecoratorFactory((classData: ClassData) => {
    let targetName = (name ? name : classData.name).toLowerCase();
    const ctrlIdx = targetName.indexOf('controller');
    if (ctrlIdx > -1) {
      targetName = targetName.substring(0, ctrlIdx);
    }
    classData.attributesData.push(new ControllerAttributeData({ path: targetName }));
  });
};
