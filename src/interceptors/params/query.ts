import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_QUERY } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Query = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
    md.tags[PARAMS_QUERY] = true;
    md.attributesData.push(
      new ParamDataDTO({
        idx: pd.idx,
        source: ParamSource.Query,
        name: name,
        defaultVal: defaultVal
      })
    );
  });
};

export class QueryArgumentInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Query);
    if (params.length > 0) {
      activation.data[PARAMS_QUERY] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(context: HttpContext): boolean {
    const args = context.getArguments();
    const req = context.getRequest();
    context.getActivation().data[PARAMS_QUERY].forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.query(pd.name) || pd.defaultVal;
    });

    return true;
  }
}
