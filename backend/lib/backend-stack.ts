import { createResizeImageFunc } from './functions/ImageResizerS3Trigger/construct'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { createOriginalImagesBucket } from './buckets/originalImages'
import { createResizeImageAuth } from './auth/cognito'
import { createResizedImagesBucket } from './buckets/resizedImages'
import { EventType } from 'aws-cdk-lib/aws-s3'
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications'

export class BackendStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)
		const appName = 'recipe-example'

		// add auth
		const cognito = createResizeImageAuth(this, {
			appName,
		})

		// add buckets
		const originalImagesBucket = createOriginalImagesBucket(this, {
			authenticatedRole: cognito.identityPool.authenticatedRole,
		})

		//add function
		const resizeImageFunc = createResizeImageFunc(this, {
			appName,
		})

		const destinationImagesBucket = createResizedImagesBucket(this)

		// add function as trigger to original bucket
		originalImagesBucket.addEventNotification(
			EventType.OBJECT_CREATED,
			new LambdaDestination(resizeImageFunc),
			{ prefix: 'protected' }
		)

		// add envvars to function
		resizeImageFunc.addEnvironment(
			'OUTPUT_BUCKET_NAME',
			destinationImagesBucket.fileStorageBucket.bucketName
		)

		// add policy so function can get image from source bucket
		resizeImageFunc.addToRolePolicy(
			new cdk.aws_iam.PolicyStatement({
				actions: ['s3:GetObject'],
				resources: [originalImagesBucket.bucketArn + '/*'],
			})
		)

		// add policy so function can write to destination bucket
		resizeImageFunc.addToRolePolicy(
			new cdk.aws_iam.PolicyStatement({
				actions: ['s3:PutObject'],
				resources: [destinationImagesBucket.fileStorageBucket.bucketArn + '/*'],
			})
		)

		new cdk.CfnOutput(this, 'cloudfrontDistURL', {
			value:
				destinationImagesBucket.fileStorageBucketCFDistribution
					.distributionDomainName,
		})
	}
}
