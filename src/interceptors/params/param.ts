import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_PARAM } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Param = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[PARAMS_PARAM] = true;
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

export class ParamArgumentInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Param);
    if (params.length > 0) {
      activation.data[PARAMS_PARAM] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(context: HttpContext): boolean {
    const args = context.getArguments();
    const req = context.getRequest();
    context.getActivation().data[PARAMS_PARAM].forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.param(pd.name) || pd.defaultVal;
    });

    return true;
  }
}
