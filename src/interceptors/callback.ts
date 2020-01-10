import { IBeforeActivation } from 'lib-intercept';
import { IHttpContext } from '../i.http';

export class CallbackMiddlewareWrapper implements IBeforeActivation {
  constructor(
    private readonly _middleware: (req: any, res: any, next: (err?: any) => void) => void
  ) {}

  public before(context: IHttpContext): Promise<boolean> {
    const req = context.getRequest().getRaw();
    const res = context.getResponse().getRaw();
    return new Promise((resolve, reject) => {
      this._middleware(req, res, (err: any) => {
        if (!err) {
          resolve(true);
        } else {
          context.getResult().setError(err);
          resolve(false);
        }
      });
    });
  }
}

export class CallbackMultiMiddlewareWrapper implements IBeforeActivation {
  constructor(
    private readonly _middlewares: ((req: any, res: any, next: (err?: any) => void) => void)[]
  ) {}

  public before(context: IHttpContext): Promise<boolean> {
    const req = context.getRequest().getRaw();
    const res = context.getResponse().getRaw();
    // We need to chain the middlewares
    let promise: Promise<boolean> = null;
    this._middlewares.forEach(middleware => {
      if (promise === null) {
        // First promise in chain
        promise = new Promise((resolve, reject) => {
          middleware(req, res, (err: any) => {
            if (!err) {
              resolve(true);
            } else {
              context.getResult().setError(err);
              resolve(false);
            }
          });
        });
      } else {
        // Next middlewares
        promise = promise.then(result => {
          // If the previous middleware failed do not execute the next one
          if (!result) return result;
          return new Promise((resolve, reject) => {
            middleware(req, res, (err: any) => {
              if (!err) {
                resolve(true);
              } else {
                context.getResult().setError(err);
                resolve(false);
              }
            });
          });
        });
      }
    });
    return promise;
  }
}
