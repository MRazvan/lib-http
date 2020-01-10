import { IBeforeActivation } from 'lib-intercept';
import { ClassData, MethodData, ParameterData, ParameterDecoratorFactory } from 'lib-reflect';
import { isEmpty } from 'lodash';
import { IHttpContext } from 'src/i.http';

class ContextParamDTO {
  constructor(public idx: number) {}
}

export const Context = (): ParameterDecorator =>
  ParameterDecoratorFactory((cd: ClassData, md: MethodData, pd: ParameterData) => {
    md.attributesData.push(new ContextParamDTO(pd.idx));
  });

export class ContextParamInterceptor implements IBeforeActivation {
  public before(ctx: IHttpContext): boolean {
    const ctxParams = ctx
      .getActivation()
      .method.getAttributesOfType<ContextParamDTO>(ContextParamDTO);
    if (isEmpty(ctxParams)) {
      ctx.getActivation().removeBeforeActivation(this, ctx);
      return true;
    }
    const args = ctx.getArguments();
    ctxParams.forEach(ctxParam => {
      args[ctxParam.idx] = ctx;
    });
    return true;
  }
}
