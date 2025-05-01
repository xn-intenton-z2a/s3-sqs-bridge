# GITHUB_WEBHOOKS

## Crawl Summary
Payload capped at 25 MB; dropped if larger.  Delivery headers: X-GitHub-Hook-ID (int), X-GitHub-Event (string), X-GitHub-Delivery (GUID), X-Hub-Signature (sha1), X-Hub-Signature-256 (sha256), User-Agent (GitHub-Hookshot/), X-GitHub-Hook-Installation-Target-Type (string), X-GitHub-Hook-Installation-Target-ID (int).  Example POST request with JSON payload for issues event.

## Normalised Extract
Table of Contents:
1. Payload Cap
2. Delivery Headers
3. Example Delivery
4. Event Payload Structure

1. Payload Cap
   limit 25 MB; drop payloads >25 MB; monitor with Content-Length header

2. Delivery Headers
   X-GitHub-Hook-ID: int
   X-GitHub-Event: string
   X-GitHub-Delivery: GUID
   X-Hub-Signature: sha1=HEX
   X-Hub-Signature-256: sha256=HEX
   User-Agent: GitHub-Hookshot/ID
   X-GitHub-Hook-Installation-Target-Type: repository|organization
   X-GitHub-Hook-Installation-Target-ID: int

3. Example Delivery
   Method: POST
   Endpoint: /payload
   Headers: see Delivery Headers
   Content-Type: application/json
   Body: JSON with action, payload objects: issue.number int, repository.id int, repository.full_name string, sender.login string, sender.id int

4. Event Payload Structure (issues)
   action: string Required e.g. opened|edited|deleted
   issue: object { url string, number int, title string, body string, user { login string, id int }, labels array }
   repository: object { id int, full_name string, owner { login string, id int }, private boolean }
   sender: object { login string, id int }


## Supplementary Details
1. Header Verification Steps:  compute HMAC-SHA256 of raw body with secret: openssl dgst -sha256 -hmac "SECRET" | cut -d ' ' -f2 compare to X-Hub-Signature-256 header
2. Subscribing: Create webhook via REST API POST /repos/:owner/:repo/hooks body: { name: "web", active: true, events: ["issues"], config: { url: "https://example.com/payload", content_type: "json", secret: "SECRET", insecure_ssl: "0" } }
3. Handling large payloads: use server-side buffer limits; reject if Content-Length > 25*1024*1024


## Reference Details
REST API: Create webhook
POST /repos/{owner}/{repo}/hooks
Parameters:
  owner (string) required
  repo (string) required
  name (string) required: "web"
  active (boolean) default true
  events (array[string]) e.g. ["issues"]
  config (object) {
    url (string) required, content_type (string) "json" or "form", secret (string), insecure_ssl (string) "0" or "1"
  }
Returns: Hook object { id int, type string, name string, active boolean, events array, config object }

Webhook Payload Example for issues:
action (string) opened|edited|deleted
issue (object) { url string, number int, title string, user object { login string, id int }, state string open|closed }
repository (object) { id int, name string, full_name string, private boolean }
sender (object) { login string, id int }

Best Practices:
- Subscribe only to needed events
- Verify signatures before processing
- Respond 200 within 10s, else redelivery after 5 min

Troubleshooting:
Check signature:
  RAW_BODY=$(cat request.body)
  SIGNATURE=$(echo -n "$RAW_BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d ' ' -f2)
  if [ "$SIGNATURE" != "${HTTP_X_HUB_SIGNATURE_256#sha256=}" ]; then exit 1; fi
Check logs: return code 2xx, inspect X-GitHub-Delivery header for troubleshooting in GitHub UI


## Information Dense Extract
payload_limit=25MB;headers=[X-GitHub-Hook-ID:int,X-GitHub-Event:str,X-GitHub-Delivery:GUID,X-Hub-Signature:sha1=HEX,X-Hub-Signature-256:sha256=HEX,User-Agent:GitHub-Hookshot/,X-GitHub-Hook-Installation-Target-Type:str,X-GitHub-Hook-Installation-Target-ID:int];REST:create webhook POST /repos/{owner}/{repo}/hooks{name:web,active:true,events:[...],config:{url:str,content_type:json,secret:str,insecure_ssl:0}};issues_payload={action:str,issue:{url:str,number:int,title:str,user:{login:str,id:int},state:str},repository:{id:int,name:str,full_name:str,private:bool},sender:{login:str,id:int}};verify_sig:openssl dgst -sha256 -hmac SECRET|cut -d ' ' -f2 vs header;respond_200<10s;redeliver_after=5min

## Sanitised Extract
Table of Contents:
1. Payload Cap
2. Delivery Headers
3. Example Delivery
4. Event Payload Structure

1. Payload Cap
   limit 25 MB; drop payloads >25 MB; monitor with Content-Length header

2. Delivery Headers
   X-GitHub-Hook-ID: int
   X-GitHub-Event: string
   X-GitHub-Delivery: GUID
   X-Hub-Signature: sha1=HEX
   X-Hub-Signature-256: sha256=HEX
   User-Agent: GitHub-Hookshot/ID
   X-GitHub-Hook-Installation-Target-Type: repository|organization
   X-GitHub-Hook-Installation-Target-ID: int

3. Example Delivery
   Method: POST
   Endpoint: /payload
   Headers: see Delivery Headers
   Content-Type: application/json
   Body: JSON with action, payload objects: issue.number int, repository.id int, repository.full_name string, sender.login string, sender.id int

4. Event Payload Structure (issues)
   action: string Required e.g. opened|edited|deleted
   issue: object { url string, number int, title string, body string, user { login string, id int }, labels array }
   repository: object { id int, full_name string, owner { login string, id int }, private boolean }
   sender: object { login string, id int }

## Original Source
GitHub API and Webhooks Documentation
https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads

## Digest of GITHUB_WEBHOOKS

# Payload Cap

Max payload size: 25 MB.  If a generated payload exceeds 25 MB, delivery is dropped.  Monitor payload size.  On create events with many refs, use filtering or smaller payloads.

# Delivery Headers

Each HTTP POST includes:

X-GitHub-Hook-ID      integer   Unique webhook identifier
X-GitHub-Event        string    Event name (e.g. issues, push)
X-GitHub-Delivery     GUID      Unique delivery identifier
X-Hub-Signature       sha1=HEX  HMAC-SHA1 digest of request body, secret as key (legacy)
X-Hub-Signature-256   sha256=HEX  HMAC-SHA256 digest of request body, secret as key
User-Agent            string    Always starts with GitHub-Hookshot/
X-GitHub-Hook-Installation-Target-Type string  Type of installation resource (repository, organization)
X-GitHub-Hook-Installation-Target-ID   integer  Installation resource ID

# Example Webhook Delivery

POST /payload HTTP/1.1
X-GitHub-Delivery: 72d3162e-cc78-11e3-81ab-4c9367dc0958
X-Hub-Signature: sha1=7d38cdd689735b008b3c702edd92eea23791c5f6
X-Hub-Signature-256: sha256=d57c68ca6f92289e6987922ff26938930f6e66a2d161ef06abdf1859230aa23c
User-Agent: GitHub-Hookshot/044aadd
Content-Type: application/json; charset=utf-8
Content-Length: 6615
X-GitHub-Event: issues
X-GitHub-Hook-ID: 292430182
X-GitHub-Hook-Installation-Target-ID: 79929171
X-GitHub-Hook-Installation-Target-Type: repository

{
  "action": "opened",
  "issue": { "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347", "number": 1347, ... },
  "repository": { "id": 1296269, "full_name": "octocat/Hello-World", "owner": { "login": "octocat", "id": 1 } },
  "sender": { "login": "octocat", "id": 1 }
}


## Attribution
- Source: GitHub API and Webhooks Documentation
- URL: https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads
- License: License: Not Applicable
- Crawl Date: 2025-05-01T11:21:03.900Z
- Data Size: 3711731 bytes
- Links Found: 12814

## Retrieved
2025-05-01
