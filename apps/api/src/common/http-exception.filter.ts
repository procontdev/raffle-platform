import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void }; getHeader: (name: string) => string | undefined }>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof exceptionResponse === 'string' ? exceptionResponse : typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse ? (exceptionResponse as { message: string | string[] }).message : status >= 500 ? 'Internal server error' : 'Request failed';
    response.status(status).json({ statusCode: status, message, requestId: response.getHeader('X-Request-Id') ?? null, timestamp: new Date().toISOString() });
  }
}
