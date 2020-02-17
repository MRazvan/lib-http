import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_HEADER } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Header = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[PARAMS_HEADER] = true;
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

export class HeaderArgumentInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Header);
    if (params.length > 0) {
      activation.data[PARAMS_HEADER] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(context: HttpContext): boolean {
    const args = context.getArguments();
    const req = context.getRequest();
    context.getActivation().data[PARAMS_HEADER].forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.header(pd.name) || pd.defaultVal;
    });
    return true;
  }
}
