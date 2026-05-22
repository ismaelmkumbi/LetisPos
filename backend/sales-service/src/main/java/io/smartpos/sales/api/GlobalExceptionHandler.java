package io.smartpos.sales.api;

import feign.FeignException;
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
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, msg);
        pd.setTitle("Validation failed");
        return pd;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail statusEx(ResponseStatusException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
        pd.setTitle(ex.getStatusCode().toString());
        return pd;
    }

    @ExceptionHandler(FeignException.class)
    public ProblemDetail feign(FeignException ex) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        if (status == null || status.value() < 400) status = HttpStatus.BAD_GATEWAY;
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status,
                "Downstream call failed: " + safe(ex.contentUTF8()));
        pd.setTitle("Downstream error");
        return pd;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail accessDenied(AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        pd.setTitle("Access Denied");
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail generic(Exception ex) {
        // Handle TenantNotInContextException without depending on the class at compile time
        if (ex.getClass().getName().contains("TenantNotInContextException")) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
            pd.setTitle("Bad request");
            return pd;
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected error: " + ex.getMessage());
        pd.setTitle("Server error");
        return pd;
    }

    private static String safe(String s) {
        if (s == null || s.isBlank()) return "(no detail)";
        return s.length() > 500 ? s.substring(0, 500) + "…" : s;
    }
}
