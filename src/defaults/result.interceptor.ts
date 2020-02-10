import { ILog, LogFactory } from 'lib-host';
import { IAfterActivation } from 'lib-intercept';
import { isNil } from 'lodash';
import { IResponse } from '../i.http';
import { HttpContext } from '../internals/context';

export class ResultInterceptor implements IAfterActivation {
  private _log: ILog = null;
  public async after(context: HttpContext): Promise<any> {
    const response = context.getResponse();
    try {
      if (response.isFinished()) {
        return Promise.resolve(true);
      }
      const result = context.getResult();
      if (result.error) {
        return this._handleError(context, response, result.error);
      } else if (result.payload instanceof Promise) {
        return this._handlePromise(context, response, result.payload);
      }
      response.send(result.payload);
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

  private _handleError(context: HttpContext, resp: IResponse, err: any): boolean {
    if (isNil(this._log)) {
      this._log = context
        .getContainer()
        .get<LogFactory>(LogFactory)
        .createLog('ResultInterceptor');
    }
    this._log.error('Error processing result.', err);
    resp.sendStatus(500, JSON.stringify(err));
    return false;
  }
}
