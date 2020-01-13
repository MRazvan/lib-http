@mrazvan/lib-http

Library implementing a Runnable for HTTP servers. It is implemented to be used with [lib-host](https://github.com/MRazvan/lib-host). It is also using [lib-intercept](https://github.com/MRazvan/lib-intercept) for handling routes, and [lib-reflect](https://github.com/MRazvan/lib-reflect) for creating routes.

**Short version**: Allow implementing API's the way the project requires, meaning using any the framework for routing, any project structure, any coding practice. It provides reasonable defaults and a set of hook points to configure everything except the actual HTTP server.

**Long version**: TODO

[Examples](https://github.com/MRazvan/lib-http-examples)

# Instalation
```
npm i @mrazvan/lib-http
```

# Usage
```typescript
const host = new Host() // lib-host host
host.addModule({
  init: (container: Container) {
    const srv1 = HTTPFactory.create(container);
    // const srv2 = HTTPFactory.create(container);
    // const srv3 = HTTPFactory.create(container);
    // .....
  }
})
```

# *TODO*
README