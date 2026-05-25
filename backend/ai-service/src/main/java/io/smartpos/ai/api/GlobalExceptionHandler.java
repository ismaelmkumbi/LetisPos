package io.smartpos.ai.api;

import io.smartpos.common.context.TenantNotInContextException;
import io.smartpos.ai.application.ToolException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
        pd.setTitle("Validation failed");
        return pd;
    }

    @ExceptionHandler(TenantNotInContextException.class)
    public ProblemDetail tenantNotInContext(TenantNotInContextException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setTitle("Bad request");
        return pd;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail responseStatus(ResponseStatusException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
        pd.setTitle(ex.getStatusCode().toString());
        return pd;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail accessDenied(AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        pd.setTitle("Access Denied");
        return pd;
    }

    @ExceptionHandler(ToolException.class)
    public ProblemDetail toolException(ToolException ex) {
        HttpStatus status = switch (ex.code()) {
            case "INVALID_ARG" -> HttpStatus.BAD_REQUEST;
            case "NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            case "UNAVAILABLE", "UPSTREAM" -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_GATEWAY;
        };
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, ex.getMessage());
        pd.setTitle("Assistant action failed");
        pd.setProperty("code", ex.code());
        pd.setProperty("hint", ex.hint());
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail generic(Exception ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected error: " + ex.getMessage());
        pd.setTitle("Server error");
        return pd;
    }
}
