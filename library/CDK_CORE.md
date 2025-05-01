# CDK_CORE

## Crawl Summary
Installation: package.json peerDependencies aws-cdk-lib ^2.38.0 constructs ^10.0.0 devDependencies aws-cdk-lib 2.38.0. For apps dependencies aws-cdk-lib ^2.38.0 constructs ^10.0.0
Imports: classic import import { Stack App aws_s3 as s3 } from aws-cdk-lib; barrel import import {App Stack} from aws-cdk-lib import {Bucket} from aws-cdk-lib/aws-s3
StackProps: env {account:string region:string} synthesizer IStackSynthesizer terminationProtection:boolean description:string crossRegionReferences:boolean
Synthesizers: DefaultStackSynthesizer(props:{fileAssetsBucketName?:string;cloudAssemblyArtifact?:string;qualifier?:string}); LegacyStackSynthesizer(); CliCredentialsStackSynthesizer()
Nested & cross-stack refs: use cfn.NestedStack; automatic CloudFormation Export/Import; crossRegionReferences=true uses SSM Parameter custom resource, name '/cdk/exports/${consumingStack}/${export-name}'
Duration: static factories seconds, minutes, hours, days, parse; plus plus and minus methods
Size: static factories kibibytes, mebibytes, gibibytes, tebibytes, pebibytes; toKibibytes and toMebibytes(routing)
SecretValue: sources unsafePlainText, secretsManager(secretId,jsonField?,versionId?,versionStage?), ssmSecure, cfnParameter, cfnDynamicReference, resourceAttribute
ARN: Stack.formatArn({service,resource,arnFormat?,resourceName?,region?,account?}); Stack.splitArn(arn,arnFormat?)
Dependencies: constructA.node.addDependency(constructB) or use DependencyGroup; stackA.addDependency(stackB)
CustomResource: CustomResource(props:{resourceType:string,serviceToken:string,properties?}); CustomResourceProvider.getOrCreate(scope,type,props); customresources.Provider(props:{onEventHandler,isCompleteHandler?})
CloudFormation low-level: CfnOutput, CfnParameter, Fn functions base64,conditionEquals,conditionAnd,toJsonString,split; CfnMapping mapping and lazy sections

## Normalised Extract
Table of Contents
1 Installation & Versioning
2 Import Patterns
3 Stack Definition & StackProps
4 Synthesizers
5 Nested Stacks & Cross-Stack References
6 Duration & Size
7 SecretValue Sources
8 ARN Manipulation
9 Dependencies
10 Custom Resource & Providers
11 Low-Level CloudFormation

1 Installation & Versioning
peerDependencies
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0
devDependencies
  aws-cdk-lib: 2.38.0

dependencies
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0

2 Import Patterns
Classic: import { Stack App aws_s3 as s3 } from 'aws-cdk-lib'
Barrel: import { App Stack } from 'aws-cdk-lib'
        import { Bucket } from 'aws-cdk-lib/aws-s3'

3 Stack Definition & StackProps
class MyStack extends Stack
 constructor(scope: Construct, id: string, props?: StackProps)

StackProps fields
  env?                    { account?: string; region?: string }
  synthesizer?            IStackSynthesizer
  terminationProtection?  boolean
  description?            string
  crossRegionReferences?  boolean

4 Synthesizers
new DefaultStackSynthesizer({ fileAssetsBucketName?: string, cloudAssemblyArtifact?: string, qualifier?: string })
new LegacyStackSynthesizer()
new CliCredentialsStackSynthesizer()

5 Nested Stacks & Cross-Stack References
class MyNestedStack extends cfn.NestedStack
NestedStackProps extends StackProps
Automatic cross-stack export/import for same account/region
Enable crossRegionReferences to true to allow cross-region via SSM parameters
SSM parameter path /cdk/exports/${consumingStackName}/${export-name}

6 Duration & Size
Duration.seconds(n:number): Duration
Duration.minutes(n:number): Duration
Duration.hours(n:number): Duration
Duration.days(n:number): Duration
Duration.parse(iso:string): Duration
Duration.plus(other: Duration): Duration
Duration.minus(other: Duration): Duration

Size.kibibytes(n:number): Size
Size.mebibytes(n:number): Size
Size.gibibytes(n:number): Size
Size.tebibytes(n:number): Size
Size.pebibytes(n:number): Size
Size.toKibibytes(options?:{ rounding: SizeRoundingBehavior }): number
Size.toMebibytes(options?:{ rounding: SizeRoundingBehavior }): number

7 SecretValue Sources
SecretValue.unsafePlainText(value:string): SecretValue
SecretValue.secretsManager(secretId:string, opts?:{ jsonField?: string, versionId?: string, versionStage?: string }): SecretValue
SecretValue.ssmSecure(parameterName:string, version?: string): SecretValue
SecretValue.cfnParameter(parameterName:string): SecretValue
SecretValue.cfnDynamicReference(reference:string): SecretValue
SecretValue.resourceAttribute(attrName:string): SecretValue

8 ARN Manipulation
Stack.formatArn({ service:string, resource:string, arnFormat?:ArnFormat, resourceName?:string, region?:string, account?:string }): string
Stack.splitArn(arn:string, arnFormat?:ArnFormat): ArnComponents

9 Dependencies
constructA.node.addDependency(constructB:IConstruct): void
const depGroup = new DependencyGroup(); depGroup.add(constructB)
constructA.node.addDependency(depGroup)
stackA.addDependency(stackB:Stack): void

10 Custom Resources & Providers
new CustomResource(this,id:string,{ resourceType:string, serviceToken:string, properties?: {[key:string]:any} })

CustomResourceProvider.getOrCreate(
  scope:Construct,
  type:string,
  props:{ codeDirectory:string, runtime:CustomResourceProviderRuntime, description?:string }
): string

new Provider(this,id:string,{ onEventHandler:Function, isCompleteHandler?:Function }): customresources.Provider

11 Low-Level CloudFormation
new CfnOutput(this,id:string,{ value:any, description?:string, exportName?:string })
new CfnParameter(this,id:string,{ type:string, default?:any, allowedValues?:any[] })

Fn.base64(data:string): string
Fn.conditionEquals(left:any,right:any): CfnCondition
Fn.conditionAnd(...conditions:IResolvable[]): CfnCondition
Fn.toJsonString(value:any): string
Fn.split(sep:string,source:any[]): string[]

new CfnMapping(this,id:string,{ mapping:{ [key:string]:{ [key:string]:any } }, lazy?:boolean })

## Supplementary Details
Installation
peerDependencies.aws-cdk-lib.minVersion=2.38.0 peerDependencies.constructs.minVersion=10.0.0 devDependencies.aws-cdk-lib=2.38.0

dependencies.aws-cdk-lib=^2.38.0 dependencies.constructs=^10.0.0

StackProps
env.account type string default undefined env.region type string default undefined
synthesizer type IStackSynthesizer default DefaultStackSynthesizer
terminationProtection type boolean default false
description type string default undefined
crossRegionReferences type boolean default false (experimental flag '@aws-cdk/core:newStyleStackSynthesis')

Synthesizer Props
DefaultStackSynthesizerProps
  fileAssetsBucketName type string default undefined
  cloudAssemblyArtifact type string default 'Assembly'
  qualifier type string default auto-generated

NestedStackProps extends StackProps no extra fields

Cross-Region References
when crossRegionReferences=true, CDK emits a Custom Resource Provider creating SSM parameters under /cdk/exports/{consumingStack}/{exportName}. Consuming stacks reference via SSM dynamic references and import custom resource to lock export.

Duration
internal storage nanoseconds. toUnit conversion enforces integral by default. override integral via options.rounding=SizeRoundingBehavior.FLOOR or CEILING

SecretValue
secretsManager fetch: CloudFormation template e.g. {{resolve:secretsmanager:secretId:jsonField:versionStage:versionId}} ssmsSecure: {{resolve:ssm-secure:parameterName:version}}

ARNUtils
ArnFormat enum values COLON_RESOURCE_NAME, SLASH_RESOURCE_NAME, etc. formatArn enforces sep and account region defaults to stack

Dependencies
node.addDependency uses low-level addDependsOn on CfnResource or adds cross-stack metadata

CustomResourceProvider.getOrCreate ensures singleton by logical ID = resource type string
provider.roleArn property available after provider instantiation
provider.addToRolePolicy(policy: PolicyDocument) uses raw JSON for IAM statements

CfnMapping
lazy mode: only emit mapping section if keys unresolved or default not found


## Reference Details
Class aws-cdk-lib.Stack
constructor(scope: Construct, id: string, props?: StackProps)

Interface StackProps
  readonly env?: { account?: string; region?: string }
  readonly synthesizer?: IStackSynthesizer
  readonly terminationProtection?: boolean
  readonly description?: string
  readonly crossRegionReferences?: boolean

Interface IStackSynthesizer
  synthesize(stack: Stack, session: ISynthesisSession): void

DefaultStackSynthesizer
constructor(props?: { fileAssetsBucketName?: string; cloudAssemblyArtifact?: string; qualifier?: string })

LegacyStackSynthesizer
constructor(props?: {})

CliCredentialsStackSynthesizer
constructor()

Class cfn.NestedStack
constructor(scope: Construct, id: string, props?: cfn.NestedStackProps)
Interface NestedStackProps extends StackProps

Class Duration
static seconds(value: number): Duration
static minutes(value: number): Duration
static hours(value: number): Duration
static days(value: number): Duration
static parse(iso8601: string): Duration
plus(other: Duration): Duration
minus(other: Duration): Duration
readonly toSeconds(): number
readonly toMinutes(): number

Class Size
static kibibytes(value: number): Size
static mebibytes(value: number): Size
static gibibytes(value: number): Size
static tebibytes(value: number): Size
static pebibytes(value: number): Size
toKibibytes(options?: { rounding: SizeRoundingBehavior }): number
toMebibytes(options?: { rounding: SizeRoundingBehavior }): number

Enum SizeRoundingBehavior { FAIL, FLOOR, CEILING }

Class SecretValue
static unsafePlainText(secret: string): SecretValue
static secretsManager(secretId: string, opts?: { jsonField?: string; versionId?: string; versionStage?: string }): SecretValue
static ssmSecure(parameterName: string, version?: string): SecretValue
static cfnParameter(parameterName: string): SecretValue
static cfnDynamicReference(dynref: string): SecretValue
static resourceAttribute(attr: string): SecretValue

Class CustomResource
constructor(scope: Construct, id: string, props: { resourceType: string; serviceToken: string; properties?: { [key: string]: any } })

Class CustomResourceProvider
static getOrCreate(scope: Construct, type: string, props: { codeDirectory: string; runtime: CustomResourceProviderRuntime; description?: string }): string
static getOrCreateProvider(scope: Construct, type: string, props: { codeDirectory: string; runtime: CustomResourceProviderRuntime; }): CustomResourceProvider
property roleArn: string
method addToRolePolicy(policy: any): void

Enum CustomResourceProviderRuntime { NODEJS_12_X, NODEJS_14_X, NODEJS_16_X, NODEJS_18_X }

Class customresources.Provider
constructor(scope: Construct, id: string, props: { onEventHandler: Function; isCompleteHandler?: Function })
property serviceToken: string

Function stack.formatArn(options: { service: string; resource: string; arnFormat?: ArnFormat; resourceName?: string; region?: string; account?: string }): string
Function stack.splitArn(arn: string, arnFormat?: ArnFormat): ArnComponents

Enum ArnFormat { COLON_RESOURCE_NAME, SLASH_RESOURCE_NAME, NO_RESOURCE_NAME }
Interface ArnComponents { partition: string; service: string; region: string; account: string; resource: string; resourceName?: string }

Construct dependencies
construct.node.addDependency(dependency:IConstruct|IDependable): void
DependencyGroup
  add(dependency:IConstruct|IDependable): void

Stack dependencies
stack.addDependency(other: Stack): void

CfnOutput
constructor(scope: Construct, id: string, props: { value: any; description?: string; exportName?: string })

CfnParameter
constructor(scope: Construct, id: string, props: { type: string; default?: any; allowedValues?: any[]; minValue?: number; maxValue?: number })

Class Fn
static base64(data: string): string
static conditionEquals(left: any, right: any): FnCondition
static conditionAnd(...conditions: FnCondition[]): FnCondition
static conditionNot(condition: FnCondition): FnCondition
static toJsonString(value: any): string
static split(delimiter: string, source: string): string[]

CfnMapping
constructor(scope: Construct, id: string, props: { mapping: { [key: string]: { [key: string]: any } }; lazy?: boolean })
method findInMap(topLevelKey: string|IResolvable, secondLevelKey: string|IResolvable, defaultValue?: any): IResolvable

Troubleshooting
To break cross-stack reference deletion error:
1 call exportValue on producer: exportValue(resource.attribute)
2 deploy both stacks
3 remove resource and exportValue() call
4 deploy producer stack only

Suppress template indentation
context key @aws-cdk/core:suppressTemplateIndentation=true or StackProps.suppressTemplateIndentation=true

Set stackResourceLimit
context key @aws-cdk/core:stackResourceLimit=N


## Information Dense Extract
peerDependencies aws-cdk-lib:^2.38.0 constructs:^10.0.0 devDependencies aws-cdk-lib:2.38.0 dependencies aws-cdk-lib:^2.38.0 constructs:^10.0.0

Import patterns classic and barrel

StackProps env:{account?,region?} synthesizer:IStackSynthesizer terminationProtection:boolean description:string crossRegionReferences:boolean

DefaultStackSynthesizer(props:{fileAssetsBucketName?,cloudAssemblyArtifact?,qualifier?}) LegacyStackSynthesizer() CliCredentialsStackSynthesizer()

NestedStack extends cfn.NestedStack props:NestedStackProps exports via CFN parameters cross-region via SSM custom resource under /cdk/exports/consumingStack/exportName

Duration static factories seconds,minutes,hours,days,parse plus minus
Size static factories kibibytes,mebibytes,gibibytes,tebibytes,pebibytes toKibibytes(toMebibytes)(rounding)

SecretValue methods unsafePlainText, secretsManager(secretId,opts), ssmSecure(name,version), cfnParameter(name), cfnDynamicReference(ref), resourceAttribute(attr)

Stack.formatArn({service,resource,arnFormat?,resourceName?,region?,account?}) Stack.splitArn(arn,arnFormat?)

construct.node.addDependency(dep) DependencyGroup.add(dep) stack.addDependency(stack)

CustomResource(scope,id,{resourceType,serviceToken,properties?})
CustomResourceProvider.getOrCreate(scope,type,{codeDirectory,runtime,description?}) getOrCreateProvider -> provider.roleArn addToRolePolicy(policyJSON)
customresources.Provider(scope,id,{onEventHandler,isCompleteHandler?}).serviceToken

CfnOutput(scope,id,{value,description?,exportName?}) CfnParameter(scope,id,{type,default?,allowedValues?,minValue?,maxValue?})
Fn.base64(data) Fn.conditionEquals(left,right) Fn.conditionAnd(...conds) Fn.conditionNot(cond) Fn.toJsonString(v) Fn.split(sep,src)
CfnMapping(scope,id,{mapping:{},lazy?}).findInMap(key1,key2,default?)

Troubleshoot cross-stack removal via exportValue and two-stage deploy
Suppress indentation via context key or StackProps
Stack resource limit via context key


## Sanitised Extract
Table of Contents
1 Installation & Versioning
2 Import Patterns
3 Stack Definition & StackProps
4 Synthesizers
5 Nested Stacks & Cross-Stack References
6 Duration & Size
7 SecretValue Sources
8 ARN Manipulation
9 Dependencies
10 Custom Resource & Providers
11 Low-Level CloudFormation

1 Installation & Versioning
peerDependencies
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0
devDependencies
  aws-cdk-lib: 2.38.0

dependencies
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0

2 Import Patterns
Classic: import { Stack App aws_s3 as s3 } from 'aws-cdk-lib'
Barrel: import { App Stack } from 'aws-cdk-lib'
        import { Bucket } from 'aws-cdk-lib/aws-s3'

3 Stack Definition & StackProps
class MyStack extends Stack
 constructor(scope: Construct, id: string, props?: StackProps)

StackProps fields
  env?                    { account?: string; region?: string }
  synthesizer?            IStackSynthesizer
  terminationProtection?  boolean
  description?            string
  crossRegionReferences?  boolean

4 Synthesizers
new DefaultStackSynthesizer({ fileAssetsBucketName?: string, cloudAssemblyArtifact?: string, qualifier?: string })
new LegacyStackSynthesizer()
new CliCredentialsStackSynthesizer()

5 Nested Stacks & Cross-Stack References
class MyNestedStack extends cfn.NestedStack
NestedStackProps extends StackProps
Automatic cross-stack export/import for same account/region
Enable crossRegionReferences to true to allow cross-region via SSM parameters
SSM parameter path /cdk/exports/${consumingStackName}/${export-name}

6 Duration & Size
Duration.seconds(n:number): Duration
Duration.minutes(n:number): Duration
Duration.hours(n:number): Duration
Duration.days(n:number): Duration
Duration.parse(iso:string): Duration
Duration.plus(other: Duration): Duration
Duration.minus(other: Duration): Duration

Size.kibibytes(n:number): Size
Size.mebibytes(n:number): Size
Size.gibibytes(n:number): Size
Size.tebibytes(n:number): Size
Size.pebibytes(n:number): Size
Size.toKibibytes(options?:{ rounding: SizeRoundingBehavior }): number
Size.toMebibytes(options?:{ rounding: SizeRoundingBehavior }): number

7 SecretValue Sources
SecretValue.unsafePlainText(value:string): SecretValue
SecretValue.secretsManager(secretId:string, opts?:{ jsonField?: string, versionId?: string, versionStage?: string }): SecretValue
SecretValue.ssmSecure(parameterName:string, version?: string): SecretValue
SecretValue.cfnParameter(parameterName:string): SecretValue
SecretValue.cfnDynamicReference(reference:string): SecretValue
SecretValue.resourceAttribute(attrName:string): SecretValue

8 ARN Manipulation
Stack.formatArn({ service:string, resource:string, arnFormat?:ArnFormat, resourceName?:string, region?:string, account?:string }): string
Stack.splitArn(arn:string, arnFormat?:ArnFormat): ArnComponents

9 Dependencies
constructA.node.addDependency(constructB:IConstruct): void
const depGroup = new DependencyGroup(); depGroup.add(constructB)
constructA.node.addDependency(depGroup)
stackA.addDependency(stackB:Stack): void

10 Custom Resources & Providers
new CustomResource(this,id:string,{ resourceType:string, serviceToken:string, properties?: {[key:string]:any} })

CustomResourceProvider.getOrCreate(
  scope:Construct,
  type:string,
  props:{ codeDirectory:string, runtime:CustomResourceProviderRuntime, description?:string }
): string

new Provider(this,id:string,{ onEventHandler:Function, isCompleteHandler?:Function }): customresources.Provider

11 Low-Level CloudFormation
new CfnOutput(this,id:string,{ value:any, description?:string, exportName?:string })
new CfnParameter(this,id:string,{ type:string, default?:any, allowedValues?:any[] })

Fn.base64(data:string): string
Fn.conditionEquals(left:any,right:any): CfnCondition
Fn.conditionAnd(...conditions:IResolvable[]): CfnCondition
Fn.toJsonString(value:any): string
Fn.split(sep:string,source:any[]): string[]

new CfnMapping(this,id:string,{ mapping:{ [key:string]:{ [key:string]:any } }, lazy?:boolean })

## Original Source
AWS CDK API Reference
https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html

## Digest of CDK_CORE

# Installation and Versioning

To upgrade from CDK 1.x remove all individual AWS CDK dependencies.

Example package.json for a CDK Library:

peerDependencies:
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0

devDependencies:
  aws-cdk-lib: 2.38.0

Example package.json for a CDK App:

dependencies:
  aws-cdk-lib: ^2.38.0
  constructs: ^10.0.0

# Import Patterns

Classic Import:
import { Stack App aws_s3 as s3 } from 'aws-cdk-lib'

Barrel Import:
import { App Stack } from 'aws-cdk-lib'
import { Bucket } from 'aws-cdk-lib/aws-s3'

# Stack Definition & Properties

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
  }
}

StackProps fields:
  env?          { account?: string; region?: string }
  synthesizer?  IStackSynthesizer
  terminationProtection? boolean
  description?  string
  crossRegionReferences? boolean (experimental)

# Stack Synthesizers

new DefaultStackSynthesizer({
  fileAssetsBucketName?: string,
  cloudAssemblyArtifact?: string,
  qualifier?: string
})

new LegacyStackSynthesizer()
new CliCredentialsStackSynthesizer()

# Nested Stacks & Cross-Stack References

class MyNestedStack extends cfn.NestedStack {}
NestedStackProps extends StackProps

Access resources across stacks in same account/region: automatic export/import via CloudFormation
crossRegionReferences=true enables cross-region references using SSM Parameter custom resources

# Duration & Size Types

Duration.seconds(n: number): Duration
Duration.minutes(n: number): Duration
Duration.hours(n: number): Duration
Duration.days(n: number): Duration
Duration.parse(iso: string): Duration

Size.kibibytes(n: number): Size
Size.mebibytes(n: number): Size
Size.gibibytes(n: number): Size
Size.tebibytes(n: number): Size
Size.pebibytes(n: number): Size
Size.toKibibytes(options?: { rounding: SizeRoundingBehavior }): number
Size.toMebibytes(options?: { rounding: SizeRoundingBehavior }): number

# SecretValue Sources

SecretValue.unsafePlainText(value: string): SecretValue
SecretValue.secretsManager(secretId: string, opts?: { jsonField?: string; versionId?: string; versionStage?: string }): SecretValue
SecretValue.ssmSecure(parameterName: string, version?: string): SecretValue
SecretValue.cfnParameter(parameterName: string): SecretValue
SecretValue.cfnDynamicReference(reference: string): SecretValue
SecretValue.resourceAttribute(attrName: string): SecretValue

# ARN Manipulation

Stack.formatArn(options: {
  service: string;
  resource: string;
  arnFormat?: ArnFormat;
  resourceName?: string;
  region?: string;
  account?: string;
  sep?: string;
}): string

Stack.splitArn(arn: string, arnFormat?: ArnFormat): ArnComponents

# Dependencies

constructA.node.addDependency(constructB: IConstruct): void
const group = new DependencyGroup()
group.add(constructB)
constructA.node.addDependency(group)

stackA.addDependency(stackB: Stack): void

# Custom Resources & Providers

new CustomResource(this, id: string, {
  resourceType: string,
  serviceToken: string,
  properties?: { [key: string]: any }
})

CustomResourceProvider.getOrCreate(scope: Construct, type: string, props: {
  codeDirectory: string;
  runtime: CustomResourceProviderRuntime;
  description?: string;
}): string

custom-resources Provider:
new customresources.Provider(this, id: string, {
  onEventHandler: Function,
  isCompleteHandler?: Function,
})

# CloudFormation Low-Level Features

new CfnOutput(this, id: string, {
  value: any,
  description?: string,
  exportName?: string
})

new CfnParameter(this, id: string, {
  type: string,
  default?: any,
  allowedValues?: any[]
})

Fn functions: base64(data: string): string
  conditionEquals(left: any, right: any): CfnCondition
  conditionAnd(...conds: IResolvable[]): CfnCondition
  toJsonString(value: any): string
  split(sep: string, source: any[]): string[]

new CfnMapping(this, id: string, {
  mapping: { [key: string]: { [key: string]: any } },
  lazy?: boolean
})


## Attribution
- Source: AWS CDK API Reference
- URL: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
- License: License: Apache 2.0
- Crawl Date: 2025-05-01T04:50:16.825Z
- Data Size: 544992 bytes
- Links Found: 321228

## Retrieved
2025-05-01
