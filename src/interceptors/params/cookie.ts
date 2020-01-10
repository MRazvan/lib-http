import { IBeforeActivation } from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { HAS_COOKIE_PARAMS } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';
const StaticEmptyMap: Map<string, string> = new Map();

export const Cookie = (name?: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[HAS_COOKIE_PARAMS] = true;
    md.attributesData.push(
      new ParamDataDTO({
        idx: pd.idx,
        source: ParamSource.Cookie,
        name: name,
        defaultVal: defaultVal
      })
    );
  });
};

export class CookieArgumentInterceptor implements IBeforeActivation {
  public before(context: HttpContext): boolean {
    const activationInfo = context.getActivation();
    if (!activationInfo.method.tags[HAS_COOKIE_PARAMS]) {
      context.getActivation().removeBeforeActivation(this, context);
      return true;
    }

    const params = activationInfo.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Cookie);

    const args = context.getArguments();
    const cookies: Map<string, string> = context.getRequest().cookies() || StaticEmptyMap;
    params.forEach((pd: ParamDataDTO) => {
      args[pd.idx] = pd.name ? cookies.get(pd.name) || pd.defaultVal : cookies;
    });

    return true;
  }
}
