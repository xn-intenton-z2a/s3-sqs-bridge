# EXPRESS_MIDDLEWARE

## Crawl Summary
Middleware signature: (req, res, next) => void. Types: application-level (app.use, app.METHOD), router-level (router.use, router.METHOD), error-handling (err, req, res, next), built-in (express.static, express.json, express.urlencoded), third-party (e.g., cookie-parser). Register app-level: app.use([path], ...handlers), app.METHOD(path, ...handlers). Register router-level: const router=express.Router(); router.use([path],...); router.METHOD([path],...). Skip route middleware: next('route') only inside app.METHOD or router.METHOD handlers. Skip entire router: next('router'). Error handlers require four args. express.static(root, options) serves static files; mount multiple in order; mount path prefix via app.use('/static',express.static(path)). express.json([options]) and express.urlencoded([options]) parse payloads. Install third-party: npm install, then app.use(middleware()).

## Normalised Extract
Table of Contents
1. Middleware function signature
2. Types of middleware
3. Application-level registration
4. Router-level registration
5. Skipping handlers: next('route') and next('router')
6. Error-handling middleware
7. Built-in middleware functions
8. Third-party middleware loading

1. Middleware function signature
   (req, res, next) => void  Access req, res; call next() unless ending response

2. Types of middleware
   • Application-level
   • Router-level
   • Error-handling
   • Built-in
   • Third-party

3. Application-level registration
   app.use([mountPath], handler1, handler2, ...)
   app.METHOD(mountPath, handler1, handler2, ...)
   Handlers execute in order; omit mountPath for all requests

4. Router-level registration
   const router = express.Router()
   router.use([mountPath], handler...)
   router.METHOD(mountPath, handler...)
   app.use(basePath, router)

5. Skipping handlers
   In METHOD handlers use next('route') to skip remaining in-stack handlers and jump to next route definition
   In router middleware use next('router') to exit router and continue in parent app stack

6. Error-handling middleware
   Signature: (err, req, res, next) => void
   Must specify four parameters to be recognized
   Place after all other middleware and routes

7. Built-in middleware functions
   express.static(root, [options])
   express.json([options])
   express.urlencoded([options])
   Mount via app.use(…)

8. Third-party middleware loading
   Install: npm install module-name
   Load: const mod = require('module-name')
   Register: app.use(mod([options]))

## Supplementary Details
• express.static options: maxAge default 0; set etag true; extensions []; index 'index.html'• For safe static serving use absolute path: const path = require('path'); app.use('/static', express.static(path.join(__dirname,'public')))• Load multiple static dirs in sequence: app.use(express.static('public')); app.use(express.static('files'))• express.json options: inflate true; limit '100kb'; type 'application/json'; verify undefined• express.urlencoded options: extended false; inflate true; limit '100kb'; parameterLimit 1000; type 'application/x-www-form-urlencoded'• Best practice: register JSON and URL-encoded parsers before routes that consume req.body• Always place error handler last: app.use((err,req,res,next)=>{})• Use router-level middleware to group related routes and isolate error handling• Avoid hanging requests: every middleware must call next() or terminate response• Order matters: first-match routing; avoid duplicate GET handlers that send responses• Use mount paths to scope middleware to subsets of routes

## Reference Details
Application methods
• app.use(path?: string|RegExp, ...handlers: RequestHandler[]): Express.Application
• app.METHOD(path: string, ...handlers: RequestHandler[]): Express.Application  METHODS: get, post, put, delete, patch, all, options, head

Router methods
• router.use(path?: string|RegExp, ...handlers: RequestHandler[]): Router
• router.METHOD(path: string, ...handlers: RequestHandler[]): Router

Middleware signatures
• RequestHandler: (req: Request, res: Response, next: NextFunction) => void
• ErrorRequestHandler: (err: any, req: Request, res: Response, next: NextFunction) => void

Skipping handlers
• next(): pass to next handler in stack
• next('route'): skip remaining handlers of current route, jump to next route matching same path and method
• next('router'): exit current router instance, continue in parent stack

Built-in middleware
• static: express.static(root: string, options?: ServeStaticOptions) => RequestHandler
  options keys: dotfiles 'ignore'|'allow'|'deny'; etag boolean; extensions string[]; index string|string[]; maxAge number|string; redirect boolean; setHeaders Function
• json: express.json(options?: { inflate?:boolean; limit?:number|string; reviver?:Function; strict?:boolean; type?:string|Function; verify?:Function }) => RequestHandler
• urlencoded: express.urlencoded(options?: { extended?:boolean; inflate?:boolean; limit?:number|string; parameterLimit?:number; type?:string|Function; verify?:Function }) => RequestHandler

Third-party
• cookie-parser: require('cookie-parser'); app.use(cookieParser(secret?: string, options?: cookieParser.CookieParseOptions))

Examples
Reusing middleware array:
function logOriginalUrl(req,res,next){next()}
const logStuff=[logOriginalUrl,logMethod]
app.get('/user/:id',logStuff,(req,res)=>res.send('User Info'))

Error handler registration:
app.use((err,req,res,next)=>{res.status(500).send('Something broke!')})

Troubleshooting
Command: npm ls express middleware
Output: locate duplicate express versions and conflicting middleware
Check hanging requests by inserting console.log before next()
Enable debug: DEBUG=express:* node app.js
Use reverse proxy cache for static assets performance

## Information Dense Extract
Middleware signature(req,res,next)void; app.use([path],…handlers) registers application middleware; app.METHOD(path,…handlers) registers route handlers; router.use and router.METHOD for router-level; next() yields to next handler; next('route') skips to next route; next('router') exits router; error handlers signature(err,req,res,next)void must have 4 args; express.static(root,options) serves files; express.json(options) parses JSON; express.urlencoded(options) parses URL-encoded; install third-party via npm and app.use(parser()); static options:maxAge,etag,extensions,index; urlencoded option extended; register parsers before routes; place error handler last; use absolute paths for static; always call next or end response.

## Sanitised Extract
Table of Contents
1. Middleware function signature
2. Types of middleware
3. Application-level registration
4. Router-level registration
5. Skipping handlers: next('route') and next('router')
6. Error-handling middleware
7. Built-in middleware functions
8. Third-party middleware loading

1. Middleware function signature
   (req, res, next) => void  Access req, res; call next() unless ending response

2. Types of middleware
    Application-level
    Router-level
    Error-handling
    Built-in
    Third-party

3. Application-level registration
   app.use([mountPath], handler1, handler2, ...)
   app.METHOD(mountPath, handler1, handler2, ...)
   Handlers execute in order; omit mountPath for all requests

4. Router-level registration
   const router = express.Router()
   router.use([mountPath], handler...)
   router.METHOD(mountPath, handler...)
   app.use(basePath, router)

5. Skipping handlers
   In METHOD handlers use next('route') to skip remaining in-stack handlers and jump to next route definition
   In router middleware use next('router') to exit router and continue in parent app stack

6. Error-handling middleware
   Signature: (err, req, res, next) => void
   Must specify four parameters to be recognized
   Place after all other middleware and routes

7. Built-in middleware functions
   express.static(root, [options])
   express.json([options])
   express.urlencoded([options])
   Mount via app.use()

8. Third-party middleware loading
   Install: npm install module-name
   Load: const mod = require('module-name')
   Register: app.use(mod([options]))

## Original Source
Node.js Runtime and Express Framework Documentation
https://expressjs.com/en/guide/using-middleware.html

## Digest of EXPRESS_MIDDLEWARE

# Application-level middleware

Bind application-level middleware to an app instance using app.use() or app.METHOD(). METHOD is an HTTP verb in lowercase (get, post, put, delete, etc.). Middleware signature: (req, res, next) => void. Handlers execute in registration order and must call next() or end the response.

Example: No mount path, executed for every request:

const express = require('express')
const app = express()

app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

Example: Mounted on /user/:id, executes for any HTTP method on that path:

app.use('/user/:id', (req, res, next) => {
  console.log('Request Type:', req.method)
  next()
})

Example: Route handler for GET /user/:id:

app.get('/user/:id', (req, res, next) => {
  res.send('USER')
})

Sub-stack at mount point /user/:id:

app.use('/user/:id',
  (req, res, next) => {
    console.log('Request URL:', req.originalUrl)
    next()
  },
  (req, res, next) => {
    console.log('Request Type:', req.method)
    next()
  }
)

Example: Multiple GET handlers for /user/:id; first ends cycle, second never called:

app.get('/user/:id', (req, res, next) => {
  console.log('ID:', req.params.id)
  next()
}, (req, res, next) => {
  res.send('User Info')
})

app.get('/user/:id', (req, res, next) => {
  res.send(req.params.id)
})

Skip remaining middleware in a route stack: call next('route') within a handler loaded via app.METHOD or router.METHOD:

app.get('/user/:id', (req, res, next) => {
  if (req.params.id === '0') next('route')
  else next()
}, (req, res) => {
  res.send('regular')
})

app.get('/user/:id', (req, res) => {
  res.send('special')
})

Declare reusable middleware as array:

function logOriginalUrl(req, res, next) {
  console.log('Request URL:', req.originalUrl)
  next()
}

function logMethod(req, res, next) {
  console.log('Request Type:', req.method)
  next()
}

const logStuff = [logOriginalUrl, logMethod]
app.get('/user/:id', logStuff, (req, res) => {
  res.send('User Info')
})

# Router-level middleware

Use express.Router() to create a router instance. Register middleware with router.use() or router.METHOD(). Mount router on an app path.

const express = require('express')
const app = express()
const router = express.Router()

router.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

router.use('/user/:id', (req, res, next) => {
  console.log('Request URL:', req.originalUrl)
  next()
}, (req, res, next) => {
  console.log('Request Type:', req.method)
  next()
})

router.get('/user/:id', (req, res, next) => {
  if (req.params.id === '0') next('route')
  else next()
}, (req, res) => {
  res.render('regular')
})

router.get('/user/:id', (req, res) => {
  console.log(req.params.id)
  res.render('special')
})

app.use('/', router)

Skip out of router stack: call next('router'):

router.use((req, res, next) => {
  if (!req.headers['x-auth']) return next('router')
  next()
})

router.get('/user/:id', (req, res) => {
  res.send('hello, user!')
})

app.use('/admin', router, (req, res) => {
  res.sendStatus(401)
})

# Error-handling middleware

Signature: (err, req, res, next) => void. Must have four arguments to be recognized as error handler.

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

# Built-in middleware

express.static serves static assets.
Signature: express.static(root, [options])

express.json parses JSON payloads.
Signature: express.json([options])
Note: Available with Express 4.16.0+

express.urlencoded parses URL-encoded payloads.
Signature: express.urlencoded([options])
Note: Available with Express 4.16.0+

# Third-party middleware

Install via npm and load at application or router level.

Example: cookie-parser

$ npm install cookie-parser

const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')

app.use(cookieParser())

## Attribution
- Source: Node.js Runtime and Express Framework Documentation
- URL: https://expressjs.com/en/guide/using-middleware.html
- License: License: MIT
- Crawl Date: 2025-05-02T20:08:39.990Z
- Data Size: 8798000 bytes
- Links Found: 21021

## Retrieved
2025-05-02
