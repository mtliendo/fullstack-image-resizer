import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import { LifecycleRuleFilter } from '@aws-sdk/client-s3'
import { Duration } from 'aws-cdk-lib'

type CreateOriginalImagesBucketProps = {
	authenticatedRole: iam.IRole
}

export function createOriginalImagesBucket(
	scope: Construct,
	props: CreateOriginalImagesBucketProps
) {
	const fileStorageBucket = new s3.Bucket(scope, `originalBucket`, {
		cors: [
			{
				allowedMethods: [s3.HttpMethods.POST, s3.HttpMethods.PUT],
				allowedOrigins: ['*'],
				allowedHeaders: ['*'],
				exposedHeaders: [
					'x-amz-server-side-encryption',
					'x-amz-request-id',
					'x-amz-id-2',
					'ETag',
				],
			},
		],
	})

	fileStorageBucket.addLifecycleRule({ expiration: Duration.days(60) })

	// Let signed in users Upload on their own objects in a protected directory
	const canUpdateFromOwnProtectedDirectory = new iam.PolicyStatement({
		effect: iam.Effect.ALLOW,
		actions: ['s3:PutObject'],
		resources: [
			`arn:aws:s3:::${fileStorageBucket.bucketName}/protected/\${cognito-identity.amazonaws.com:sub}/*`,
		],
	})

	new iam.ManagedPolicy(scope, 'SignedInUserManagedPolicy', {
		description:
			'managed Policy to allow upload access to s3 bucket by signed in users.',
		statements: [canUpdateFromOwnProtectedDirectory],
		roles: [props.authenticatedRole],
	})

	return fileStorageBucket
}
