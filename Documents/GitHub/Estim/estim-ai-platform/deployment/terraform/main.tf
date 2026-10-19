terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "estim-production"
}

variable "db_password" {
# EKS Cluster
resource "aws_eks_cluster" "estim" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster_role.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
  ]
}

data "aws_eks_cluster_auth" "estim" {
  name = aws_eks_cluster.estim.name
}

# IAM Role for EKS
resource "aws_iam_role" "cluster_role" {
  name = "${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
# VPC
resource "aws_vpc" "estim" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.estim.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.environment}-private-${count.index}"
    Environment = var.environment
    "kubernetes.io/role/internal-elb" = "1"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# RDS PostgreSQL
resource "aws_db_instance" "estim" {
  identifier       = "${var.environment}-estim-db"
  instance_class   = "db.r5.large"
  engine           = "postgres"
  engine_version   = "15.6"
  allocated_storage = 500
  max_allocated_storage = 1000
  username         = "estim"
  password         = var.db_password
  db_name          = "estim_ai"
  publicly_accessible = false
  multi_az         = true
  backup_retention_period = 30
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.environment}-final-snapshot"
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name = aws_db_subnet_group.estim.name
  storage_type = "gp3"
  performance_insights_enabled = true
  monitoring_interval = 60
# ElastiCache Redis
resource "aws_elasticache_replication_group" "estim" {
  replication_group_id       = "${var.environment}-estim-redis"
  replication_group_description = "Estim AI Platform Redis"
  node_type                  = "cache.r5.large"
  automatic_failover_enabled = true
  num_cache_clusters         = 2
  engine                     = "redis"
  engine_version             = "7.x"
  parameter_group_name       = "default.redis7"
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auth_token                 = var.redis_password
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.estim.name
  security_group_ids         = [aws_security_group.redis.id]
}

resource "aws_security_group" "redis" {
  name        = "${var.environment}-redis-sg"
  description = "Security group for Redis"
  vpc_id      = aws_vpc.estim.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "estim" {
  name       = "${var.environment}-elasticache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

# S3 Bucket for MLflow and backups
resource "aws_s3_bucket" "estim_data" {
  bucket = "${var.environment}-estim-data"
  tags = {
    Name        = "${var.environment}-estim-data"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "estim_data" {
  bucket = aws_s3_bucket.estim_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Outputs
output "rds_endpoint" {
  value = aws_db_instance.estim.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.estim.primary_endpoint_address
}

output "s3_bucket" {
  value = aws_s3_bucket.estim_data.bucket
}

output "cluster_endpoint" {
  value = aws_eks_cluster.estim.endpoint
}
  apply_immediately = true
}

resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.estim.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "estim" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster_role.name
}
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  host                   = aws_eks_cluster.estim.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.estim.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.estim.token
  load_config_file       = false
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.estim.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.estim.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.estim.token
    load_config_file       = false
  }
}