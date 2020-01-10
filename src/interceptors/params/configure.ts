import { IHttpServer } from '../../i.http';
import { BodyArgumentInterceptor } from './body';
import { ContextParamInterceptor } from './context';
import { CookieArgumentInterceptor } from './cookie';
import { HeaderArgumentInterceptor } from './header';
import { ParamArgumentInterceptor } from './param';
import { QueryArgumentInterceptor } from './query';

export function ConfigureDefaultParamInterceptors(srv: Readonly<IHttpServer>): void {
  srv.addGlobalInterceptor(BodyArgumentInterceptor);
  srv.addGlobalInterceptor(QueryArgumentInterceptor);
  srv.addGlobalInterceptor(ParamArgumentInterceptor);
  srv.addGlobalInterceptor(HeaderArgumentInterceptor);
  srv.addGlobalInterceptor(CookieArgumentInterceptor);
  srv.addGlobalInterceptor(ContextParamInterceptor);
}
