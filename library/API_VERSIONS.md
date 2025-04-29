# API_VERSIONS

## Crawl Summary
Use X-GitHub-Api-Version header (YYYY-MM-DD) to pin API version. Default when omitted is 2022-11-28. Unsupported versions return 400. Retrieve supported versions via GET /meta. Upgrade by reading changelog, updating header, adjusting code, and testing. Versions supported 24 months.

## Normalised Extract
Table of Contents
1. Version Format
2. Header Usage
3. Default Version
4. Error Handling
5. Supported Versions Endpoint
6. Upgrade Steps

1. Version Format
Date-based format: YYYY-MM-DD. Current supported version: 2022-11-28.

2. Header Usage
Header name: X-GitHub-Api-Version
Value: exact release date string.
Example: X-GitHub-Api-Version: 2022-11-28

3. Default Version
If header omitted, server uses 2022-11-28.

4. Error Handling
On unsupported version: HTTP 400. Inspect response body for error code and message.

5. Supported Versions Endpoint
    Method: GET
    Path: https://api.github.com/meta
    Headers:
      Accept: application/vnd.github+json
      Authorization: Bearer <TOKEN>
      X-GitHub-Api-Version: 2022-11-28
    Response JSON schema:
      installed_version: string
      supported_api_versions: [string]

6. Upgrade Steps
Step 1: Read breaking changes in changelog for new version.
Step 2: Replace header value in all API requests.
Step 3: Adjust any deprecated parameter usage per changelog.
Step 4: Run integration tests.
Step 5: Deploy when tests pass.

## Supplementary Details
Version string must match YYYY-MM-DD exactly. Header must be sent in every API request when pinning version. Default header value equals current latest stable version. API rejects unknown or expired version values with 400 status. Supported versions remain valid for 24 months. To discover versions programmatically, call GET /meta with proper headers. Use consistent version across all requests in integration release.

## Reference Details
Curl example: Retrieve supported API versions via /meta

curl --request GET \
  --url https://api.github.com/meta \
  --header "Accept: application/vnd.github+json" \
  --header "Authorization: Bearer YOUR_TOKEN" \
  --header "X-GitHub-Api-Version: 2022-11-28"

Response example (200 OK):
{
  "installed_version": "2022-11-28",
  "supported_api_versions": [
    "2022-11-28",
    "2023-01-15",
    "2023-04-10"
  ]
}

Troubleshooting:
Command: curl ... with invalid version
Expected: HTTP/1.1 400 Bad Request
Body: {"message":"X-GitHub-Api-Version header value '2021-10-01' is not supported"}

Best Practice:
Always set X-GitHub-Api-Version header in CI/CD workflows and client libraries. Pin version per release and update quarterly. Monitor changelog at https://docs.github.com/en/rest/overview/api-versions for new version announcements.

## Information Dense Extract
2022-11-28; header X-GitHub-Api-Version: <YYYY-MM-DD>; default version when absent=2022-11-28; unsupported version→400; GET /meta returns {installed_version:string, supported_api_versions:[string]}; version support=24 months; upgrade flow=read changelog→set header→adjust code→test→deploy.

## Sanitised Extract
Table of Contents
1. Version Format
2. Header Usage
3. Default Version
4. Error Handling
5. Supported Versions Endpoint
6. Upgrade Steps

1. Version Format
Date-based format: YYYY-MM-DD. Current supported version: 2022-11-28.

2. Header Usage
Header name: X-GitHub-Api-Version
Value: exact release date string.
Example: X-GitHub-Api-Version: 2022-11-28

3. Default Version
If header omitted, server uses 2022-11-28.

4. Error Handling
On unsupported version: HTTP 400. Inspect response body for error code and message.

5. Supported Versions Endpoint
    Method: GET
    Path: https://api.github.com/meta
    Headers:
      Accept: application/vnd.github+json
      Authorization: Bearer <TOKEN>
      X-GitHub-Api-Version: 2022-11-28
    Response JSON schema:
      installed_version: string
      supported_api_versions: [string]

6. Upgrade Steps
Step 1: Read breaking changes in changelog for new version.
Step 2: Replace header value in all API requests.
Step 3: Adjust any deprecated parameter usage per changelog.
Step 4: Run integration tests.
Step 5: Deploy when tests pass.

## Original Source
GitHub REST API Documentation
https://docs.github.com/en/rest

## Digest of API_VERSIONS

# API VERSIONING
Date Retrieved: 2024-06-10
Data Size Retrieved: 1613065 bytes

## Version Format
The GitHub REST API uses date-based versioning. Each version name is the release date in YYYY-MM-DD format. Example: 2022-11-28.

## Specifying an API Version
Include HTTP header:
X-GitHub-Api-Version: 2022-11-28

Requests without this header default to version 2022-11-28.

## Unsupported Version Response
If the specified version is no longer supported, the API responds with HTTP 400 Bad Request.

## Supported API Versions Endpoint
Method: GET
Path: /meta
Headers:
  Accept: application/vnd.github+json
  Authorization: Bearer <token>
  X-GitHub-Api-Version: <version>
Response JSON fields:
  installed_version: string
  supported_api_versions: array of strings

## Upgrade Procedure
1. Review changelog for new version release date and breaking changes.
2. Update X-GitHub-Api-Version header to new YYYY-MM-DD version.
3. Modify integration code for any breaking-change adjustments.
4. Execute full test suite against new version.
5. Deploy updated integration.

## Version Support Policy
Each version is supported for at least 24 months after release.

## Attribution
- Source: GitHub REST API Documentation
- URL: https://docs.github.com/en/rest
- License: License: Not Applicable
- Crawl Date: 2025-04-29T04:48:02.181Z
- Data Size: 1613065 bytes
- Links Found: 14299

## Retrieved
2025-04-29
