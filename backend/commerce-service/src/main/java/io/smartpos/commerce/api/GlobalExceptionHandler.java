package io.smartpos.commerce.api;

import io.smartpos.commerce.application.StoreService.StoreNotFoundException;
import io.smartpos.common.context.TenantNotInContextException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TenantNotInContextException.class)
    public ProblemDetail tenantNotInContext(TenantNotInContextException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setTitle("Bad request");
        return pd;
    }

    @ExceptionHandler(StoreNotFoundException.class)
    public ProblemDetail handleStoreNotFound(StoreNotFoundException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        pd.setTitle("Store not found");
        pd.setProperty("timestamp", Instant.now());
        return pd;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        pd.setTitle("Bad request");
        pd.setProperty("timestamp", Instant.now());
        return pd;
    }
}
