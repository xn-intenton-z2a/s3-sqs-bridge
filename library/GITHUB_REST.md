# GITHUB_REST

## Crawl Summary
Authentication via personal tokens and GitHub App; CLI usage with gh auth login and gh api commands; Octokit.js SDK usage with new Octokit({ auth: 'YOUR-TOKEN' }) and octokit.request('GET /repos/{owner}/{repo}/issues', {owner, repo}); curl commands with proper headers including Accept and Authorization; API version specified with X-GitHub-Api-Version header; configuration details for GitHub Actions workflows that include steps for token generation and usage; troubleshooting via error.status and response error messages.

## Normalised Extract
Table of Contents:
1. Authentication Methods
   - Use personal access tokens, GitHub App tokens with app ID and private key.
   - Header format: Authorization: Bearer YOUR-TOKEN.
2. GitHub CLI Usage
   - Install: gh (available for macOS, Windows, Linux).
   - Authenticate: gh auth login; specify domain if not GitHub.com.
   - Example: gh api /octocat --method GET
3. Octokit.js SDK Usage
   - Install: npm install octokit
   - Import: import { Octokit } from "octokit";
   - Initialization: const octokit = new Octokit({ auth: 'YOUR-TOKEN' });
   - Request: await octokit.request("GET /repos/{owner}/{repo}/issues", { owner: "octocat", repo: "Spoon-Knife" });
4. curl Command Examples
   - Command: curl --request GET --url "https://api.github.com/repos/octocat/Spoon-Knife/issues" --header "Accept: application/vnd.github+json" --header "Authorization: Bearer YOUR-TOKEN"
5. API Versioning
   - Specify version using: X-GitHub-Api-Version:2022-11-28
   - Default version: 2022-11-28 if header omitted.
6. Configuration Best Practices
   - Use environment variable GH_TOKEN or GITHUB_TOKEN in workflows.
   - Store secrets securely (APP_PEM for GitHub App private key).
7. Troubleshooting
   - Validate tool installations (gh --version, curl --version).
   - In Octokit, catch errors and log error.status and error.response.data.message.

Each section contains exact commands, API endpoints, configuration parameters, and complete code usage patterns for direct implementation.

## Supplementary Details
Authentication: Token must be passed as 'Authorization: Bearer YOUR-TOKEN'. GitHub CLI: 'gh auth login' and 'gh api /endpoint --method METHOD'. Octokit Initialization: new Octokit({ auth: 'YOUR-TOKEN' }); Request format: await octokit.request('METHOD /repos/{owner}/{repo}/issues', { owner: 'octocat', repo: 'Spoon-Knife' });

API Versioning: Use header X-GitHub-Api-Version with value 2022-11-28. Curl usage commands need proper headers:
--header "Accept: application/vnd.github+json"
--header "Authorization: Bearer YOUR-TOKEN"

Configuration in GitHub Actions: Environments should set GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}. Sample YAML steps include checkout, setup-node (node-version: '16.17.0', cache: npm), installation of dependencies, token generation using actions/create-github-app-token@v1 with parameters app-id and private-key.

Best practices: Use GITHUB_TOKEN over personal tokens when possible; secure token storage; verify CLI installation and environment variables. Troubleshooting: Run commands from CLI and check error output. Use try/catch in scripts; log error status using error.status and error.response.data.message.

Exact parameters:
- Octokit.request accepts: method string, parameters object with required fields (owner: string, repo: string).
- GitHub App token generation requires variables: vars.APP_ID, secrets.APP_PEM.

## Reference Details
API Specifications:
1. GET /repos/{owner}/{repo}/issues
   - Method: GET
   - Parameters: owner (string), repo (string)
   - Return: JSON array of issues with fields like title, user.id, state, etc.

SDK Method Signature:
Function: octokit.request(endpoint: string, parameters: { owner: string, repo: string, ... }): Promise<Response>
Example:
  const octokit = new Octokit({ auth: 'YOUR-TOKEN' });
  await octokit.request("GET /repos/{owner}/{repo}/issues", { owner: "octocat", repo: "Spoon-Knife" });

CLI Usage:
Command: gh api /octocat --method GET
Environment: Set GH_TOKEN or use gh auth login for authentication.

Curl Example:
  curl --request GET \
       --url "https://api.github.com/repos/octocat/Spoon-Knife/issues" \
       --header "Accept: application/vnd.github+json" \
       --header "Authorization: Bearer YOUR-TOKEN"

Configuration Options:
- Header: X-GitHub-Api-Version: 2022-11-28 (ensures API versioning)
- Environment Variables: GH_TOKEN, GITHUB_TOKEN for secure token passing
- Actions Workflow YAML: steps include checkout (actions/checkout@v4), node setup (actions/setup-node@v4), dependency installation, and token generation using actions/create-github-app-token@v1

Implementation Pattern for GitHub Actions using Octokit.js:
1. Checkout repository
2. Setup Node with specified version ('16.17.0')
3. Run 'npm install octokit'
4. Execute script with node, using environment variable TOKEN

Troubleshooting Procedures:
- Command to check CLI: gh --version
- Check Node version: node -v
- For Octokit errors, use try/catch and log: console.log(`Error! Status: ${error.status}. Message: ${error.response.data.message}`)
- Verify token validity by manually testing curl command and checking for 200 OK response

Full Code Example (JavaScript):
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.TOKEN });

async function fetchIssues() {
  try {
    const result = await octokit.request("GET /repos/{owner}/{repo}/issues", {
      owner: "octocat",
      repo: "Spoon-Knife",
    });
    const issues = result.data.map(issue => ({ title: issue.title, authorID: issue.user.id }));
    console.log(issues);
  } catch (error) {
    console.log(`Error! Status: ${error.status}. Message: ${error.response.data.message}`);
  }
}

fetchIssues();

This set of specifications can be directly integrated into development environments.

## Information Dense Extract
Authentication: 'Authorization: Bearer YOUR-TOKEN', GitHub App: use app-id and private-key; CLI: 'gh auth login' then 'gh api /octocat --method GET'; Octokit: new Octokit({ auth: 'YOUR-TOKEN' }), method: octokit.request('GET /repos/{owner}/{repo}/issues', {owner: 'octocat', repo: 'Spoon-Knife'}); Curl: curl --request GET --url 'https://api.github.com/repos/octocat/Spoon-Knife/issues' --header 'Accept: application/vnd.github+json' --header 'Authorization: Bearer YOUR-TOKEN'; API Version: X-GitHub-Api-Version:2022-11-28; GitHub Actions YAML: uses actions/checkout@v4, actions/setup-node@v4 (node-version: '16.17.0', cache: npm), actions/create-github-app-token@v1 with app-id and private-key; Troubleshooting: check via gh --version, node -v, use try/catch logging error.status and error.response.data.message.

## Sanitised Extract
Table of Contents:
1. Authentication Methods
   - Use personal access tokens, GitHub App tokens with app ID and private key.
   - Header format: Authorization: Bearer YOUR-TOKEN.
2. GitHub CLI Usage
   - Install: gh (available for macOS, Windows, Linux).
   - Authenticate: gh auth login; specify domain if not GitHub.com.
   - Example: gh api /octocat --method GET
3. Octokit.js SDK Usage
   - Install: npm install octokit
   - Import: import { Octokit } from 'octokit';
   - Initialization: const octokit = new Octokit({ auth: 'YOUR-TOKEN' });
   - Request: await octokit.request('GET /repos/{owner}/{repo}/issues', { owner: 'octocat', repo: 'Spoon-Knife' });
4. curl Command Examples
   - Command: curl --request GET --url 'https://api.github.com/repos/octocat/Spoon-Knife/issues' --header 'Accept: application/vnd.github+json' --header 'Authorization: Bearer YOUR-TOKEN'
5. API Versioning
   - Specify version using: X-GitHub-Api-Version:2022-11-28
   - Default version: 2022-11-28 if header omitted.
6. Configuration Best Practices
   - Use environment variable GH_TOKEN or GITHUB_TOKEN in workflows.
   - Store secrets securely (APP_PEM for GitHub App private key).
7. Troubleshooting
   - Validate tool installations (gh --version, curl --version).
   - In Octokit, catch errors and log error.status and error.response.data.message.

Each section contains exact commands, API endpoints, configuration parameters, and complete code usage patterns for direct implementation.

## Original Source
GitHub REST API Documentation
https://docs.github.com/en/rest

## Digest of GITHUB_REST

# GitHub REST API Documentation

Retrieved: 2023-10-06

## Overview
The GitHub REST API allows integration with GitHub for creating integrations, obtaining data, and automating workflows. The API is versioned (e.g., 2022-11-28) with breaking and additive changes defined. This document includes detailed method calls, authentication techniques, CLI usage, and SDK patterns, with full code examples and configuration parameters.

## Table of Contents
1. Authentication Methods
2. GitHub CLI Usage
3. Octokit.js SDK Usage
4. curl Command Examples
5. API Versioning and Headers
6. Configuration and Best Practices
7. Troubleshooting Procedures

## 1. Authentication Methods
### Personal Access Token / OAuth
- Use a token with required scopes. Example header: Authorization: Bearer YOUR-TOKEN.

### GitHub App Authentication
- Create installation token using app id and private key. Token expires in 60 minutes.

## 2. GitHub CLI Usage
### Installation and Login
- Install GitHub CLI for macOS/Windows/Linux.
- Authenticate using: gh auth login
- For GitHub domains different from github.com, select Other and provide hostname.

### API Request Example using CLI
Command:
  gh api /octocat --method GET

For GitHub Actions workflows:
- Set environment variable GH_TOKEN (often GITHUB_TOKEN) and use:
  gh api https://api.github.com/repos/octocat/Spoon-Knife/issues

## 3. Octokit.js SDK Usage
### Installation and Import
- Install via npm: npm install octokit
- Import using: import { Octokit } from "octokit";

### Creating Instance and Request
Method signature:
  const octokit = new Octokit({ auth: 'YOUR-TOKEN' });
Example request:
  await octokit.request("GET /repos/{owner}/{repo}/issues", { owner: "octocat", repo: "Spoon-Knife" });

### In GitHub Actions
Workflow steps include setting up Node, installing octokit, and running a script using process.env.TOKEN.

## 4. curl Command Examples
### Direct Command
- Example command:
  curl --request GET \
       --url "https://api.github.com/repos/octocat/Spoon-Knife/issues" \
       --header "Accept: application/vnd.github+json" \
       --header "Authorization: Bearer YOUR-TOKEN"

### In GitHub Actions
- Use environment variable GH_TOKEN and similar curl command as above.

## 5. API Versioning and Headers
### Specifying API Version
- Use header: X-GitHub-Api-Version:2022-11-28
- Command example:
  curl --header "X-GitHub-Api-Version:2022-11-28" https://api.github.com/zen

### Handling Version Changes
- Breaking changes include parameter renaming, type changes, new required parameters etc.
- Additive changes are backward compatible.

## 6. Configuration and Best Practices
### GitHub CLI & Octokit Configuration
- CLI: Configure authentication once with gh auth login.
- Octokit: Configure via new Octokit({ auth: process.env.TOKEN })

### Security Best Practices
- Store tokens as secrets (e.g. GH_TOKEN, APP_PEM).
- Use GITHUB_TOKEN where possible for automatic authentication.

## 7. Troubleshooting Procedures
### Common Troubleshooting Steps
- For CLI errors: Verify installation with gh --version and check authentication status.
- For Octokit requests: Catch errors, log error.status and error.response.data.message.
- Example JS error handling:
  try {
    const result = await octokit.request(...);
  } catch (error) {
    console.log(`Error! Status: ${error.status}. Message: ${error.response.data.message}`);
  }

## Attribution
Data size during crawl: 1363454 bytes. Links found: 13331. No errors reported.


## Attribution
- Source: GitHub REST API Documentation
- URL: https://docs.github.com/en/rest
- License: License: Not Applicable
- Crawl Date: 2025-04-25T19:41:56.817Z
- Data Size: 1363454 bytes
- Links Found: 13331

## Retrieved
2025-04-25
