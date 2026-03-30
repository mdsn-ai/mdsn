export interface MdsnSourceLocation {
  line: number;
  column: number;
}

class MdsnBaseError extends Error {
  readonly location: MdsnSourceLocation | undefined;

  constructor(message: string, location?: MdsnSourceLocation) {
    super(message);
    this.name = new.target.name;
    this.location = location;
  }
}

export class MdsnParseError extends MdsnBaseError {}

export class MdsnValidationError extends MdsnBaseError {}
