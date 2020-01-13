import { ClassData, Dynamic, DynamicClass } from 'lib-reflect';
import { HttpModule, HttpModuleData } from './attributes/http.module';

export function DynamicModule(name?: string, options?: Partial<HttpModuleData>): Function {
  // Generate a dynamic module to hold all the classes
  const cd: ClassData = Dynamic.createClass(
    (name || 'DynamicClassModule').replace(/[^a-zA-Z0-9_]+/g, ''),
    null,
    (cd: DynamicClass) => {
      // Decorate with the modules attribute that contain our classes
      cd.decorate(HttpModule(options));
      // We don't need to add anything else, we don't need to add an 'init' method because we don't have anything to init
    }
  );
  return cd.target;
}
