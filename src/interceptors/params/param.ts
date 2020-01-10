import { IBeforeActivation } from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { HAS_PARAM_PARAMS } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Param = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[HAS_PARAM_PARAMS] = true;
    md.attributesData.push(
      new ParamDataDTO({
        idx: pd.idx,
        source: ParamSource.Param,
        name: name,
        defaultVal: defaultVal
      })
    );
  });
};

export class ParamArgumentInterceptor implements IBeforeActivation {
  public before(context: HttpContext): boolean {
    const activationInfo = context.getActivation();
    if (!activationInfo.method.tags[HAS_PARAM_PARAMS]) {
      context.getActivation().removeBeforeActivation(this, context);
      return true;
    }
    const params = activationInfo.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Param);

    const args = context.getArguments();
    const req = context.getRequest();
    params.forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.param(pd.name) || pd.defaultVal;
    });

    return true;
  }
}
