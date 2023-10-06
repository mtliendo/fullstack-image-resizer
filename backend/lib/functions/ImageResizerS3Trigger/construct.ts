import * as aws_iam from 'aws-cdk-lib/aws-iam'
import { LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import * as path from 'path'

type CreateResizeImageFuncProps = {
	appName: string
}
export const createResizeImageFunc = (
	scope: Construct,
	props: CreateResizeImageFuncProps
) => {
	const sharpLayer = LayerVersion.fromLayerVersionArn(
		scope,
		'SharpLayer',
		'arn:aws:lambda:us-east-1:842537737558:layer:sharp:1'
	)

	const resizeImageFunc = new NodejsFunction(
		scope,
		`${props.appName}-resizeImageFunc`,
		{
			functionName: `${props.appName}-resizeImageFunc`,
			runtime: Runtime.NODEJS_18_X,
			handler: 'handler',
			entry: path.join(__dirname, `./main.ts`),
			layers: [sharpLayer],
		}
	)

	return resizeImageFunc
}
