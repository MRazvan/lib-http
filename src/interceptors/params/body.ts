import { IBeforeActivation } from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { HAS_BODY_PARAMS } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Body = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[HAS_BODY_PARAMS] = true;
    md.attributesData.push(
      new ParamDataDTO({
        idx: pd.idx,
        source: ParamSource.Body,
        name: name,
        defaultVal: defaultVal
      })
    );
  });
};

export class BodyArgumentInterceptor implements IBeforeActivation {
  public before(context: HttpContext): boolean {
    const activationInfo = context.getActivation();
    if (!activationInfo.method.tags[HAS_BODY_PARAMS]) {
      context.getActivation().removeBeforeActivation(this, context);
      return true;
    }
    const params = activationInfo.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Body);

    const args = context.getArguments();
    const req = context.getRequest();
    params.forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.body(pd.name) || pd.defaultVal;
    });

    return true;
  }
}
