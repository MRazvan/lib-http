export enum ParamSource {
  None,
  Body,
  Param,
  Query,
  Header,
  Cookie
}

export class ParamDataDTO {
  public name: string;
  public defaultVal?: any;
  public source: ParamSource = ParamSource.None;
  public idx: number;
  constructor(data: Partial<ParamDataDTO>) {
    Object.assign(this, data);
  }
}
