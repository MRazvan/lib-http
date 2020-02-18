# @mrazvan/lib-http

Library implementing a lib-host Runnable for HTTP servers. It is implemented to be used with [lib-host](https://github.com/MRazvan/lib-host). It is also using [lib-intercept](https://github.com/MRazvan/lib-intercept) for handling route execution and middlewares, and [lib-reflect](https://github.com/MRazvan/lib-reflect) for creating routes.

<!-- TOC -->
- [@mrazvan/lib-http](#mrazvanlib-http)
  - [Description](#description)
  - [Instalation](#instalation)
  - [Usage](#usage)
  - [*TODO*](#todo)
  - [Performance tips](#performance-tips)
  - [Benchmarks](#benchmarks)

## Description

**Short version**: It is an overgrown middleware composition helper + a node http server to be used with lib-host.

**Long version**: It is a bit more than that.

- It provides hook points to configure everything about how it composes / constructs / binds the routes so you can make your own attributes to indicate a method is an api.
- It provides a set of default attributes to be used by the handlers like @Query, @Body, @Header ...
- It provides an option to use [fast-json-stringify](https://github.com/fastify/fast-json-stringify) to serialize the json response if those extra RPS matter that much or you have other reasons like making sure you send only what is in the schema and nothing more.
- It works with express style middlewares that don't depend on the functionality added by express on the request. If those are needed, an implementation of IRouter interface to use express is needed.
- It's written so you pay the performance penalty on what you use and nothing more. Even if a body-parser executes a single if to find that it does not need to run on a GET, that is one 'method call' and 'one if' that does not need to run.

> **Important**
> 
> After the lib-http framework has done it's thing and constructed the routes, it is out of the way completely, the request will pass through the enabled middlewares and that is it. So it matters how the middlewares are constructed. 

What is better than less code?

No code. If the middleware does not need to run for a route make sure to either implement [IConfigureActivation](https://github.com/MRazvan/lib-intercept) or remove it when executing and finding out it's not needed on that route by using [remove<Before|After>Activation](https://github.com/MRazvan/lib-intercept) on the activation object. Ex. [json.schema.ts](src/interceptors/json.schema.ts)


Based on the above, you can add all middlewares for everything and decide at startup / run-time if you need to keep the middleware for the route or not.

## Instalation
```
npm i @mrazvan/lib-http
```

## Usage
```typescript
@Controller('/')
class MyApi {
  @Get('/')
  public handler(): string {
    return `Hello World!`;
  }
}

Host.build((container: Container, host:Host) => {
    HTTPFactory.create(container, host.config.scope('some_http'))
      .addModule(DynamicModule('API', { controllers: [MyApi] }));
    // const srv2 = HTTPFactory.create(container);
    // const srv3 = HTTPFactory.create(container);      
}).start({
  some_http: {
    port: 3000
  }
})
```

Multitude of [Examples](https://github.com/MRazvan/lib-http-examples)

## *TODO*

README

## Performance tips
By default the library will create an instance of the class and execute the method on that instance. That means it needs to create the class using the inversify container, it allows you to have a completely stateless api and inject in the class anything you need for that particular request, however that does have a cost in both memory and time.

- Use static methods (this will not create an instance of the class, however you can't inject anything in the class, you need to have context and take everyhing from there or multiple arguments injected by the middlewares)
- Implement the middlewares with performance in mind. Remove them if a route does not need the middleware either at startup or run-time.

## Benchmarks

It's dancing with fastify for the first place in the fastify benchmark.

[Project](https://github.com/MRazvan/benchmarks) containing the benchmark forked from fastify/benchmark

* __Machine:__ Windows 10 Enterprise | 6 core | 16GB.
* __Method:__ `autocannon -c 100 -d 40 -p 10 localhost:3000` (two rounds; one to warm-up, one to measure).
* __Node:__ `v10.16.0`

|                          | Router | Requests/s | Latency | Throughput/Mb |
| :--                      | --:    | :-:        | --:     | --:           |
| bare                     | ✗      | 64390.8    | 1.49    | 10.07         |
| express                  | ✓      | 40083.2    | 2.43    | 6.27          |
| lib-http                 | ✓      | 67637.6    | 1.42    | 10.58        |
| lib-http-big-json        | ✓      | 13226.2    | 7.45    | 151.88          |
| fastify                  | ✓      | 65866.4    | 1.46    | 10.30           |
| fastify-big-json         | ✓      | 12813.8    | 7.69    | 147.14        |
| koa                      | ✗      | 53052.0    | 1.82    | 8.30         |
| polka                    | ✓      | 63673.6    | 1.51    | 9.96          |