import { LogFactory } from 'lib-host';
import { IAfterActivation } from 'lib-intercept';
import { HttpContext } from '../internals/context';

export class ResultInterceptor implements IAfterActivation {
  public async after(context: HttpContext): Promise<any> {
    const response = context.getResponse();
    try {
      if (response.isFinished()) {
        return Promise.resolve(true);
      }
      const result = context.getResult();
      if (result.error) {
        response.sendStatus(500, result.error);
      } else if (result.payload instanceof Promise) {
        try {
          const data = await result.payload;
          if (response.isFinished()) {
            return Promise.resolve(true);
          }
          response.send(data);
        } catch (err) {
          context
            .getContainer()
            .get<LogFactory>(LogFactory)
            .createLog('ResultInterceptor')
            .error('Error waiting for result to finish', err);
          response.sendStatus(500, err);
        }
      } else {
        response.send(result.payload);
      }
    } catch (err) {
      context
        .getContainer()
        .get<LogFactory>(LogFactory)
        .createLog('ResultInterceptor')
        .error('Error waiting for result to finish', err);
      response.sendStatus(500, 'Unexpected error');
    }
    return Promise.resolve(true);
  }
}
