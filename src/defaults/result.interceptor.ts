import { ILog, LogFactory } from 'lib-host';
import { IAfterActivation } from 'lib-intercept';
import { isNil } from 'lodash';
import { IResponse } from '../i.http';
import { HttpContext } from '../internals/context';

export class ResultInterceptor implements IAfterActivation {
  private _log: ILog = null;
  public after(context: HttpContext): void {
    const response = context.getResponse();
    if (response.isFinished()) {
      return;
    }

    const result = context.getResult();
    if (result.error) {
      this._handleError(context, response, result.error);
    } else if (result.payload instanceof Promise) {
      this._handlePromise(context, response, result.payload);
    }
    response.end(result.payload);
  }

  private _handlePromise(context: HttpContext, resp: IResponse, payload: Promise<any>): void {
    payload.then(
      data => {
        if (resp.isFinished()) {
          return true;
        }
        resp.end(data);
      },
      err => {
        this._handleError(context, resp, err);
      }
    );
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
