import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3'
import { Stream } from 'stream'

const Sharp = require('sharp')

// Create the S3 client
const s3Client = new S3Client({ region: 'us-east-1' })

function streamToBuffer(stream: Stream): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		stream.on('data', (chunk: Buffer) => chunks.push(chunk))
		stream.on('error', reject)
		stream.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

async function resizeAndUpload(
	imageBuffer: Buffer,
	bucket: string,
	key: string,
	size: number,
	suffix: string
) {
	const resizedImage = await Sharp(imageBuffer)
		.resize(size)
		.png({ quality: 85 })
		.toBuffer()

	const newKey = key.replace(/(\.\w+)$/, `-${suffix}$1`)

	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: newKey,
			Body: resizedImage,
			ContentType: 'image/png',
		})
	)
}

exports.handler = async (event: any) => {
	const bucket = event.Records[0].s3.bucket.name
	const key = decodeURIComponent(
		event.Records[0].s3.object.key.replace(/\+/g, ' ')
	)

	if (!process.env.OUTPUT_BUCKET_NAME) {
		throw new Error('Output bucket name not set in environment variables')
	}

	const { Body } = await s3Client.send(
		new GetObjectCommand({ Bucket: bucket, Key: key })
	)

	if (!Body) {
		throw new Error('No body in S3 response')
	}

	if (!(Body instanceof Stream)) {
		throw new Error('Expected Body to be an instance of Stream')
	}

	const imageBuffer = await streamToBuffer(Body)

	// Resize and upload concurrently
	await Promise.all([
		resizeAndUpload(
			imageBuffer,
			process.env.OUTPUT_BUCKET_NAME,
			key,
			100,
			'thumbnail'
		),
		resizeAndUpload(
			imageBuffer,
			process.env.OUTPUT_BUCKET_NAME,
			key,
			200,
			'medium'
		),
		resizeAndUpload(
			imageBuffer,
			process.env.OUTPUT_BUCKET_NAME,
			key,
			500,
			'large'
		),
	])

	return {
		statusCode: 200,
		body: JSON.stringify({ message: 'Images processed successfully!' }),
	}
}
