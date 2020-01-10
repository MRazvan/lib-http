import { LogFactory } from 'lib-host';
import { IAfterActivation } from 'lib-intercept';
import { IResponse } from '../i.http';
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
        this._handleError(context, response, result.error);
      } else if (result.payload instanceof Promise) {
        return this._handlePromise(context, response, result.payload);
      } else {
        response.send(result.payload);
      }
    } catch (err) {
      this._handleError(context, response, err);
    }
    return Promise.resolve(true);
  }

  private async _handlePromise(
    context: HttpContext,
    resp: IResponse,
    payload: Promise<any>
  ): Promise<boolean> {
    try {
      const data = await payload;
      if (resp.isFinished()) {
        return true;
      }
      resp.send(data);
    } catch (err) {
      this._handleError(context, resp, err);
      return false;
    }
  }

  private _handleError(context: HttpContext, resp: IResponse, err: any): void {
    context
      .getContainer()
      .get<LogFactory>(LogFactory)
      .createLog('ResultInterceptor')
      .error('Error processing result.', err);
    resp.sendStatus(500, JSON.stringify(err));
  }
}
