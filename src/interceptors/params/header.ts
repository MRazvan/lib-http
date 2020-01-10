import { IBeforeActivation } from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { HAS_HEADER_PARAMS } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Header = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[HAS_HEADER_PARAMS] = true;
    md.attributesData.push(
      new ParamDataDTO({
        idx: pd.idx,
        source: ParamSource.Header,
        name: name,
        defaultVal: defaultVal
      })
    );
  });
};

export class HeaderArgumentInterceptor implements IBeforeActivation {
  public before(context: HttpContext): boolean {
    const activationInfo = context.getActivation();
    if (!activationInfo.method.tags[HAS_HEADER_PARAMS]) {
      context.getActivation().removeBeforeActivation(this, context);
      return true;
    }
    const params = activationInfo.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Header);

    const args = context.getArguments();
    const req = context.getRequest();
    params.forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.header(pd.name) || pd.defaultVal;
    });
    return true;
  }
}
