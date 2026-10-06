export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly status = 'error',
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication is required.') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found.') {
    super(message, 404);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string) {
    super(message, 503);
  }
}
