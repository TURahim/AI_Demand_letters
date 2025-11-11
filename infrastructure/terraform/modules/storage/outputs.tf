output "documents_bucket_name" {
  description = "Name of the documents S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "ARN of the documents S3 bucket"
  value       = aws_s3_bucket.documents.arn
}

output "letters_bucket_name" {
  description = "Name of the letters S3 bucket"
  value       = aws_s3_bucket.letters.id
}

output "letters_bucket_arn" {
  description = "ARN of the letters S3 bucket"
  value       = aws_s3_bucket.letters.arn
}

