package com.techie.microservices.order;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

final class DockerAvailableCondition implements ExecutionCondition {

	@Override
	public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
		try {
			if (DockerClientFactory.instance().isDockerAvailable()) {
				return ConditionEvaluationResult.enabled("Docker is available");
			}
		} catch (Throwable ex) {
			return ConditionEvaluationResult.disabled("Docker is not available: " + ex.getMessage());
		}

		return ConditionEvaluationResult.disabled("Docker is not available");
	}
}
