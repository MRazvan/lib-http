import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_COOKIE } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';
const StaticEmptyMap: Map<string, string> = new Map();

export const Cookie = (name?: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[PARAMS_COOKIE] = true;
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

export class CookieArgumentInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Cookie);
    if (params.length > 0) {
      activation.data[PARAMS_COOKIE] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(context: HttpContext): boolean {
    const args = context.getArguments();
    const cookies: Map<string, string> = context.getRequest().cookies() || StaticEmptyMap;
    context.getActivation().data[PARAMS_COOKIE].forEach((pd: ParamDataDTO) => {
      args[pd.idx] = pd.name ? cookies.get(pd.name) || pd.defaultVal : cookies;
    });

    return true;
  }
}
