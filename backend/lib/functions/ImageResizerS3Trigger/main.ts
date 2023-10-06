import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3'

const Sharp = require('sharp')

// Create the S3 client
const s3Client = new S3Client({ region: 'us-east-1' })

exports.handler = async (event: any) => {
	const bucket = event.Records[0].s3.bucket.name
	const key = decodeURIComponent(
		event.Records[0].s3.object.key.replace(/\+/g, ' ')
	)

	const input = {
		Bucket: bucket,
		Key: key,
	}

	const originalImage = await s3Client.send(new GetObjectCommand(input))

	// Define sizes for thumbnail, medium, and large images
	const sizes = [
		{ suffix: 'thumbnail', width: 100 },
		{ suffix: 'medium', width: 500 },
		{ suffix: 'large', width: 1000 },
	]

	const uploads = sizes.map(async (size) => {
		const resizedImage = await Sharp(originalImage.Body)
			.resize(size.width)
			.png({ quality: 85 }) // Convert to PNG with 85% quality
			.toBuffer()

		const newKey = key.replace(/(\.\w+)$/, `-${size.suffix}$1`)

		await s3Client.send(
			new PutObjectCommand({
				Bucket: process.env.OUTPUT_BUCKET_NAME,
				Key: newKey,
				Body: resizedImage,
				ContentType: 'image/png',
			})
		)
	})

	// Wait for all uploads to finish
	await Promise.all(uploads)

	return {
		statusCode: 200,
		body: JSON.stringify({ message: 'Images processed successfully!' }),
	}
}
