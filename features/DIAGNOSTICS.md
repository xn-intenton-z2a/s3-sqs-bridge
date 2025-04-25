# DIAGNOSTICS Feature

## Overview
This feature consolidates diagnostics capabilities into a single endpoint set and CLI tool. It merges the existing status endpoint functionality with a new configuration dump capability. When invoked with the new CLI flag --config-dump, the application will output all key runtime configurations (with sensitive information masked) to help operators quickly verify the environment setup. This update streamlines troubleshooting and increases observability by uniting status, metrics, and configuration diagnostics into one cohesive diagnostics tool.

## Source File Updates (src/lib/main.js)
- Add a new exported function dumpConfig which gathers all relevant environment variables, including PG_CONNECTION_STRING, PG_MAX_RETRIES, PG_RETRY_DELAY_MS, GITHUB_PROJECTIONS_TABLE, STATUS_PORT, and METRICS_PORT.
- Within dumpConfig, mask sensitive information (using the existing maskConnectionString function) before outputting.
- Modify the main execution block to detect the --config-dump flag. If present, invoke dumpConfig; output the configuration as JSON to the console and exit.
- Retain the existing status endpoint functionality but update its documentation and logging to mention the new diagnostic capability.

## Test File Updates (tests/unit/main.test.js)
- Add new unit tests for dumpConfig to validate that the function returns the expected configuration object with masked sensitive fields (testing in a safe mode that bypasses process.exit).
- Update any tests affected by the merged diagnostics functionality, ensuring that endpoints (i.e. /status) still return the correct metrics, and that the new --config-dump flag yields the correct diagnostic output.

## Documentation Updates (README.md and docs/USAGE.md)
- Update the CLI Options section to document the new --config-dump flag, explaining that it outputs current configuration details with appropriate masking for sensitive data.
- Provide usage examples showing how to invoke the configuration dump for debugging environment settings.
- Note in the changelog and feature list that diagnostics have been consolidated, improving observability and troubleshooting.

## Benefits
- Enhances troubleshooting by allowing users to quickly dump and inspect current configuration parameters.
- Consolidates diagnostics under a single feature (DIAGNOSTICS) to reduce redundancy with the previous STATUS_ENDPOINT and EXPONENTIAL_BACKOFF features.
- Improves operational transparency by integrating configuration, status, and metrics information into one unified interface, in alignment with the mission of robust observability and ease of deployment.