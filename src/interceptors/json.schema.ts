/* eslint-disable @typescript-eslint/no-var-requires */
import * as fast from 'fast-json-stringify';
import { Container } from 'inversify';
import { IActivation, IAfterActivation, IConfigureActivation, KeepActivation } from 'lib-intercept';
import { ClassData, MethodData, MethodDecoratorFactory } from 'lib-reflect';
import { IHttpContext } from '../i.http';
const flatstr = require('flatstr');

const kJSONSerializerKey = 'kJSONSerializerKey';
const CONTENT_TYPE = 'application/json; charset=utf-8';

export const JsonSchema = (schema: fast.Schema, options?: fast.Options): MethodDecorator =>
  MethodDecoratorFactory((cd: ClassData, md: MethodData, desc: any) => {
    md.tags[kJSONSerializerKey] = fast(schema, options);
  });

export class JsonSerializer implements IConfigureActivation, IAfterActivation {
  public configure(activation: IActivation, container: Container): KeepActivation {
    if (activation.method.tags[kJSONSerializerKey] !== undefined) {
      return KeepActivation.AFTER;
    }
    return KeepActivation.NONE;
  }

  public after(context: IHttpContext): void {
    if (context.isSuccess()) {
      context.getResponse().headers()['Content-Type'] = CONTENT_TYPE;
      const method = context.getActivation().method;
      context.payload = flatstr(method.tags[kJSONSerializerKey](context.payload));
    }
  }
}