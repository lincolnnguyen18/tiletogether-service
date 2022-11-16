const { Stack } = require('aws-cdk-lib');
const { Vpc, SubnetType } = require('aws-cdk-lib/aws-ec2');
const { ApplicationLoadBalancer } = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Role, ServicePrincipal, ManagedPolicy } = require('aws-cdk-lib/aws-iam');
const { ContainerImage, Cluster } = require('aws-cdk-lib/aws-ecs');
const { ApplicationLoadBalancedFargateService } = require('aws-cdk-lib/aws-ecs-patterns');
const { HostedZone, ARecord, RecordTarget } = require('aws-cdk-lib/aws-route53');
const { Certificate } = require('aws-cdk-lib/aws-certificatemanager');
const { LoadBalancerTarget } = require('aws-cdk-lib/aws-route53-targets');

class TileTogetherServiceStack extends Stack {
  constructor (scope, id, props) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'tiletogether-service-vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const loadBalancer = new ApplicationLoadBalancer(this, 'tiletogether-service-lb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetGroupName: 'public' },
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

    // const repository = new Repository(this, 'tiletogether-service-repo', {
    //   repositoryName: 'tiletogether-service-repo',
    // });

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
      taskSubnets: vpc.selectSubnets({ subnetGroupName: 'public' }),
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
      path: '/health',
      enabled: true,
      healthyHttpCodes: '200',
    });

    // create bucket for storing file image data
    // set cors to allow localhost:3000 for development
    // also allow http://dfq7qlbehwesj.cloudfront.net for production
    // eslint-disable-next-line no-unused-vars
    // const fileDataBucket = new Bucket(this, process.env.AWS_S3_BUCKET, {
    //   bucketName: process.env.AWS_S3_BUCKET,
    //   publicReadAccess: false,
    //   cors: [
    //     {
    //       allowedMethods: [HttpMethod.GET],
    //       allowedOrigins: [
    //         'http://localhost:3000',
    //         'https://www.tiletogether.com',
    //       ],
    //     },
    //   ],
    // });

    // use api.tiletogether.com as domain name; use route 53 hosted zone to manage domain name
    const domainName = 'tiletogether.com';
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'tiletogether-service-hosted-zone', {
      zoneName: domainName,
      hostedZoneId: 'Z05580483QUOQZ38URHS5',
    });

    // const certificate = new DnsValidatedCertificate(this, 'tiletogether-static-assets-certificate', {
    //   domainName: `api.${domainName}`,
    //   hostedZone,
    //   region: 'us-east-1',
    // });
    const certificate = Certificate.fromCertificateArn(this, 'tiletogether-service-certificate', 'arn:aws:acm:us-east-1:542773719222:certificate/4e83c615-28e6-4864-b48e-f3112ce1222e');

    // create route53 record for api.tiletogether.com to route to load balancer
    // eslint-disable-next-line no-unused-vars
    const apiRecord = new ARecord(this, 'tiletogether-service-record', {
      recordName: `api.${domainName}`,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
      zone: hostedZone,
    });

    // also create an A record from tiletogether.com to route to the load balancer as well
    // the fargate nodejs server will handle redirecting to www.tiletogether.com
    // eslint-disable-next-line no-unused-vars
    const redirectRecord = new ARecord(this, 'tiletogether-service-non-www-record', {
      recordName: domainName,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
      zone: hostedZone,
    });

    // add listener on port 443 for https
    // use api.tiletogether.com cert
    // eslint-disable-next-line no-unused-vars
    const listener = loadBalancer.addListener('tiletogether-service-listener', {
      port: 443,
      certificates: [certificate],
      defaultTargetGroups: [fargateService.targetGroup],
    });
  }
}

module.exports = { TileTogetherServiceStack };
