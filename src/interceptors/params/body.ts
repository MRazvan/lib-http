import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_BODY } from '../../constants';
import { HttpContext } from '../../internals/context';
import { ParamDataDTO, ParamSource } from './dto';

export const Body = (name: string, defaultVal?: any): ParameterDecorator => {
  return ParameterDecoratorFactory((classData: ClassData, md: MethodData, pd: ParameterData) => {
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

export class BodyArgumentInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method
      .getAttributesOfType<ParamDataDTO>(ParamDataDTO)
      .filter(p => p.source === ParamSource.Body);
    if (params.length > 0) {
      activation.data[PARAMS_BODY] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(context: HttpContext): boolean {
    const args = context.getArguments();
    const req = context.getRequest();
    context.getActivation().data[PARAMS_BODY].forEach((pd: ParamDataDTO) => {
      args[pd.idx] = req.body(pd.name) || pd.defaultVal;
    });
    return true;
  }
}
