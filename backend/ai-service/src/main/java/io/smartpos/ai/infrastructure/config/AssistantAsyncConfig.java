package io.smartpos.ai.infrastructure.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.concurrent.Executor;

@Configuration
public class AssistantAsyncConfig {

    @Bean(name = "assistantTaskExecutor")
    public Executor assistantTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(4);
        exec.setMaxPoolSize(12);
        exec.setQueueCapacity(100);
        exec.setThreadNamePrefix("assistant-");
        exec.setTaskDecorator(contextCopyingDecorator());
        exec.setWaitForTasksToCompleteOnShutdown(true);
        exec.setAwaitTerminationSeconds(30);
        exec.initialize();
        return exec;
    }

    private TaskDecorator contextCopyingDecorator() {
        return task -> {
            SecurityContext securityContext = SecurityContextHolder.getContext();
            Map<String, String> mdc = MDC.getCopyOfContextMap();
            return () -> {
                try {
                    SecurityContextHolder.setContext(securityContext);
                    if (mdc != null) MDC.setContextMap(mdc);
                    task.run();
                } finally {
                    SecurityContextHolder.clearContext();
                    MDC.clear();
                }
            };
        };
    }
}
