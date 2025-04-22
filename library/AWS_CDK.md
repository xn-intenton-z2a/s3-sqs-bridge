# AWS_CDK

## Crawl Summary
AWS CDK framework details: Construct Library with reusable constructs, CLI for managing deployments. Supports languages: TypeScript, JavaScript, Python, Java, C# and Go. Provides detailed example for creating an ECS Fargate service with a VPC (maxAzs=3), ECS Cluster, and ApplicationLoadBalancedFargateService with cpu 512, desiredCount 6, memoryLimitMiB 2048, public load balancer true. CloudFormation output includes over 50 resource types such as AWS::EC2::VPC, AWS::ECS::TaskDefinition, AWS::IAM::Role, etc.

## Normalised Extract
Table of Contents:
1. Overview
2. Construct Library and CLI Details
3. Supported Languages
4. Detailed Code Examples
5. CloudFormation Resource Specifications

1. Overview: AWS CDK defines cloud infrastructure using code. Infrastructure is deployed via AWS CloudFormation.

2. Construct Library and CLI Details: Provides pre-written constructs for AWS services. CLI (CDK Toolkit) is used for creating, managing, and deploying stacks and apps.

3. Supported Languages: TypeScript, JavaScript, Python, Java, C#/.Net, Go. Each language example shows stack creation, VPC instantiation with maxAzs set to 3, cluster creation using the VPC, and Fargate service configuration with properties:
   - cpu: 512 (default 256)
   - desired count: 6 (default 1)
   - memory limit: 2048 MiB (default 512)
   - publicLoadBalancer: true (default false)
   - taskImageOptions: container image from registry "amazon/amazon-ecs-sample"

4. Detailed Code Examples:
   TypeScript: Exported class with constructor accepting App, id, optional StackProps. Creates VPC, cluster and instantiates ecs_patterns.ApplicationLoadBalancedFargateService with specified configuration.
   JavaScript: Similar structure using class syntax and module.exports.
   Python: Class deriving from Stack, using ecs_patterns.ApplicationLoadBalancedFargateService with parameters including max_azs, cpu, desired_count, memory_limit_mib and image specification.
   Java: Class extending Stack using builder patterns for Vpc, Cluster, and ApplicationLoadBalancedFargateService with precise parameter values.
   C#: Class extending Stack using object initializers with VpcProps, ClusterProps, and ApplicationLoadBalancedFargateServiceProps.
   Go: Function NewMyEcsConstructStack creating stack, VPC (maxAzs=3), cluster, and ApplicationLoadBalancedFargateService using jsii.Number and jsii.String for parameter values.

5. CloudFormation Resource Specifications: Deployment generates CloudFormation template with >500 lines and >50 resources such as AWS::EC2::VPC, Subnet, InternetGateway, NatGateway, Route, SecurityGroup, ECS::Cluster, ECS::Service, and various IAM, ELB, and Logs resources.

## Supplementary Details
Technical Specifications:
- VPC configuration: { maxAzs: 3 } to restrict availability zones.
- ECS Cluster: Bound to the VPC.
- Fargate Service configuration:
   cpu: 512 (override default 256)
   desiredCount: 6 (override default 1)
   memoryLimitMiB: 2048 (override default 512)
   taskImageOptions: { image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample') }
   publicLoadBalancer: true (override default false)

Implementation Steps:
1. Instantiate a VPC with maxAzs 3.
2. Create an ECS Cluster associated to the VPC.
3. Define an ApplicationLoadBalancedFargateService with specified cpu, desiredCount, memoryLimitMiB, and publicLoadBalancer flag.
4. Deploy the stack using AWS CDK CLI command (cdk deploy).

Configuration Options:
- maxAzs: integer (default: all AZs in region, here explicitly set to 3)
- cpu: number (default: 256, set to 512)
- desiredCount: number (default: 1, set to 6)
- memoryLimitMiB: number (default: 512, set to 2048)
- publicLoadBalancer: boolean (default: false, set to true)
- taskImageOptions.image: string (registry image, set to 'amazon/amazon-ecs-sample')

## Reference Details
API Specifications and SDK Method Signatures:

TypeScript:
  class MyEcsConstructStack extends Stack {
    constructor(scope: App, id: string, props?: StackProps) {
      super(scope, id, props);
      const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 3 });
      const cluster = new ecs.Cluster(this, "MyCluster", { vpc: vpc });
      new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
        cluster: cluster,         // ecs.Cluster
        cpu: 512,                 // number
        desiredCount: 6,          // number
        taskImageOptions: {       // object
          image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample")
        },
        memoryLimitMiB: 2048,     // number
        publicLoadBalancer: true   // boolean
      });
    }
  }

JavaScript follows an analogous pattern using new ecs_patterns.ApplicationLoadBalancedFargateService with similar parameter types.

Python:
  class MyEcsConstructStack(Stack):
      def __init__(self, scope: Construct, id: str, **kwargs) -> None:
          super().__init__(scope, id, **kwargs)
          vpc = ec2.Vpc(self, "MyVpc", max_azs=3)   # max_azs: int
          cluster = ecs.Cluster(self, "MyCluster", vpc=vpc)  # Cluster created with vpc
          ecs_patterns.ApplicationLoadBalancedFargateService(self, "MyFargateService",
              cluster=cluster,          # Required: ecs.Cluster
              cpu=512,                  # int
              desired_count=6,          # int
              task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                  image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
              ),
              memory_limit_mib=2048,    # int
              public_load_balancer=True # bool
          )

Java, C#, and Go use builder patterns and object initializers with equivalent parameter types and values. 

Implementation Pattern Best Practices:
- Use modular constructs for reusability.
- Group infrastructure configuration (VPC, Cluster, Services) together.
- Override defaults explicitly for clarity.

Troubleshooting Procedures:
- Verify AWS CLI configuration with 'aws configure list'.
- Use 'cdk doctor' to check environment health.
- If deployment fails, examine CloudFormation events using 'aws cloudformation describe-stack-events --stack-name <STACK_NAME>'
- For failed resource provisioning, review template sections corresponding to the failed AWS resource (e.g., VPC, ECS Service, etc.) and confirm parameter values.
- Logs can be inspected via AWS CloudWatch for resources like ECS TaskDefinition and Logs LogGroup.


## Information Dense Extract
AWS CDK, Construct Library, CLI, Languages: TS, JS, Python, Java, C#, Go; VPC: {maxAzs:3}; Cluster: new ecs.Cluster(vpc); Fargate Service: {cpu:512, desiredCount:6, memoryLimitMiB:2048, taskImageOptions: {image: fromRegistry('amazon/amazon-ecs-sample')}, publicLoadBalancer:true}; Code Examples in TS, JS, Python, Java, C#, Go; CloudFormation: >500 lines, >50 resources including AWS::EC2::{VPC, Subnet, InternetGateway,...}, AWS::ECS::{Cluster, Service, TaskDefinition}, AWS::IAM::{Role, Policy}, AWS::ELBv2::{LoadBalancer, TargetGroup, Listener}; SDK methods include constructors with parameters type (string, number, boolean, object); builder patterns used in Java and object initializers in C#; troubleshooting via cdk doctor, aws cloudformation describe-stack-events.

## Escaped Extract
Table of Contents:
1. Overview
2. Construct Library and CLI Details
3. Supported Languages
4. Detailed Code Examples
5. CloudFormation Resource Specifications

1. Overview: AWS CDK defines cloud infrastructure using code. Infrastructure is deployed via AWS CloudFormation.

2. Construct Library and CLI Details: Provides pre-written constructs for AWS services. CLI (CDK Toolkit) is used for creating, managing, and deploying stacks and apps.

3. Supported Languages: TypeScript, JavaScript, Python, Java, C#/.Net, Go. Each language example shows stack creation, VPC instantiation with maxAzs set to 3, cluster creation using the VPC, and Fargate service configuration with properties:
   - cpu: 512 (default 256)
   - desired count: 6 (default 1)
   - memory limit: 2048 MiB (default 512)
   - publicLoadBalancer: true (default false)
   - taskImageOptions: container image from registry 'amazon/amazon-ecs-sample'

4. Detailed Code Examples:
   TypeScript: Exported class with constructor accepting App, id, optional StackProps. Creates VPC, cluster and instantiates ecs_patterns.ApplicationLoadBalancedFargateService with specified configuration.
   JavaScript: Similar structure using class syntax and module.exports.
   Python: Class deriving from Stack, using ecs_patterns.ApplicationLoadBalancedFargateService with parameters including max_azs, cpu, desired_count, memory_limit_mib and image specification.
   Java: Class extending Stack using builder patterns for Vpc, Cluster, and ApplicationLoadBalancedFargateService with precise parameter values.
   C#: Class extending Stack using object initializers with VpcProps, ClusterProps, and ApplicationLoadBalancedFargateServiceProps.
   Go: Function NewMyEcsConstructStack creating stack, VPC (maxAzs=3), cluster, and ApplicationLoadBalancedFargateService using jsii.Number and jsii.String for parameter values.

5. CloudFormation Resource Specifications: Deployment generates CloudFormation template with >500 lines and >50 resources such as AWS::EC2::VPC, Subnet, InternetGateway, NatGateway, Route, SecurityGroup, ECS::Cluster, ECS::Service, and various IAM, ELB, and Logs resources.

## Original Source
AWS CDK Documentation
https://docs.aws.amazon.com/cdk/v2/guide/home.html

## Digest of AWS_CDK

# AWS CDK DEVELOPER GUIDE

Retrieved Date: 2023-10-12

## Overview
The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework which allows developers to define cloud infrastructure using code and deploy through AWS CloudFormation.

## Primary Components
- AWS CDK Construct Library: A collection of modular constructs for AWS resources.
- AWS CDK Command Line Interface (CLI): A tool for creating, managing, and deploying CDK apps.

## Supported Languages
- TypeScript
- JavaScript
- Python
- Java
- C#/.Net
- Go

## Benefits
- Infrastructure as Code (IaC) for scalable and manageable deployments.
- Ability to use general-purpose programming languages and IDE features like syntax highlighting and autocompletion.
- Seamless integration with AWS CloudFormation for predictable deployments with rollback on error.

## Example: AWS Fargate Service using ECS Constructs

The following example creates an Amazon ECS cluster with an Application Load Balanced Fargate service. Configuration details include:
- VPC with maxAzs set to 3
- Cluster associated to the VPC
- Fargate service with:
  - CPU allocation: 512 (default 256)
  - Desired count: 6 (default 1)
  - Memory limit: 2048 MiB (default 512)
  - Public load balancer enabled
  - Task image using container image from registry "amazon/amazon-ecs-sample"

### Code Examples

#### TypeScript
export class MyEcsConstructStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 3 });
    const cluster = new ecs.Cluster(this, "MyCluster", { vpc: vpc });
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster,
      cpu: 512,
      desiredCount: 6,
      taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
      memoryLimitMiB: 2048,
      publicLoadBalancer: true
    });
  }
}

#### JavaScript
class MyEcsConstructStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 3 });
    const cluster = new ecs.Cluster(this, "MyCluster", { vpc: vpc });
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster,
      cpu: 512,
      desiredCount: 6,
      taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
      memoryLimitMiB: 2048,
      publicLoadBalancer: true
    });
  }
}
module.exports = { MyEcsConstructStack };

#### Python
class MyEcsConstructStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        vpc = ec2.Vpc(self, "MyVpc", max_azs=3)
        cluster = ecs.Cluster(self, "MyCluster", vpc=vpc)
        ecs_patterns.ApplicationLoadBalancedFargateService(self, "MyFargateService",
            cluster=cluster,
            cpu=512,
            desired_count=6,
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample")
            ),
            memory_limit_mib=2048,
            public_load_balancer=True
        )

#### Java
public class MyEcsConstructStack extends Stack {
    public MyEcsConstructStack(final Construct scope, final String id, StackProps props) {
        super(scope, id, props);
        Vpc vpc = Vpc.Builder.create(this, "MyVpc").maxAzs(3).build();
        Cluster cluster = Cluster.Builder.create(this, "MyCluster").vpc(vpc).build();
        ApplicationLoadBalancedFargateService.Builder.create(this, "MyFargateService")
            .cluster(cluster)
            .cpu(512)
            .desiredCount(6)
            .taskImageOptions(ApplicationLoadBalancedTaskImageOptions.builder()
                .image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
                .build())
            .memoryLimitMiB(2048)
            .publicLoadBalancer(true)
            .build();
    }
}

#### C#
public class MyEcsConstructStack : Stack {
    public MyEcsConstructStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props) {
        var vpc = new Vpc(this, "MyVpc", new VpcProps { MaxAzs = 3 });
        var cluster = new Cluster(this, "MyCluster", new ClusterProps { Vpc = vpc });
        new ApplicationLoadBalancedFargateService(this, "MyFargateService",
            new ApplicationLoadBalancedFargateServiceProps {
                Cluster = cluster,
                Cpu = 512,
                DesiredCount = 6,
                TaskImageOptions = new ApplicationLoadBalancedTaskImageOptions {
                    Image = ContainerImage.FromRegistry("amazon/amazon-ecs-sample")
                },
                MemoryLimitMiB = 2048,
                PublicLoadBalancer = true,
            }
        );
    }
}

#### Go
func NewMyEcsConstructStack(scope constructs.Construct, id string, props *MyEcsConstructStackProps) awscdk.Stack {
    var sprops awscdk.StackProps
    if props != nil {
        sprops = props.StackProps
    }
    stack := awscdk.NewStack(scope, &id, &sprops)
    vpc := awsec2.NewVpc(stack, jsii.String("MyVpc"), &awsec2.VpcProps{
        MaxAzs: jsii.Number(3),
    })
    cluster := awsecs.NewCluster(stack, jsii.String("MyCluster"), &awsecs.ClusterProps{
        Vpc: vpc,
    })
    awsecspatterns.NewApplicationLoadBalancedFargateService(stack, jsii.String("MyFargateService"),
        &awsecspatterns.ApplicationLoadBalancedFargateServiceProps{
            Cluster:          cluster,
            Cpu:              jsii.Number(512),
            DesiredCount:     jsii.Number(6),
            MemoryLimitMiB:   jsii.Number(2048),
            TaskImageOptions: &awsecspatterns.ApplicationLoadBalancedTaskImageOptions{
                Image: awsecs.ContainerImage_FromRegistry(jsii.String("amazon/amazon-ecs-sample"), nil),
            },
            PublicLoadBalancer: jsii.Bool(true),
        },
    )
    return stack
}

## CloudFormation Resources Generated
The deployment produces a CloudFormation template of >500 lines creating >50 resources including:
- AWS::EC2::VPC, AWS::EC2::Subnet, AWS::EC2::InternetGateway, AWS::EC2::Route, AWS::EC2::SecurityGroup
- AWS::ECS::Cluster, AWS::ECS::Service, AWS::ECS::TaskDefinition
- AWS::ElasticLoadBalancingV2::LoadBalancer, AWS::ElasticLoadBalancingV2::TargetGroup, AWS::ElasticLoadBalancingV2::Listener
- AWS::IAM::Role, AWS::IAM::Policy, AWS::Logs::LogGroup


## Attribution
- Source: AWS CDK Documentation
- URL: https://docs.aws.amazon.com/cdk/v2/guide/home.html
- License: License: Amazon Service Terms
- Crawl Date: 2025-04-22T02:29:07.610Z
- Data Size: 1574202 bytes
- Links Found: 147387

## Retrieved
2025-04-22
