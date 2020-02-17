import {
  IActivation,
  IBeforeActivation,
  IConfigureActivation,
  KeepActivation
} from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { PARAMS_CONTEXT } from '../../constants';
import { IHttpContext } from '../../i.http';

class ContextParamDTO {
  constructor(public idx: number) {}
}

export const Context = (): ParameterDecorator =>
  ParameterDecoratorFactory((cd: ClassData, md: MethodData, pd: ParameterData) => {
    md.attributesData.push(new ContextParamDTO(pd.idx));
  });

export class ContextParamInterceptor implements IConfigureActivation, IBeforeActivation {
  public configure(activation: IActivation): KeepActivation {
    const params = activation.method.getAttributesOfType<ContextParamDTO>(ContextParamDTO);
    if (params) {
      activation.data[PARAMS_CONTEXT] = params;
      return KeepActivation.BEFORE;
    }
    return KeepActivation.NONE;
  }

  public before(ctx: IHttpContext): boolean {
    const args = ctx.getArguments();
    ctx.getActivation().data[PARAMS_CONTEXT].forEach((ctxParam: ContextParamDTO) => {
      args[ctxParam.idx] = ctx;
    });
    return true;
  }
}
