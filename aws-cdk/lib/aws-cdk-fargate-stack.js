const { Stack } = require('aws-cdk-lib');
const { Vpc, SubnetType } = require('aws-cdk-lib/aws-ec2');
const { ApplicationLoadBalancer } = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Role, ServicePrincipal, ManagedPolicy } = require('aws-cdk-lib/aws-iam');
const { Repository } = require('aws-cdk-lib/aws-ecr');
const { ContainerImage, Cluster } = require('aws-cdk-lib/aws-ecs');
const { ApplicationLoadBalancedFargateService } = require('aws-cdk-lib/aws-ecs-patterns');

class TileTogetherServiceStack extends Stack {
  constructor (scope, id, props) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'tiletogether-service-vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
      ],
    });

    const loadBalancer = new ApplicationLoadBalancer(this, 'tiletogether-service-lb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetGroupName: 'ingress' },
    });

    const cluster = new Cluster(this, 'tiletogether-service-cluster', {
      vpc,
      clusterName: 'tiletogether-service-cluster',
      enableFargateCapacityProviders: true,
    });

    const executionRole = new Role(this, 'tiletogether-service-execution-role', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
    });

    // eslint-disable-next-line no-unused-vars
    const repository = new Repository(this, 'tiletogether-service-repo', {
      repositoryName: 'tiletogether-service-repo',
    });

    const taskImageOptions = {
      image: ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      containerName: 'tiletogether-service-task-image-container',
      family: 'tiletogether-service-task-image-family',
      containerPort: 80,
      executionRole,
    };

    // eslint-disable-next-line no-unused-vars
    const fargateService = new ApplicationLoadBalancedFargateService(this, 'tiletogether-service', {
      cluster,
      taskImageOptions,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      serviceName: 'tiletogether-service',
      // select application subnets for taskSubnets
      taskSubnets: vpc.selectSubnets({ subnetGroupName: 'application' }),
      loadBalancer,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
      assignPublicIp: true,
    });

    fargateService.targetGroup.configureHealthCheck({
      path: '/api/health',
      enabled: true,
      healthyHttpCodes: '200',
    });
  }
}

module.exports = { TileTogetherServiceStack };
