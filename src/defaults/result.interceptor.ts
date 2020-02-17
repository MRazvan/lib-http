import { ILog, LogFactory } from 'lib-host';
import { IAfterActivation } from 'lib-intercept';
import { isNil } from 'lodash';
import { IResponse } from '../i.http';
import { HttpContext } from '../internals/context';
import { isAwaitable } from '../utils';

export class ResultInterceptor implements IAfterActivation {
  private _log: ILog = null;
  public after(context: HttpContext): void {
    const response = context.getResponse();
    if (response.isFinished()) {
      return;
    }

    if (!context.isSuccess()) {
      this._handleError(context, response, context.error);
      // Promise
    } else if (isAwaitable(context.payload)) {
      this._handlePromise(context, response, context.payload);
    } else {
      response.end(context.payload);
    }
  }

  private _handlePromise(context: HttpContext, resp: IResponse, payload: Promise<any>): void {
    payload.then(
      data => {
        if (!resp.isFinished()) {
          resp.end(data);
        }
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
