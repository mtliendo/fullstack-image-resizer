import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import {
	AllowedMethods,
	CachePolicy,
	Distribution,
	ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'

export function createSaasPicsBucket(scope: Construct) {
	const fileStorageBucket = new s3.Bucket(scope, `ResizedImagesBucket`)

	const fileStorageBucketCFDistribution = new Distribution(
		scope,
		`cloudfront-for-resized-images-CDN`,
		{
			defaultBehavior: {
				origin: new S3Origin(fileStorageBucket, { originPath: '/public' }),
				cachePolicy: CachePolicy.CACHING_OPTIMIZED,
				allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
				cachedMethods: AllowedMethods.ALLOW_GET_HEAD,
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			},
		}
	)

	return { fileStorageBucket, fileStorageBucketCFDistribution }
}
